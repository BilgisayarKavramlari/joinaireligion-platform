/**
 * POST /api/cron/send-practice-emails
 *
 * Delivers generated PracticeMessage records to users via email.
 *
 * Authentication: Bearer token in Authorization header must match CRON_SECRET.
 *
 * Modes (pass as ?mode= query param):
 *   DRY_RUN  (default) — selects eligible messages, renders emails, returns a
 *            preview payload.  No database mutations.  Safe to call at any time.
 *   LOG_ONLY — renders previews but does not call an external provider or mark
 *            messages delivered. This keeps them safely queued for LIVE mode.
 *   LIVE     — calls the configured email provider and records the result.
 *            Only activates when isSendingEnabled() returns true
 *            (EMAIL_SENDING_ENABLED=true + RESEND_API_KEY + EMAIL_FROM set).
 *            If isSendingEnabled() is false, falls back to LOG_ONLY silently.
 *
 * Idempotency:
 *   Only messages with deliveryStatus=QUEUED and sentAt=null are selected.
 *   Once a message is marked SENT/FAILED, it is excluded from future runs.
 *   DRY_RUN never mutates state, so it is always safe to re-run.
 *
 * Duplicate protection:
 *   The compound unique index @@unique([userId, cadence, scheduledDate]) on
 *   PracticeMessage prevents two messages for the same period.  The SENT/FAILED
 *   status filter prevents re-sending an already-processed message.
 */

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  AgentRunStatus,
  DeliveryStatus,
  GenerationStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { renderEmail } from "@/lib/cron/email-renderer";
import { ensureUnsubscribeToken } from "@/lib/auth";
import { isSendingEnabled, sendEmail, getFromAddress } from "@/lib/cron/email-provider";

// ─── Delivery mode ─────────────────────────────────────────────────────────────

type DeliveryMode = "DRY_RUN" | "LOG_ONLY" | "LIVE";

function parseMode(raw: string | null): DeliveryMode {
  if (raw === "LOG_ONLY") return "LOG_ONLY";
  if (raw === "LIVE") return "LIVE";
  return "DRY_RUN"; // safe default
}

// ─── Prisma select ─────────────────────────────────────────────────────────────

const messageSelect = {
  id: true,
  userId: true,
  cadence: true,
  scheduledDate: true,
  subject: true,
  bodyHtml: true,
  bodyText: true,
  xpReward: true,
  agentRunId: true,
  user: {
    select: {
      email: true,
      displayName: true,
      preferredEmailLocale: true,
      emailOptIn: true,
      unsubscribedAt: true,
      unsubscribeToken: true,
    },
  },
} satisfies Prisma.PracticeMessageSelect;

type QueuedMessage = Prisma.PracticeMessageGetPayload<{
  select: typeof messageSelect;
}>;

// ─── Preview type ──────────────────────────────────────────────────────────────

type MessagePreview = {
  messageId: string;
  userId: string;
  to: string;
  subject: string;
  htmlLength: number;
  textLength: number;
};

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (
    !env.CRON_SECRET ||
    !authHeader ||
    authHeader !== `Bearer ${env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawMode = url.searchParams.get("mode");
  let mode = parseMode(rawMode);

  const now = new Date();

  // ── 2. Open AgentRun record ──────────────────────────────────────────────────
  const agentRun = await db.agentRun.create({
    data: {
      agentName: "practice-email-sender",
      taskType: "SEND_PRACTICE_EMAILS",
      status: AgentRunStatus.RUNNING,
      startedAt: now,
      input: { mode, triggerDate: now.toISOString() },
    },
  });

  // ── 3. Select QUEUED messages ────────────────────────────────────────────────
  let messages: QueuedMessage[];
  try {
    messages = await db.practiceMessage.findMany({
      where: {
        deliveryStatus: DeliveryStatus.QUEUED,
        generationStatus: GenerationStatus.GENERATED,
        sentAt: null,
      },
      select: messageSelect,
      orderBy: { scheduledDate: "asc" },
    });
  } catch (fetchError) {
    const msg =
      fetchError instanceof Error ? fetchError.message : String(fetchError);
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.FAILED,
        errorMessage: `Message fetch failed: ${msg}`,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        output: { queued: 0, sent: 0, failed: 0, skipped: 0, errors: 1 },
      },
    });
    return Response.json(
      { error: "Failed to fetch queued messages", detail: msg },
      { status: 500 }
    );
  }

  // ── 4. If LIVE but sending not configured → downgrade to LOG_ONLY ────────────
  const sendingActive = mode === "LIVE" && isSendingEnabled();
  if (mode === "LIVE" && !isSendingEnabled()) {
    mode = "LOG_ONLY";
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const fromAddress = getFromAddress();

  // ── 5. Process each message ──────────────────────────────────────────────────
  const previews: MessagePreview[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const msg of messages) {
    if (!msg.user.emailOptIn || msg.user.unsubscribedAt) {
      skippedCount++;
      if (mode !== "DRY_RUN") {
        await db.practiceMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: DeliveryStatus.SKIPPED },
        });
        await db.emailLog.create({
          data: {
            userId: msg.userId,
            template: "practice-message",
            status: "SKIPPED",
            metadata: { reason: "email_preference_disabled", messageId: msg.id, mode },
          },
        });
      }
      continue;
    }

    // Skip messages with missing content (should not happen in production)
    if (!msg.subject || !msg.bodyHtml || !msg.bodyText) {
      skippedCount++;
      if (mode !== "DRY_RUN") {
        await db.practiceMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: DeliveryStatus.SKIPPED },
        });
        await db.emailLog.create({
          data: {
            userId: msg.userId,
            template: "practice-message",
            status: "SKIPPED",
            metadata: {
              reason: "missing_content",
              messageId: msg.id,
              mode,
            },
          },
        });
      }
      continue;
    }

    // Render the final email. Store only a hash at rest; use the raw token only for this outgoing message.
    const unsubscribeToken = await ensureUnsubscribeToken(msg.userId).catch(() => null);
    const rendered = renderEmail({
      messageId: msg.id,
      subject: msg.subject,
      bodyHtml: msg.bodyHtml,
      bodyText: msg.bodyText,
      displayName: msg.user.displayName ?? "Seeker",
      locale: msg.user.preferredEmailLocale ?? "en",
      unsubscribeToken,
      appUrl,
    });

    // ── DRY_RUN: collect preview, no mutations ─────────────────────────────────
    if (mode === "DRY_RUN") {
      previews.push({
        messageId: msg.id,
        userId: msg.userId,
        to: msg.user.email,
        subject: rendered.subject,
        htmlLength: rendered.html.length,
        textLength: rendered.text.length,
      });
      continue;
    }

    // LOG_ONLY is diagnostic: keep the message queued so enabling LIVE later
    // cannot silently lose a notification that was never actually delivered.
    if (mode === "LOG_ONLY") {
      previews.push({
        messageId: msg.id,
        userId: msg.userId,
        to: msg.user.email,
        subject: rendered.subject,
        htmlLength: rendered.html.length,
        textLength: rendered.text.length,
      });
      continue;
    }

    // ── LIVE ──────────────────────────────────────────────────────────────────
    let providerMsgId: string | null = null;
    let sendError: string | null = null;

    if (sendingActive) {
      const result = await sendEmail({
        to: msg.user.email,
        from: fromAddress,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: { messageId: msg.id, userId: msg.userId },
      });
      if (result.ok) {
        providerMsgId = result.providerMsgId;
      } else {
        sendError = result.error;
      }
    }

    const deliveryStatus = sendError ? DeliveryStatus.FAILED : DeliveryStatus.SENT;

    // Update PracticeMessage status
    await db.practiceMessage.update({
      where: { id: msg.id },
      data: {
        deliveryStatus,
        sentAt: deliveryStatus === DeliveryStatus.SENT ? new Date() : undefined,
      },
    });

    // Write EmailLog record
    await db.emailLog.create({
      data: {
        userId: msg.userId,
        template: "practice-message",
        status: deliveryStatus,
        providerMsgId: providerMsgId ?? undefined,
        metadata: {
          messageId: msg.id,
          mode,
          ...(sendError ? { error: sendError } : {}),
        },
      },
    });

    if (deliveryStatus === DeliveryStatus.SENT) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  // ── 6. Close AgentRun ────────────────────────────────────────────────────────
  const hasErrors = failedCount > 0;
  await db.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: hasErrors ? AgentRunStatus.FAILED : AgentRunStatus.SUCCESS,
      completedAt: new Date(),
      durationMs: Date.now() - now.getTime(),
      output: {
        mode,
        queued: messages.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        dryRunPreviews: mode === "DRY_RUN" ? previews.length : 0,
      },
    },
  });

  // ── 7. Respond ───────────────────────────────────────────────────────────────
  return Response.json({
    ok: true,
    agentRunId: agentRun.id,
    mode,
    queued: messages.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    ...(mode !== "LIVE" ? { previews } : {}),
  });
}
