export const dynamic = "force-dynamic";

import { AgentRunStatus, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ensureUnsubscribeToken } from "@/lib/auth";
import { getFromAddress, isSendingEnabled, sendEmail } from "@/lib/cron/email-provider";
import { renderContentPublishedEmail, renderLessonReadyEmail } from "@/lib/notifications/email-renderer";

type DeliveryMode = "DRY_RUN" | "LOG_ONLY" | "LIVE";
type Candidate = {
  userId: string;
  email: string;
  displayName: string;
  locale: string;
  dedupeKey: string;
  template: "lesson-ready" | "content-published";
  render: (unsubscribeToken: string | null) => { subject: string; html: string; text: string };
  metadata: Prisma.InputJsonObject;
};

function parseMode(value: string | null): DeliveryMode {
  if (value === "LIVE" || value === "LOG_ONLY") return value;
  return "DRY_RUN";
}

function isUniqueError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

async function buildCandidates(appUrl: string): Promise<Candidate[]> {
  const [lessons, contentUsers] = await Promise.all([
    db.userLesson.findMany({
      where: {
        status: "PENDING",
        lesson: { isTemplate: false },
        user: { emailVerifiedAt: { not: null }, emailOptIn: true, unsubscribedAt: null },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        lesson: { select: { id: true, title: true } },
        user: { select: { email: true, displayName: true, preferredEmailLocale: true } },
      },
    }),
    db.user.findMany({
      where: {
        emailVerifiedAt: { not: null },
        contentEmailOptIn: true,
        contentEmailOptInAt: { not: null },
        unsubscribedAt: null,
      },
      take: 500,
      select: {
        id: true,
        email: true,
        displayName: true,
        preferredEmailLocale: true,
        contentEmailOptInAt: true,
      },
    }),
  ]);

  const lessonCandidates: Candidate[] = lessons.map((entry) => ({
    userId: entry.userId,
    email: entry.user.email,
    displayName: entry.user.displayName || "Seeker",
    locale: entry.user.preferredEmailLocale || "en",
    dedupeKey: `lesson-ready:${entry.userId}:${entry.id}`,
    template: "lesson-ready",
    render: (unsubscribeToken) => renderLessonReadyEmail({
      locale: entry.user.preferredEmailLocale || "en",
      appUrl,
      unsubscribeToken,
      displayName: entry.user.displayName || "Seeker",
      lessonId: entry.lesson.id,
      lessonTitle: entry.lesson.title,
    }),
    metadata: { userLessonId: entry.id, lessonId: entry.lesson.id },
  }));

  const earliestOptIn = contentUsers.reduce<Date | null>((earliest, user) => {
    if (!user.contentEmailOptInAt) return earliest;
    return !earliest || user.contentEmailOptInAt < earliest ? user.contentEmailOptInAt : earliest;
  }, null);
  const variants = earliestOptIn
    ? await db.contentVariant.findMany({
        where: {
          publishedAt: { gte: earliestOptIn },
          contentItem: { status: "PUBLISHED" },
        },
        orderBy: { publishedAt: "asc" },
        take: 500,
        select: { id: true, locale: true, slug: true, title: true, summary: true, publishedAt: true },
      })
    : [];

  const contentCandidates = contentUsers.flatMap<Candidate>((user) => variants
    .filter((variant) => variant.locale === user.preferredEmailLocale
      && variant.publishedAt
      && user.contentEmailOptInAt
      && variant.publishedAt >= user.contentEmailOptInAt)
    .map((variant) => ({
      userId: user.id,
      email: user.email,
      displayName: user.displayName || "Seeker",
      locale: user.preferredEmailLocale || "en",
      dedupeKey: `content-published:${user.id}:${variant.id}`,
      template: "content-published" as const,
      render: (unsubscribeToken: string | null) => renderContentPublishedEmail({
        locale: variant.locale,
        appUrl,
        unsubscribeToken,
        displayName: user.displayName || "Seeker",
        articleTitle: variant.title,
        articleSummary: variant.summary,
        articleSlug: variant.slug,
      }),
      metadata: { contentVariantId: variant.id, locale: variant.locale },
    })));

  return [...lessonCandidates, ...contentCandidates].slice(0, 200);
}

export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");
  if (!env.CRON_SECRET || authorization !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const requestedMode = parseMode(new URL(request.url).searchParams.get("mode"));
  const mode: DeliveryMode = requestedMode === "LIVE" && !isSendingEnabled() ? "LOG_ONLY" : requestedMode;
  const run = await db.agentRun.create({
    data: {
      agentName: "notification-email-sender",
      taskType: "SEND_LESSON_AND_CONTENT_NOTIFICATIONS",
      status: AgentRunStatus.RUNNING,
      startedAt,
      input: { requestedMode, mode, triggerDate: startedAt.toISOString() },
    },
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const previews: Array<{ template: string; locale: string; subject: string }> = [];

  try {
    const candidates = await buildCandidates(env.NEXT_PUBLIC_APP_URL);
    for (const candidate of candidates) {
      const existing = await db.emailLog.findUnique({ where: { dedupeKey: candidate.dedupeKey } });
      if (existing?.status === "SENT") {
        skipped++;
        continue;
      }

      const unsubscribeToken = await ensureUnsubscribeToken(candidate.userId).catch(() => null);
      const rendered = candidate.render(unsubscribeToken);
      if (mode !== "LIVE") {
        previews.push({ template: candidate.template, locale: candidate.locale, subject: rendered.subject });
        continue;
      }

      if (!existing) {
        try {
          await db.emailLog.create({
            data: {
              userId: candidate.userId,
              template: candidate.template,
              status: "PENDING",
              dedupeKey: candidate.dedupeKey,
              metadata: candidate.metadata,
            },
          });
        } catch (error) {
          if (isUniqueError(error)) {
            skipped++;
            continue;
          }
          throw error;
        }
      } else {
        await db.emailLog.update({
          where: { id: existing.id },
          data: { status: "PENDING", metadata: candidate.metadata },
        });
      }

      const result = await sendEmail({
        to: candidate.email,
        from: getFromAddress(),
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: { template: candidate.template },
      });
      await db.emailLog.update({
        where: { dedupeKey: candidate.dedupeKey },
        data: {
          status: result.ok ? "SENT" : "FAILED",
          providerMsgId: result.ok ? result.providerMsgId : null,
          metadata: result.ok ? candidate.metadata : { ...candidate.metadata, error: result.error },
        },
      });
      if (result.ok) sent++;
      else failed++;
    }

    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: failed > 0 ? AgentRunStatus.FAILED : AgentRunStatus.SUCCESS,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        output: { requestedMode, mode, sent, failed, skipped, previewed: previews.length },
      },
    });
    return Response.json({ ok: true, requestedMode, mode, sent, failed, skipped, previews });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "notification_email_failure";
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        output: { sent, failed, skipped },
      },
    });
    return Response.json({ error: "Notification email run failed" }, { status: 500 });
  }
}
