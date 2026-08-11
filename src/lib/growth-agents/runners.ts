import {
  AgentArtifactStatus,
  AgentRunStatus,
  BacklogItemStatus,
  BacklogPriority,
  ContentModerationOutcome,
  ContentWorkflowStatus,
  DecisionEntityType,
  IdeaSourceType,
  type Prisma,
} from "@prisma/client";

import { db } from "@/lib/db";
import { buildAgentDecisionLog } from "@/lib/agent-decision-log";
import { AGENT_DEFINITIONS } from "@/lib/agents";
import { callOpenAIJsonWithError, createOpenAISpeech } from "@/lib/openai/client";
import { buildPodcastScript } from "@/lib/podcast";
import { generateReflectiveVideo } from "@/lib/video-generator";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  SUPPORTED_CONTENT_LOCALES,
  assessContentVariants,
  buildFallbackVariant,
  containsHighRiskContent,
  sha256Fingerprint,
  sixHourBucket,
  shouldAutoUnpublish,
  slugify,
  utcDateKey,
  type LocalizedContentVariant,
  type SupportedContentLocale,
} from "@/lib/growth-agents/content";
import { env } from "@/lib/env";
import { submitIndexNowUrls } from "@/lib/indexnow";
import {
  SOCIAL_LANGUAGE_POLICY_VERSION,
  SOCIAL_LOCALES,
  collectPublicSocialSignals,
  getConfiguredSocialProviders,
  isSocialPublicationOutcomeAmbiguous,
  publishSocialPost,
  selectProviderLocale,
  shouldSkipSocialProviderForActivation,
  socialProviderActivatedAt,
  socialIdempotencyKey,
  type SocialLocale,
  type SocialProviderName,
} from "@/lib/social/providers";
import { CONTENT_TOPICS, type ContentTopic } from "@/lib/content-topics";
import { getDistributionArticle } from "@/lib/distribution/content";
import { runDistributionPublisher as dispatchDistributionPublisher } from "@/lib/distribution/runner";
import { buildAttributedUrl, selectMeasuredLocale, type TrafficSummary } from "@/lib/analytics/core";
import { deleteExpiredAnalyticsEvents, getTrafficSummary } from "@/lib/analytics/report";
import { collectSocialEngagement, type SocialEngagementMetrics, type SocialEngagementResult } from "@/lib/social/engagement";
import { getFromAddress, isSendingEnabled, sendEmail } from "@/lib/cron/email-provider";

export const GROWTH_AGENT_NAMES = [
  "seo-kulliyat-draft",
  "content-locale-backfill",
  "content-publisher",
  "content-performance",
  "podcast-publisher",
  "video-publisher",
  "social-listener",
  "social-listener-draft",
  "social-publisher",
  "distribution-publisher",
  "ads-reporting",
  "cfo-reporting",
  "revenue-orchestrator",
] as const;

export type GrowthAgentName = (typeof GROWTH_AGENT_NAMES)[number];
type RunOutput = Record<string, unknown>;

type GrowthAgentResult = {
  ok: true;
  agentName: GrowthAgentName;
  agentRunId: string;
  output: RunOutput;
};

const LOCALE_NAMES: Record<SupportedContentLocale, string> = {
  en: "English",
  tr: "Turkish",
  es: "Spanish",
  de: "German",
  fr: "French",
  ar: "Arabic",
  ru: "Russian",
  zh: "Simplified Chinese",
};

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/(?:postgres(?:ql)?|https?):\/\/[^\s]+/gi, "[redacted-url]")
    .replace(/(?:sk|rk|whsec)_[A-Za-z0-9_-]+/g, "[redacted-secret]")
    .slice(0, 500);
}

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function executeAgent(
  agentName: GrowthAgentName,
  taskType: string,
  now: Date,
  work: (agentRunId: string) => Promise<RunOutput>
): Promise<GrowthAgentResult> {
  const definition = AGENT_DEFINITIONS.find((candidate) => candidate.agentName === agentName);
  const run = await db.agentRun.create({
    data: {
      agentName,
      taskType,
      status: AgentRunStatus.RUNNING,
      startedAt: now,
      input: { triggerDate: now.toISOString(), boundaryMode: "internal-only" },
    },
    select: { id: true },
  });

  try {
    const output = await work(run.id);
    const completedAt = new Date();
    const storedOutput = {
      ...output,
      decisionLog: buildAgentDecisionLog({
        agentName,
        action: taskType,
        autonomyLevel: definition?.policy.autonomyLevel ?? 0,
        allowedByPolicy: Boolean(definition),
        policyRule: definition
          ? `registry:${agentName}:${definition.mode}:autonomy-${definition.policy.autonomyLevel}`
          : "agent-not-registered",
        riskLevel: definition ? "LOW" : "HIGH",
        escalated: !definition,
        inputSummary: "Scheduled bounded agent execution with internal identifiers only.",
        outputSummary: `Completed with output fields: ${Object.keys(output).sort().slice(0, 20).join(", ") || "none"}.`,
        occurredAt: completedAt.toISOString(),
      }),
    };
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.SUCCESS,
        completedAt,
        durationMs: Date.now() - now.getTime(),
        output: asInputJson(storedOutput),
      },
    });
    return { ok: true, agentName, agentRunId: run.id, output: storedOutput };
  } catch (error) {
    const errorMessage = safeError(error);
    const completedAt = new Date();
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.FAILED,
        completedAt,
        durationMs: Date.now() - now.getTime(),
        errorMessage,
        output: asInputJson({
          failed: true,
          decisionLog: buildAgentDecisionLog({
            agentName,
            action: taskType,
            autonomyLevel: definition?.policy.autonomyLevel ?? 0,
            allowedByPolicy: Boolean(definition),
            policyRule: definition
              ? `registry:${agentName}:${definition.mode}:autonomy-${definition.policy.autonomyLevel}`
              : "agent-not-registered",
            riskLevel: definition ? "MEDIUM" : "HIGH",
            escalated: !definition,
            inputSummary: "Scheduled bounded agent execution with internal identifiers only.",
            outputSummary: "Execution failed; review the redacted AgentRun error.",
            occurredAt: completedAt.toISOString(),
          }),
        }),
      },
    });
    throw new Error(`${agentName} failed: ${errorMessage}`);
  }
}

async function selectTopic(now: Date) {
  const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
  const published = await db.contentItem.findMany({
    where: { status: ContentWorkflowStatus.PUBLISHED },
    orderBy: { publishedAt: "desc" },
    take: 100,
    select: { canonicalTopic: true, category: true, aggregateMetrics: true },
  });
  const publishedTopics = new Set(published.map((item) => item.canonicalTopic));
  const categoryScores = new Map<string, number>();
  for (const item of published) {
    const metrics = item.aggregateMetrics && typeof item.aggregateMetrics === "object"
      ? item.aggregateMetrics as Record<string, unknown>
      : {};
    const views = Number(metrics.views || 0);
    if (views < 10) continue;
    const score = Number(metrics.engagementScore || 0);
    categoryScores.set(item.category, Math.max(categoryScores.get(item.category) || 0, score));
  }
  const candidates = CONTENT_TOPICS.filter((topic) => !publishedTopics.has(topic.title));
  const pool = candidates.length ? candidates : [...CONTENT_TOPICS];
  return [...pool].sort((left, right) => {
    const scoreDifference = (categoryScores.get(right.category) || 0) - (categoryScores.get(left.category) || 0);
    if (scoreDifference !== 0) return scoreDifference;
    const leftIndex = CONTENT_TOPICS.indexOf(left);
    const rightIndex = CONTENT_TOPICS.indexOf(right);
    return ((leftIndex - dayNumber) % CONTENT_TOPICS.length + CONTENT_TOPICS.length) % CONTENT_TOPICS.length - ((rightIndex - dayNumber) % CONTENT_TOPICS.length + CONTENT_TOPICS.length) % CONTENT_TOPICS.length;
  })[0];
}

function parseFaqBlocks(value: unknown): Array<{ question: string; answer: string }> | null {
  if (!Array.isArray(value)) return null;
  const blocks = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const question = "question" in entry ? String(entry.question || "").trim() : "";
      const answer = "answer" in entry ? String(entry.answer || "").trim() : "";
      return question && answer ? { question, answer } : null;
    })
    .filter((entry): entry is { question: string; answer: string } => Boolean(entry));
  return blocks.length >= 2 ? blocks.slice(0, 4) : null;
}

function parseGeneratedVariant(
  locale: SupportedContentLocale,
  dateKey: string,
  value: unknown
): LocalizedContentVariant | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = String(record.title || "").trim();
  const summary = String(record.summary || "").trim();
  const bodyMarkdown = String(record.bodyMarkdown || "").trim();
  const seoTitle = String(record.seoTitle || "").trim();
  const seoDescription = String(record.seoDescription || "").trim();
  // Some long translations omit the optional FAQ array even when the article
  // body is complete. Use the locale's reviewed safety FAQ instead of
  // discarding an otherwise valid full-length translation.
  const faqBlocks = parseFaqBlocks(record.faqBlocks) ?? buildFallbackVariant(locale).faqBlocks;
  if (!title || !summary || !bodyMarkdown || !seoTitle || !seoDescription) return null;

  return {
    locale,
    title,
    slug: `${slugify(title)}-${dateKey}`,
    summary,
    bodyMarkdown,
    seoTitle,
    seoDescription,
    faqBlocks,
    source: "openai",
  };
}

async function generateLocaleVariant(
  locale: SupportedContentLocale,
  topic: ContentTopic,
  dateKey: string
): Promise<{ variant: LocalizedContentVariant; error: string | null }> {
  const systemPrompt = `You create safe draft content for Join AI Religion, a fictional educational reflective simulation. Write in ${LOCALE_NAMES[locale]}. The platform is not a religion, therapy, medical care, legal advice, or a claim of spiritual superiority. Treat traditions respectfully and avoid unverifiable factual, etymological, doctrinal, health, legal, financial, manipulative, hateful, or superiority claims. Return only one JSON object with title, summary, bodyMarkdown, seoTitle, seoDescription, and faqBlocks (an array of at least two question/answer objects). The body must be 250-350 words, inclusive and educational, and must end with a short fictional-educational disclaimer.`;
  const userPrompt = JSON.stringify({
    topic: topic.title,
    category: topic.category,
    contentType: topic.contentType,
    locale,
    publicationMode: "automatic-after-independent-gate",
  });

  const generated = await callOpenAIJsonWithError(systemPrompt, userPrompt);
  const parsed = parseGeneratedVariant(locale, dateKey, generated.data);
  if (parsed) return { variant: parsed, error: null };

  const fallback = buildFallbackVariant(locale);
  return {
    variant: { ...fallback, slug: `${fallback.slug}-${dateKey}` },
    error: generated.error || "OpenAI output failed schema validation",
  };
}

async function generateTranslatedVariant(
  locale: SupportedContentLocale,
  source: {
    title: string;
    summary: string;
    bodyMarkdown: string;
    seoTitle: string;
    seoDescription: string;
    faqBlocks: unknown;
  },
  dateKey: string
): Promise<{ variant: LocalizedContentVariant | null; error: string | null }> {
  const sourceFaq = parseFaqBlocks(source.faqBlocks) || [];
  const systemPrompt = `Translate one Join AI Religion article faithfully into ${LOCALE_NAMES[locale]}. Preserve its educational meaning, headings, caution, and factual scope. Do not introduce new claims, spiritual authority, doctrine, therapy, medical, legal, financial, political, or superiority claims. Keep the body substantial and natural in the target language. Return only one JSON object with title, summary, bodyMarkdown, seoTitle, seoDescription, and faqBlocks (at least two translated question/answer objects).`;
  const userPrompt = JSON.stringify({
    targetLocale: locale,
    sourceLocale: "en",
    source: {
      title: source.title,
      summary: source.summary,
      bodyMarkdown: source.bodyMarkdown,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      faqBlocks: sourceFaq,
    },
  });

  const generated = await callOpenAIJsonWithError(systemPrompt, userPrompt);
  const parsed = parseGeneratedVariant(locale, dateKey, generated.data);
  return parsed
    ? { variant: parsed, error: null }
    : { variant: null, error: generated.error || `Translation failed schema validation for ${locale}` };
}

async function collectSafeContentSignals(now: Date) {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [feedbackCount, queryCount, responseCount, lessonAttemptCount, engagement, socialSnapshot, growthReport] = await Promise.all([
    db.feedbackItem.count({ where: { createdAt: { gte: since } } }),
    db.aiQuery.count({ where: { createdAt: { gte: since } } }),
    db.practiceResponse.count({ where: { createdAt: { gte: since } } }),
    db.lessonAttempt.count({ where: { createdAt: { gte: since } } }),
    db.contentFeedbackMetric.aggregate({
      where: { recordedAt: { gte: since } },
      _sum: { views: true, likes: true, dislikes: true, dwellSeconds: true, ctaClicks: true },
    }),
    db.agentArtifact.findFirst({
      where: { agentName: "social-listener", artifactType: "SOCIAL_LISTENING_SNAPSHOT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, payload: true },
    }),
    db.agentArtifact.findFirst({
      where: { agentName: "content-performance", artifactType: "DAILY_GROWTH_REPORT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, summary: true },
    }),
  ]);

  return [
    { sourceType: "AGGREGATE_FEEDBACK", summary: `${feedbackCount} feedback items in the last 30 days`, count: feedbackCount },
    { sourceType: "AGGREGATE_AI_USAGE", summary: `${queryCount} AI queries in the last 30 days`, count: queryCount },
    { sourceType: "AGGREGATE_PRACTICE", summary: `${responseCount} practice responses in the last 30 days`, count: responseCount },
    { sourceType: "AGGREGATE_LESSONS", summary: `${lessonAttemptCount} lesson attempts in the last 30 days`, count: lessonAttemptCount },
    {
      sourceType: "AGGREGATE_CONTENT_ENGAGEMENT",
      summary: `${engagement._sum.views || 0} views, ${engagement._sum.likes || 0} likes, ${engagement._sum.ctaClicks || 0} CTA clicks in the last 30 days`,
      count: engagement._sum.views || 0,
    },
    {
      sourceType: "PUBLIC_SOCIAL_TRENDS",
      summary: socialSnapshot ? `Latest aggregate public social snapshot at ${socialSnapshot.createdAt.toISOString()}` : "No public social snapshot yet",
      count: socialSnapshot ? 1 : 0,
      sourceId: socialSnapshot?.id,
    },
    {
      sourceType: "AGGREGATE_ACQUISITION_PERFORMANCE",
      summary: growthReport?.summary || "No aggregate acquisition report yet",
      count: growthReport ? 1 : 0,
      sourceId: growthReport?.id,
    },
  ];
}

export async function runSeoKulliyatDraft(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("seo-kulliyat-draft", "GENERATE_MULTILINGUAL_CONTENT_DRAFT", now, async (agentRunId) => {
    const dateKey = utcDateKey(now);
    const topic = await selectTopic(now);
    const fingerprint = sha256Fingerprint(["seo-kulliyat-draft", dateKey, topic.key]);
    const existing = await db.contentItem.findUnique({ where: { fingerprint }, select: { id: true, status: true } });
    if (existing) {
      return {
        duplicate: true,
        contentItemId: existing.id,
        status: existing.status,
        created: 0,
      };
    }

    const signals = await collectSafeContentSignals(now);
    const generated = await Promise.all(
      SUPPORTED_CONTENT_LOCALES.map((locale) => generateLocaleVariant(locale, topic, dateKey))
    );
    const variants = generated.map((result) => result.variant);
    const generationErrors = generated
      .filter((result) => result.error)
      .map((result) => safeError(result.error as string));
    const gate = assessContentVariants(variants);

    const item = await db.contentItem.create({
      data: {
        fingerprint,
        canonicalTopic: topic.title,
        category: topic.category,
        contentType: topic.contentType,
        difficulty: "introductory",
        status: gate.status,
        sourceSummary: asInputJson({ privacy: "aggregate-only", signals }),
        publishabilityDecision: gate.outcome,
        aggregateMetrics: asInputJson({ qualityScore: gate.qualityScore, localeCoverage: variants.length }),
        agentRunId,
        variants: {
          create: variants.map((variant) => ({
            locale: variant.locale,
            title: variant.title,
            slug: variant.slug,
            summary: variant.summary,
            bodyMarkdown: variant.bodyMarkdown,
            seoTitle: variant.seoTitle,
            seoDescription: variant.seoDescription,
            faqBlocks: asInputJson(variant.faqBlocks),
            qualityScore: gate.localeScores[variant.locale],
          })),
        },
        sourceSignals: {
          create: signals.map((signal) => ({
            sourceType: signal.sourceType,
            sourceId: "sourceId" in signal ? signal.sourceId : undefined,
            summary: signal.summary,
            weight: Math.max(1, signal.count),
            metadata: asInputJson({ count: signal.count, containsRawUserText: false }),
          })),
        },
        moderationDecisions: {
          create: {
            agentRunId,
            outcome: gate.outcome,
            riskLevel: gate.riskLevel,
            reasons: asInputJson(gate.reasons),
            qualityScores: asInputJson(gate.localeScores),
          },
        },
      },
      select: { id: true, status: true },
    });

    return {
      created: 1,
      contentItemId: item.id,
      status: item.status,
      localeCoverage: variants.length,
      qualityScore: gate.qualityScore,
      gateOutcome: gate.outcome,
      aiGeneratedLocales: variants.filter((variant) => variant.source === "openai").length,
      fallbackLocales: variants.filter((variant) => variant.source === "fallback").length,
      generationErrors: generationErrors.slice(0, 5),
      queuedForIndependentPublication: item.status === ContentWorkflowStatus.DRAFT,
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isSupportedLocale(value: string): value is SupportedContentLocale {
  return SUPPORTED_CONTENT_LOCALES.includes(value as SupportedContentLocale);
}

function storedVariantsToGateInput(
  variants: Array<{
    locale: string;
    title: string;
    slug: string;
    summary: string;
    bodyMarkdown: string;
    seoTitle: string;
    seoDescription: string;
    faqBlocks: unknown;
  }>
): LocalizedContentVariant[] {
  return variants.flatMap((variant) => {
    if (!isSupportedLocale(variant.locale)) return [];
    return [{
      locale: variant.locale,
      title: variant.title,
      slug: variant.slug,
      summary: variant.summary,
      bodyMarkdown: variant.bodyMarkdown,
      seoTitle: variant.seoTitle,
      seoDescription: variant.seoDescription,
      faqBlocks: parseFaqBlocks(variant.faqBlocks) || [],
      source: "openai" as const,
    }];
  });
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function runContentPublisher(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("content-publisher", "INDEPENDENT_REVIEW_AND_PUBLISH", now, async (agentRunId) => {
    const publishedToday = await db.contentItem.count({
      where: { status: ContentWorkflowStatus.PUBLISHED, publishedAt: { gte: startOfUtcDay(now) } },
    });
    if (publishedToday > 0) {
      return { published: 0, skipped: true, reason: "daily_publication_limit_reached" };
    }

    const candidate = await db.contentItem.findFirst({
      where: { status: ContentWorkflowStatus.DRAFT },
      orderBy: { createdAt: "asc" },
      include: {
        variants: { orderBy: { locale: "asc" } },
        moderationDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!candidate) return { published: 0, skipped: true, reason: "no_publishable_draft" };

    const variants = storedVariantsToGateInput(candidate.variants);
    const gate = assessContentVariants(variants);
    const producerDecision = candidate.moderationDecisions[0];
    const duplicate = await db.contentItem.findFirst({
      where: {
        canonicalTopic: candidate.canonicalTopic,
        status: ContentWorkflowStatus.PUBLISHED,
        id: { not: candidate.id },
      },
      select: { id: true },
    });
    const independentPass = gate.outcome === ContentModerationOutcome.PASS
      && gate.qualityScore >= 85
      && variants.length === SUPPORTED_CONTENT_LOCALES.length
      && producerDecision?.outcome === ContentModerationOutcome.PASS
      && !duplicate;

    if (!independentPass) {
      const outcome = gate.outcome === ContentModerationOutcome.REJECT
        ? ContentModerationOutcome.REJECT
        : ContentModerationOutcome.QUARANTINE;
      const nextStatus = outcome === ContentModerationOutcome.REJECT
        ? ContentWorkflowStatus.REJECTED
        : ContentWorkflowStatus.QUARANTINED;
      const reasons = [
        ...gate.reasons,
        ...(producerDecision?.outcome === ContentModerationOutcome.PASS ? [] : ["producer_gate_not_passed"]),
        ...(duplicate ? ["duplicate_published_topic"] : []),
        ...(gate.qualityScore >= 85 ? [] : ["independent_quality_below_85"]),
      ];
      await db.$transaction([
        db.contentItem.update({
          where: { id: candidate.id },
          data: { status: nextStatus, publishabilityDecision: outcome },
        }),
        db.contentModerationDecision.create({
          data: {
            contentItemId: candidate.id,
            agentRunId,
            outcome,
            riskLevel: gate.riskLevel,
            reasons: asInputJson(reasons),
            qualityScores: asInputJson(gate.localeScores),
          },
        }),
      ]);
      return { published: 0, contentItemId: candidate.id, status: nextStatus, gateOutcome: outcome, reasons };
    }

    await db.$transaction([
      db.contentItem.update({
        where: { id: candidate.id },
        data: {
          status: ContentWorkflowStatus.PUBLISHED,
          publishedAt: now,
          unpublishedAt: null,
          publishabilityDecision: "PUBLISHED_AUTOMATICALLY_AFTER_INDEPENDENT_GATE",
          aggregateMetrics: asInputJson({
            ...asRecord(candidate.aggregateMetrics),
            qualityScore: gate.qualityScore,
            localeCoverage: variants.length,
          }),
        },
      }),
      db.contentVariant.updateMany({ where: { contentItemId: candidate.id }, data: { publishedAt: now } }),
      db.contentModerationDecision.create({
        data: {
          contentItemId: candidate.id,
          agentRunId,
          outcome: ContentModerationOutcome.PASS,
          riskLevel: "LOW",
          reasons: asInputJson(["independent_publication_gate_passed", "daily_publication_limit_checked"]),
          qualityScores: asInputJson(gate.localeScores),
        },
      }),
    ]);

    const urls = candidate.variants.map(
      (variant) => `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`
    );
    let indexNow: { submitted: number; accepted: boolean; status: number | null } | { error: string };
    try {
      indexNow = await submitIndexNowUrls(urls);
    } catch (error) {
      indexNow = { error: safeError(error) };
    }

    return {
      published: 1,
      contentItemId: candidate.id,
      status: ContentWorkflowStatus.PUBLISHED,
      qualityScore: gate.qualityScore,
      urls,
      indexNow,
    };
  });
}

export async function runContentLocaleBackfill(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("content-locale-backfill", "BACKFILL_REQUIRED_CONTENT_LOCALES", now, async (agentRunId) => {
    const targetLocales = SUPPORTED_CONTENT_LOCALES;
    const incompleteItems = await db.contentItem.findMany({
      where: { status: { in: [ContentWorkflowStatus.READY, ContentWorkflowStatus.PUBLISHED] } },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { variants: { orderBy: { locale: "asc" } } },
    });
    const candidate = incompleteItems.find((item) => {
      const available = new Set(item.variants.map((variant) => variant.locale));
      return available.has("en") && targetLocales.some((locale) => !available.has(locale));
    });
    if (!candidate) return { backfilled: 0, skipped: true, reason: "all_required_content_locales_complete" };

    const source = candidate.variants.find((variant) => variant.locale === "en");
    if (!source) {
      return { backfilled: 0, skipped: true, contentItemId: candidate.id, reason: "english_source_variant_missing" };
    }

    const available = new Set(candidate.variants.map((variant) => variant.locale));
    const missingLocales = targetLocales.filter((locale) => !available.has(locale));
    const dateKey = utcDateKey(candidate.publishedAt || candidate.createdAt);
    // Keep translation concurrency deliberately low. The model provider can
    // throttle a six-language burst, while pairs remain fast and reliable.
    const translated: Awaited<ReturnType<typeof generateTranslatedVariant>>[] = [];
    for (let index = 0; index < missingLocales.length; index += 2) {
      translated.push(...await Promise.all(
        missingLocales.slice(index, index + 2).map((locale) => generateTranslatedVariant(locale, source, dateKey))
      ));
    }
    const errors = translated.flatMap((result, index) =>
      result.variant ? [] : [`${missingLocales[index]}:${result.error || "translation_failed"}`]
    );
    const newVariants = translated.flatMap((result) => result.variant ? [result.variant] : []);
    const remainsPublished = candidate.status === ContentWorkflowStatus.PUBLISHED;
    if (errors.length > 0 || newVariants.length !== missingLocales.length) {
      if (newVariants.length > 0) {
        const partialCombined = [...storedVariantsToGateInput(candidate.variants), ...newVariants];
        const partialGate = assessContentVariants(partialCombined);
        await db.$transaction([
          ...newVariants.map((variant) => db.contentVariant.create({
            data: {
              contentItemId: candidate.id,
              locale: variant.locale,
              title: variant.title,
              slug: variant.slug,
              summary: variant.summary,
              bodyMarkdown: variant.bodyMarkdown,
              seoTitle: variant.seoTitle,
              seoDescription: variant.seoDescription,
              faqBlocks: asInputJson(variant.faqBlocks),
              qualityScore: partialGate.localeScores[variant.locale],
              publishedAt: remainsPublished ? candidate.publishedAt || now : null,
            },
          })),
          db.contentItem.update({
            where: { id: candidate.id },
            data: {
              aggregateMetrics: asInputJson({
                ...asRecord(candidate.aggregateMetrics),
                localeCoverage: partialCombined.length,
                localeRepairPending: true,
              }),
            },
          }),
          db.contentModerationDecision.create({
            data: {
              contentItemId: candidate.id,
              agentRunId,
              outcome: ContentModerationOutcome.QUARANTINE,
              riskLevel: "LOW",
              reasons: asInputJson(["locale_backfill_partial_retry_required", ...errors.map(safeError)]),
              qualityScores: asInputJson(partialGate.localeScores),
            },
          }),
        ]);
      }
      return {
        backfilled: newVariants.length,
        partial: newVariants.length > 0,
        contentItemId: candidate.id,
        missingLocales,
        errors: errors.map(safeError),
      };
    }

    const combined = [
      ...storedVariantsToGateInput(candidate.variants),
      ...newVariants,
    ];
    const gate = assessContentVariants(combined);
    if (gate.outcome !== ContentModerationOutcome.PASS || gate.qualityScore < 85) {
      return {
        backfilled: 0,
        contentItemId: candidate.id,
        missingLocales,
        gateOutcome: gate.outcome,
        qualityScore: gate.qualityScore,
        reasons: gate.reasons,
      };
    }

    await db.$transaction([
      ...newVariants.map((variant) => db.contentVariant.create({
        data: {
          contentItemId: candidate.id,
          locale: variant.locale,
          title: variant.title,
          slug: variant.slug,
          summary: variant.summary,
          bodyMarkdown: variant.bodyMarkdown,
          seoTitle: variant.seoTitle,
          seoDescription: variant.seoDescription,
          faqBlocks: asInputJson(variant.faqBlocks),
          qualityScore: gate.localeScores[variant.locale],
          publishedAt: remainsPublished ? candidate.publishedAt || now : null,
        },
      })),
      db.contentItem.update({
        where: { id: candidate.id },
        data: {
          status: remainsPublished ? ContentWorkflowStatus.PUBLISHED : ContentWorkflowStatus.DRAFT,
          publishabilityDecision: remainsPublished
            ? "PUBLISHED_MULTILINGUAL_COVERAGE_REPAIRED"
            : "MULTILINGUAL_COVERAGE_COMPLETE_AWAITING_PUBLICATION_GATE",
          aggregateMetrics: asInputJson({
            ...asRecord(candidate.aggregateMetrics),
            qualityScore: gate.qualityScore,
            localeCoverage: combined.length,
            localeRepairPending: false,
          }),
        },
      }),
      db.contentModerationDecision.create({
        data: {
          contentItemId: candidate.id,
          agentRunId,
          outcome: ContentModerationOutcome.PASS,
          riskLevel: "LOW",
          reasons: asInputJson(["required_locale_backfill_passed_independent_gate", ...missingLocales.map((locale) => `locale_added:${locale}`)]),
          qualityScores: asInputJson(gate.localeScores),
        },
      }),
    ]);

    const urls = remainsPublished
      ? newVariants.map((variant) => `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`)
      : [];
    let indexNow: { submitted: number; accepted: boolean; status: number | null } | { error: string };
    if (urls.length > 0) {
      try {
        indexNow = await submitIndexNowUrls(urls);
      } catch (error) {
        indexNow = { error: safeError(error) };
      }
    } else {
      indexNow = { submitted: 0, accepted: true, status: null };
    }

    return {
      backfilled: newVariants.length,
      contentItemId: candidate.id,
      locales: newVariants.map((variant) => variant.locale),
      qualityScore: gate.qualityScore,
      status: remainsPublished ? ContentWorkflowStatus.PUBLISHED : ContentWorkflowStatus.DRAFT,
      urls,
      indexNow,
    };
  });
}

async function createArtifact(input: {
  agentRunId: string;
  agentName: GrowthAgentName;
  artifactType: string;
  fingerprint: string;
  title: string;
  summary: string;
  payload: unknown;
  sourceRefs?: unknown;
  status?: AgentArtifactStatus;
  qualityScore?: number;
}) {
  const existing = await db.agentArtifact.findUnique({ where: { fingerprint: input.fingerprint }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };
  const created = await db.agentArtifact.create({
    data: {
      agentRunId: input.agentRunId,
      agentName: input.agentName,
      artifactType: input.artifactType,
      fingerprint: input.fingerprint,
      title: input.title,
      summary: input.summary,
      payload: asInputJson(input.payload),
      sourceRefs: input.sourceRefs === undefined ? undefined : asInputJson(input.sourceRefs),
      status: input.status ?? AgentArtifactStatus.READY,
      qualityScore: input.qualityScore,
      riskLevel: "LOW",
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

export async function runPodcastPublisher(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("podcast-publisher", "PUBLISH_PODCAST_EPISODE", now, async (agentRunId) => {
    const candidate = await db.contentItem.findFirst({
      where: { status: ContentWorkflowStatus.PUBLISHED, variants: { some: { locale: "en", publishedAt: { not: null } } } },
      orderBy: { publishedAt: "desc" },
      include: { variants: { where: { locale: "en", publishedAt: { not: null } }, take: 1 } },
    });
    const variant = candidate?.variants[0];
    if (!candidate || !variant) return { created: 0, reason: "no-published-english-content" };

    const fingerprint = sha256Fingerprint([`podcast:${candidate.id}:en:v1`]);
    const existing = await db.agentArtifact.findUnique({ where: { fingerprint }, select: { id: true } });
    if (existing) return { created: 0, duplicate: true, artifactId: existing.id };

    const script = buildPodcastScript({ title: variant.title, summary: variant.summary, bodyMarkdown: variant.bodyMarkdown });
    const speech = await createOpenAISpeech(script);
    if (!speech.audio || speech.audio.length < 1_000) throw new Error(`Podcast audio generation failed: ${safeError(speech.error || "empty audio")}`);

    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "podcast");
    const fileName = `episode-${candidate.id}.mp3`;
    const finalPath = path.join(uploadDirectory, fileName);
    const temporaryPath = `${finalPath}.tmp`;
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(temporaryPath, speech.audio, { mode: 0o644 });
    await rename(temporaryPath, finalPath);
    const file = await stat(finalPath);
    const audioUrl = `https://joinaireligion.com/uploads/podcast/${fileName}`;
    const articleUrl = `https://joinaireligion.com/content/en/${variant.slug}`;

    const artifact = await createArtifact({
      agentRunId,
      agentName: "podcast-publisher",
      artifactType: "PODCAST_EPISODE",
      fingerprint,
      title: variant.title,
      summary: variant.summary,
      payload: {
        guid: `joinai-podcast-${candidate.id}-en-v1`,
        contentItemId: candidate.id,
        contentVariantId: variant.id,
        articleUrl,
        audioUrl,
        audioBytes: file.size,
        publishedAt: now.toISOString(),
        voiceDisclosure: "AI-generated voice",
        model: speech.model,
        voice: speech.voice,
      },
      sourceRefs: { contentItemId: candidate.id, contentVariantId: variant.id },
      status: AgentArtifactStatus.READY,
      qualityScore: 100,
    });
    return { created: artifact.created ? 1 : 0, artifactId: artifact.id, audioBytes: file.size, articleUrl, audioUrl };
  });
}

export async function runVideoPublisher(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("video-publisher", "PUBLISH_VIDEO_EPISODE", now, async (agentRunId) => {
    const podcasts = await db.agentArtifact.findMany({
      where: { agentName: "podcast-publisher", artifactType: "PODCAST_EPISODE", status: AgentArtifactStatus.READY },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    let source = null as (typeof podcasts)[number] | null;
    let fingerprint = "";
    for (const podcast of podcasts) {
      const candidateFingerprint = sha256Fingerprint([`video:${podcast.id}:v1`]);
      const existing = await db.agentArtifact.findUnique({ where: { fingerprint: candidateFingerprint }, select: { id: true } });
      if (!existing) { source = podcast; fingerprint = candidateFingerprint; break; }
    }
    if (!source) return { created: 0, reason: podcasts.length ? "no-video-backlog" : "no-ready-podcast" };

    const payload = asRecord(source.payload);
    const audioUrl = typeof payload.audioUrl === "string" ? payload.audioUrl : "";
    const articleUrl = typeof payload.articleUrl === "string" ? payload.articleUrl : "";
    if (!audioUrl.startsWith("https://joinaireligion.com/uploads/podcast/") || !articleUrl.startsWith("https://joinaireligion.com/content/en/")) {
      throw new Error("Podcast artifact contains an invalid source URL");
    }
    const outputFileName = `reflection-${source.id}.mp4`;
    const media = await generateReflectiveVideo({ audioFileName: path.basename(new URL(audioUrl).pathname), outputFileName });
    const videoUrl = `https://joinaireligion.com/uploads/video/${outputFileName}`;
    const thumbnailUrl = "https://joinaireligion.com/visuals/reflective-video-cover.jpg";
    const artifact = await createArtifact({
      agentRunId, agentName: "video-publisher", artifactType: "VIDEO_EPISODE", fingerprint,
      title: source.title, summary: source.summary || "A short educational reflection from Join AI Religion.",
      payload: {
        guid: `joinai-video-${source.id}-v1`, articleUrl, audioUrl, videoUrl, thumbnailUrl,
        videoBytes: media.bytes, durationSeconds: media.durationSeconds, width: 1280, height: 720,
        publishedAt: now.toISOString(), disclosure: "AI-assisted visual and AI-generated voice", sourcePodcastArtifactId: source.id,
      },
      sourceRefs: { podcastArtifactId: source.id, contentItemId: payload.contentItemId },
      status: AgentArtifactStatus.READY, qualityScore: 100,
    });
    return { created: artifact.created ? 1 : 0, artifactId: artifact.id, videoBytes: media.bytes, durationSeconds: media.durationSeconds, videoUrl };
  });
}

type SocialMetricRow = {
  provider: SocialProviderName;
  externalId: string;
  externalUrl: string | null;
  locale: string | null;
  publishedAt: string;
  contentItemId: string | null;
  status: "COLLECTED" | "UNAVAILABLE" | "FAILED";
  reason?: string;
  metrics: SocialEngagementMetrics;
  delta: SocialEngagementMetrics;
};

function previousSocialMetrics(payload: unknown): Map<string, SocialEngagementMetrics> {
  const social = asRecord(asRecord(payload).social);
  const items = Array.isArray(social.items) ? social.items : [];
  return new Map(items.flatMap((item) => {
    const row = asRecord(item);
    const provider = typeof row.provider === "string" ? row.provider : "";
    const externalId = typeof row.externalId === "string" ? row.externalId : "";
    const metrics = asRecord(row.metrics);
    if (!provider || !externalId) return [];
    return [[`${provider}|${externalId}`, {
      likes: Number(metrics.likes || 0),
      comments: Number(metrics.comments || 0),
      shares: Number(metrics.shares || 0),
      views: Number(metrics.views || 0),
      clicks: Number(metrics.clicks || 0),
    } satisfies SocialEngagementMetrics] as const];
  }));
}

function subtractMetrics(current: SocialEngagementMetrics, previous: SocialEngagementMetrics | undefined): SocialEngagementMetrics {
  return {
    likes: Math.max(0, current.likes - (previous?.likes || 0)),
    comments: Math.max(0, current.comments - (previous?.comments || 0)),
    shares: Math.max(0, current.shares - (previous?.shares || 0)),
    views: Math.max(0, current.views - (previous?.views || 0)),
    clicks: Math.max(0, current.clicks - (previous?.clicks || 0)),
  };
}

function sumSocialMetrics(rows: SocialMetricRow[], field: "metrics" | "delta"): SocialEngagementMetrics {
  return rows.reduce((total, row) => ({
    likes: total.likes + row[field].likes,
    comments: total.comments + row[field].comments,
    shares: total.shares + row[field].shares,
    views: total.views + row[field].views,
    clicks: total.clicks + row[field].clicks,
  }), { likes: 0, comments: 0, shares: 0, views: 0, clicks: 0 });
}

async function collectOwnedSocialMetrics(now: Date, previousPayload: unknown): Promise<SocialMetricRow[]> {
  const artifacts = await db.agentArtifact.findMany({
    where: {
      agentName: "social-listener-draft",
      artifactType: "SOCIAL_DRAFT_PACKAGE",
      createdAt: { gte: new Date(now.getTime() - 35 * 86_400_000) },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { payload: true, sourceRefs: true },
  });
  const unique = new Map<string, {
    provider: SocialProviderName;
    externalId: string;
    externalUrl: string | null;
    locale: string | null;
    publishedAt: string;
    contentItemId: string | null;
  }>();
  for (const artifact of artifacts) {
    const sourceRefs = asRecord(artifact.sourceRefs);
    for (const delivery of readSocialDeliveries(artifact.payload)) {
      if (delivery.status !== "PUBLISHED" || !delivery.externalId) continue;
      const key = `${delivery.provider}|${delivery.externalId}`;
      if (!unique.has(key)) unique.set(key, {
        provider: delivery.provider,
        externalId: delivery.externalId,
        externalUrl: delivery.externalUrl || null,
        locale: delivery.locale || null,
        publishedAt: delivery.attemptedAt,
        contentItemId: typeof sourceRefs.contentItemId === "string" ? sourceRefs.contentItemId : null,
      });
    }
  }
  const deliveries = [...unique.values()].slice(0, 50);
  const results: SocialEngagementResult[] = [];
  for (let index = 0; index < deliveries.length; index += 4) {
    const batch = deliveries.slice(index, index + 4);
    results.push(...await Promise.all(batch.map((delivery) => collectSocialEngagement(delivery.provider, delivery.externalId))));
  }
  const previous = previousSocialMetrics(previousPayload);
  return deliveries.map((delivery, index) => {
    const result = results[index];
    return {
      ...delivery,
      status: result.status,
      ...(result.reason ? { reason: result.reason } : {}),
      metrics: result.metrics,
      delta: subtractMetrics(result.metrics, previous.get(`${delivery.provider}|${delivery.externalId}`)),
    };
  });
}

function reportRecommendations(traffic: TrafficSummary, socialRows: SocialMetricRow[]): string[] {
  const recommendations: string[] = [];
  if (traffic.sessions < 20) recommendations.push("insufficient_traffic_sample_keep_existing_content_and_language_policy");
  for (const source of ["instagram", "facebook", "threads", "x", "linkedin", "bluesky", "mastodon", "pinterest"] as const) {
    const locale = selectMeasuredLocale(traffic, source, SOCIAL_LOCALES);
    if (locale) recommendations.push(`measured_locale_preference:${source}:${locale}`);
  }
  const strongest = [...socialRows]
    .filter((row) => row.status === "COLLECTED")
    .sort((left, right) => (
      right.delta.likes + right.delta.comments * 2 + right.delta.shares * 3
    ) - (
      left.delta.likes + left.delta.comments * 2 + left.delta.shares * 3
    ))[0];
  if (strongest && strongest.delta.likes + strongest.delta.comments + strongest.delta.shares >= 10) {
    recommendations.push(`reuse_high-performing_format:${strongest.provider}:${strongest.locale || "unknown"}`);
  }
  return recommendations;
}

function adminReportRecipients(): string[] {
  return (env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.endsWith("@example.com"));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character] || character));
}

async function deliverDailyGrowthEmail(
  dateKey: string,
  artifactId: string,
  traffic24h: TrafficSummary,
  traffic30d: TrafficSummary,
  socialTotals: SocialEngagementMetrics,
  socialDelta: SocialEngagementMetrics,
): Promise<{ status: "SENT" | "FAILED" | "LOG_ONLY"; sent: number; failed: number }> {
  const recipients = adminReportRecipients();
  if (!isSendingEnabled() || recipients.length === 0) return { status: "LOG_ONLY", sent: 0, failed: 0 };
  const topSources = traffic24h.topSources.slice(0, 5).map((row) => `${row.label}: ${row.count}`).join(", ") || "no data";
  const text = [
    `Join AI Religion daily growth report — ${dateKey}`,
    `Last 24h: ${traffic24h.sessions} sessions, ${traffic24h.pageViews} page views, ${traffic24h.registrationClicks} registration clicks.`,
    `Top sources: ${topSources}.`,
    `30-day sessions: ${traffic30d.sessions}.`,
    `Owned social totals: ${socialTotals.likes} likes, ${socialTotals.comments} comments, ${socialTotals.shares} shares.`,
    `Since prior snapshot: +${socialDelta.likes} likes, +${socialDelta.comments} comments, +${socialDelta.shares} shares.`,
    `Admin: ${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/admin/growth`,
  ].join("\n");
  const html = `<h1>Daily growth — ${escapeHtml(dateKey)}</h1><p><strong>24h:</strong> ${traffic24h.sessions} sessions · ${traffic24h.pageViews} page views · ${traffic24h.registrationClicks} registration clicks</p><p><strong>Top sources:</strong> ${escapeHtml(topSources)}</p><p><strong>Owned social:</strong> ${socialTotals.likes} likes · ${socialTotals.comments} comments · ${socialTotals.shares} shares</p><p><strong>New since prior snapshot:</strong> +${socialDelta.likes} likes · +${socialDelta.comments} comments · +${socialDelta.shares} shares</p><p><a href="${escapeHtml(env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""))}/admin/growth">Open the admin growth dashboard</a></p>`;
  const results = await Promise.all(recipients.map((to) => sendEmail({
    to,
    from: getFromAddress(),
    subject: `Join AI Religion daily growth — ${dateKey}`,
    text,
    html,
    tags: { type: "daily-growth", artifact: artifactId.slice(0, 24) },
  })));
  const sent = results.filter((result) => result.ok).length;
  return { status: sent === recipients.length ? "SENT" : "FAILED", sent, failed: recipients.length - sent };
}

async function buildDailyGrowthReport(agentRunId: string, now: Date) {
  const dateKey = utcDateKey(now);
  const startToday = startOfUtcDay(now);
  const previous = await db.agentArtifact.findFirst({
    where: {
      agentName: "content-performance",
      artifactType: "DAILY_GROWTH_REPORT",
      createdAt: { lt: startToday },
    },
    orderBy: { createdAt: "desc" },
    select: { payload: true },
  });
  const [traffic24h, traffic30d] = await Promise.all([
    getTrafficSummary(new Date(now.getTime() - 86_400_000), now),
    getTrafficSummary(new Date(now.getTime() - 30 * 86_400_000), now),
  ]);
  const socialRows = await collectOwnedSocialMetrics(now, previous?.payload);
  const socialTotals = sumSocialMetrics(socialRows, "metrics");
  const socialDelta = sumSocialMetrics(socialRows, "delta");
  const recommendations = reportRecommendations(traffic30d, socialRows);
  const analyticsEventsExpired = await deleteExpiredAnalyticsEvents(now, 90);
  const payload = {
    period: { dateKey, generatedAt: now.toISOString() },
    traffic24h,
    traffic30d,
    social: {
      totals: socialTotals,
      delta: socialDelta,
      items: socialRows,
      collected: socialRows.filter((row) => row.status === "COLLECTED").length,
      unavailable: socialRows.filter((row) => row.status === "UNAVAILABLE").length,
      failed: socialRows.filter((row) => row.status === "FAILED").length,
    },
    recommendations,
    feedbackPolicy: { minimumSessions: 20, leaderShare: 0.6, leaderMargin: 1.25, automaticSensitiveTargeting: false },
    privacy: { rawIpStored: false, queryStringStored: false, userAgentStored: false, crossDayVisitorProfile: false, rawEventRetentionDays: 90 },
    containsUserLevelData: false,
  };
  const artifact = await createArtifact({
    agentRunId,
    agentName: "content-performance",
    artifactType: "DAILY_GROWTH_REPORT",
    fingerprint: sha256Fingerprint(["daily-growth-report", dateKey]),
    title: `Daily growth report — ${dateKey}`,
    summary: `${traffic24h.sessions} daily sessions, ${traffic24h.pageViews} page views, ${socialDelta.likes + socialDelta.comments + socialDelta.shares} new measured social interactions.`,
    payload,
    sourceRefs: { sources: ["first-party-analytics", "owned-social-provider-counters"], containsPrivateUserContent: false },
    status: AgentArtifactStatus.READY,
    qualityScore: traffic24h.sampled ? 80 : 100,
  });
  const stored = await db.agentArtifact.findUnique({ where: { id: artifact.id }, select: { payload: true } });
  const priorEmail = asRecord(asRecord(stored?.payload).emailDelivery);
  let dailyEmailStatus = typeof priorEmail.status === "string" ? priorEmail.status : "PENDING";
  if (dailyEmailStatus !== "SENT") {
    const emailDelivery = await deliverDailyGrowthEmail(dateKey, artifact.id, traffic24h, traffic30d, socialTotals, socialDelta);
    dailyEmailStatus = emailDelivery.status;
    await db.agentArtifact.update({
      where: { id: artifact.id },
      data: { payload: asInputJson({ ...asRecord(stored?.payload || payload), emailDelivery: { ...emailDelivery, attemptedAt: now.toISOString() } }) },
    });
  }
  return {
    artifactId: artifact.id,
    trafficSessions24h: traffic24h.sessions,
    socialMetricsCollected: socialRows.filter((row) => row.status === "COLLECTED").length,
    analyticsEventsExpired,
    dailyEmailStatus,
  };
}

export async function runContentPerformance(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("content-performance", "AGGREGATE_CONTENT_PERFORMANCE", now, async (agentRunId) => {
    const items = await db.contentItem.findMany({
      where: { status: ContentWorkflowStatus.PUBLISHED },
      include: { feedbackMetrics: true },
      orderBy: { publishedAt: "desc" },
    });
    const rows: Array<Record<string, unknown>> = [];
    const autoUnpublished: string[] = [];

    for (const item of items) {
      const metrics = item.feedbackMetrics.reduce((total, snapshot) => ({
        views: total.views + snapshot.views,
        uniqueViews: total.uniqueViews + snapshot.uniqueViews,
        likes: total.likes + snapshot.likes,
        dislikes: total.dislikes + snapshot.dislikes,
        dwellSeconds: total.dwellSeconds + snapshot.dwellSeconds,
        ctaClicks: total.ctaClicks + snapshot.ctaClicks,
      }), { views: 0, uniqueViews: 0, likes: 0, dislikes: 0, dwellSeconds: 0, ctaClicks: 0 });
      const engagementScore = Number((
        (metrics.likes * 4 + metrics.ctaClicks * 6 + metrics.dwellSeconds / 30 - metrics.dislikes * 5)
        / Math.max(metrics.views, 1)
      ).toFixed(4));
      const aggregateMetrics = {
        ...asRecord(item.aggregateMetrics),
        ...metrics,
        engagementScore,
        lastAggregatedAt: now.toISOString(),
      };

      if (shouldAutoUnpublish(metrics)) {
        await db.$transaction([
          db.contentItem.update({
            where: { id: item.id },
            data: {
              status: ContentWorkflowStatus.UNPUBLISHED,
              unpublishedAt: now,
              aggregateMetrics: asInputJson(aggregateMetrics),
              publishabilityDecision: "AUTO_UNPUBLISHED_STRONG_NEGATIVE_SIGNAL",
            },
          }),
          db.contentVariant.updateMany({ where: { contentItemId: item.id }, data: { publishedAt: null } }),
          db.contentModerationDecision.create({
            data: {
              contentItemId: item.id,
              agentRunId,
              outcome: ContentModerationOutcome.QUARANTINE,
              riskLevel: "LOW",
              reasons: asInputJson(["strong_negative_engagement_threshold_reached", "reversible_unpublish_no_deletion"]),
              qualityScores: asInputJson({ engagementScore }),
            },
          }),
        ]);
        autoUnpublished.push(item.id);
      } else {
        await db.contentItem.update({ where: { id: item.id }, data: { aggregateMetrics: asInputJson(aggregateMetrics) } });
      }
      rows.push({ contentItemId: item.id, canonicalTopic: item.canonicalTopic, ...metrics, engagementScore });
    }

    const dateKey = utcDateKey(now);
    const artifact = await createArtifact({
      agentRunId,
      agentName: "content-performance",
      artifactType: "CONTENT_PERFORMANCE_REPORT",
      fingerprint: sha256Fingerprint(["content-performance", dateKey]),
      title: `Content performance — ${dateKey}`,
      summary: `${items.length} published content items aggregated; ${autoUnpublished.length} reversibly unpublished.`,
      payload: { period: "all_time", items: rows, autoUnpublished, containsUserLevelData: false },
      status: AgentArtifactStatus.READY,
      qualityScore: 100,
    });
    const growthReport = await buildDailyGrowthReport(agentRunId, now);
    return {
      aggregated: items.length,
      autoUnpublished: autoUnpublished.length,
      autoUnpublishedIds: autoUnpublished,
      artifactId: artifact.id,
      duplicateReport: !artifact.created,
      dailyGrowthReportId: growthReport.artifactId,
      trafficSessions24h: growthReport.trafficSessions24h,
      socialMetricsCollected: growthReport.socialMetricsCollected,
      analyticsEventsExpired: growthReport.analyticsEventsExpired,
      dailyEmailStatus: growthReport.dailyEmailStatus,
    };
  });
}

export async function runSocialListener(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("social-listener", "COLLECT_PUBLIC_SOCIAL_SIGNALS", now, async (agentRunId) => {
    const { signals, errors } = await collectPublicSocialSignals();
    const bucket = sixHourBucket(now);
    const artifact = await createArtifact({
      agentRunId,
      agentName: "social-listener",
      artifactType: "SOCIAL_LISTENING_SNAPSHOT",
      fingerprint: sha256Fingerprint(["social-listener", bucket]),
      title: `Public social listening — ${bucket} UTC`,
      summary: `${signals.reduce((sum, signal) => sum + signal.resultCount, 0)} public results summarized from ${signals.length} query-provider pairs.`,
      payload: {
        bucket,
        signals,
        errors: errors.map((error) => safeError(error)),
        containsRawPostText: false,
        containsPrivateMessages: false,
      },
      status: AgentArtifactStatus.READY,
      qualityScore: errors.length === 0 ? 100 : 80,
    });
    return {
      created: artifact.created ? 1 : 0,
      duplicate: !artifact.created,
      artifactId: artifact.id,
      signalGroups: signals.length,
      resultCount: signals.reduce((sum, signal) => sum + signal.resultCount, 0),
      errors: errors.map((error) => safeError(error)),
    };
  });
}

function buildRequiredUrlSocialCopy(text: string, contentUrl: string, maxCharacters: number, separator: string): string {
  const suffix = `${separator}${contentUrl}`;
  const available = Math.max(0, maxCharacters - Array.from(suffix).length);
  return `${Array.from(text).slice(0, available).join("")}${suffix}`;
}

export async function runSocialListenerDraft(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("social-listener-draft", "BUILD_SOCIAL_DRAFTS", now, async (agentRunId) => {
    const contentItem = await db.contentItem.findFirst({
      where: { status: ContentWorkflowStatus.PUBLISHED },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { variants: { orderBy: { locale: "asc" } } },
    });
    if (!contentItem) {
      return { created: 0, skipped: true, reason: "no_safe_internal_content" };
    }

    const existingPackage = await db.agentArtifact.findFirst({
      where: {
        agentName: "social-listener-draft",
        artifactType: "SOCIAL_DRAFT_PACKAGE",
        sourceRefs: { path: ["contentItemId"], equals: contentItem.id },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    if (existingPackage) {
      return {
        created: 0,
        duplicate: true,
        artifactId: existingPackage.id,
        sourceContentItemId: contentItem.id,
        queuedForPublisher: existingPackage.status === AgentArtifactStatus.READY,
        reason: "content_already_packaged",
      };
    }

    const dateKey = utcDateKey(now);
    const fingerprint = sha256Fingerprint(["social-listener-draft", "v2", contentItem.id]);
    const drafts = contentItem.variants.map((variant) => {
      const contentUrl = `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`;
      const baseCopy = `${variant.title}: ${variant.summary}`;
      const campaign = `organic_reflection_${dateKey}`;
      const urls = Object.fromEntries(
        (["linkedin", "x", "mastodon", "bluesky", "facebook", "instagram", "threads", "pinterest"] as const)
          .map((provider) => [provider, buildAttributedUrl(contentUrl, provider, campaign)]),
      ) as Record<SocialProviderName, string>;
      return {
        locale: variant.locale,
        contentUrl,
        channels: {
          linkedin: `${variant.title}\n\n${variant.summary}\n\nRead: ${urls.linkedin}\n\n#ReflectiveLearning #ResponsibleAI #MeaningMaking`,
          x: buildRequiredUrlSocialCopy(baseCopy, urls.x, 280, " "),
          mastodon: `${variant.title}\n\n${variant.summary}\n\n${urls.mastodon}\n\n#Reflection #ResponsibleAI`.slice(0, 500),
          bluesky: buildRequiredUrlSocialCopy(baseCopy, urls.bluesky, 300, "\n\n"),
          facebook: `${variant.title}\n\n${variant.summary}\n\nRead: ${urls.facebook}`,
          instagram: `${variant.title}\n\n${variant.summary}\n\n${urls.instagram}\n\n#ReflectiveLearning #ResponsibleAI`,
          threads: buildRequiredUrlSocialCopy(baseCopy, urls.threads, 500, "\n\n"),
          pinterest: `${variant.title}\n\n${variant.summary}\n\n${urls.pinterest}`,
        },
      };
    });
    const artifact = await createArtifact({
      agentRunId,
      agentName: "social-listener-draft",
      artifactType: "SOCIAL_DRAFT_PACKAGE",
      fingerprint,
      title: `Social drafts: ${contentItem.canonicalTopic}`,
      summary: "Social publication package derived only from independently reviewed and published site content.",
      payload: { publicationPolicy: "configured-providers-only", dateKey, drafts, deliveries: [] },
      sourceRefs: { contentItemId: contentItem.id },
      status: AgentArtifactStatus.READY,
      qualityScore: drafts.length === SUPPORTED_CONTENT_LOCALES.length ? 90 : 60,
    });
    return {
      created: artifact.created ? 1 : 0,
      duplicate: !artifact.created,
      artifactId: artifact.id,
      sourceContentItemId: contentItem.id,
      localeCoverage: drafts.length,
      queuedForPublisher: true,
    };
  });
}

export type SocialDelivery = {
  provider: SocialProviderName;
  status: "PUBLISHED" | "FAILED" | "SKIPPED" | "AMBIGUOUS";
  attemptedAt: string;
  attemptCount?: number;
  nextRetryAt?: string;
  locale?: SocialLocale;
  languagePolicyVersion?: string;
  externalId?: string;
  externalUrl?: string | null;
  error?: string;
  reason?: string;
  activationAt?: string;
};

export const SOCIAL_PACKAGE_MAX_AGE_MS = 72 * 60 * 60 * 1_000;
export const SOCIAL_MAX_DELIVERY_ATTEMPTS = 3;
const SOCIAL_RETRY_DELAYS_MS = [60 * 60 * 1_000, 6 * 60 * 60 * 1_000] as const;

export function isSocialPackageStale(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() > SOCIAL_PACKAGE_MAX_AGE_MS;
}

export function isSocialDeliveryRetryDue(delivery: SocialDelivery, now: Date): boolean {
  if (delivery.status !== "FAILED") return false;
  if (!delivery.nextRetryAt) return true;
  const retryAt = Date.parse(delivery.nextRetryAt);
  return !Number.isFinite(retryAt) || retryAt <= now.getTime();
}

function nextSocialRetryAt(now: Date, attemptCount: number): string | undefined {
  const delay = SOCIAL_RETRY_DELAYS_MS[attemptCount - 1];
  return delay === undefined ? undefined : new Date(now.getTime() + delay).toISOString();
}

function readSocialDrafts(payload: unknown): Array<{
  locale: SocialLocale;
  contentUrl: string;
  channels: Record<SocialProviderName, string>;
}> {
  const drafts = asRecord(payload).drafts;
  if (!Array.isArray(drafts)) return [];
  return drafts.flatMap((draft) => {
    const record = asRecord(draft);
    const channels = asRecord(record.channels);
    const locale = typeof record.locale === "string" ? record.locale : "";
    const contentUrl = typeof record.contentUrl === "string" ? record.contentUrl : "";
    if (!(SOCIAL_LOCALES as readonly string[]).includes(locale) || !contentUrl.startsWith("https://joinaireligion.com/content/")) return [];
    const linkedin = typeof channels.linkedin === "string" ? channels.linkedin : "";
    const x = typeof channels.x === "string" ? channels.x : "";
    const mastodon = typeof channels.mastodon === "string" ? channels.mastodon : "";
    const bluesky = typeof channels.bluesky === "string"
      ? channels.bluesky
      : (x.includes(contentUrl) ? x : buildRequiredUrlSocialCopy(x, contentUrl, 300, "\n\n"));
    const facebook = typeof channels.facebook === "string"
      ? channels.facebook
      : `${linkedin}\n\n${contentUrl}`;
    const instagram = typeof channels.instagram === "string"
      ? channels.instagram
      : `${mastodon}\n\n${contentUrl}`.slice(0, 2_200);
    const threads = typeof channels.threads === "string"
      ? channels.threads
      : (x.includes(contentUrl) ? x : buildRequiredUrlSocialCopy(x, contentUrl, 500, "\n\n"));
    const pinterest = typeof channels.pinterest === "string"
      ? channels.pinterest
      : `${linkedin}\n\n${contentUrl}`;
    if (!linkedin || !x || !mastodon) return [];
    return [{ locale: locale as SocialLocale, contentUrl, channels: { linkedin, x, mastodon, bluesky, facebook, instagram, threads, pinterest } }];
  });
}

export function readSocialDeliveries(payload: unknown): SocialDelivery[] {
  const deliveries = asRecord(payload).deliveries;
  if (!Array.isArray(deliveries)) return [];
  return deliveries.flatMap((delivery) => {
    const record = asRecord(delivery);
    if (!(["mastodon", "x", "linkedin", "facebook", "instagram", "threads", "pinterest", "bluesky"] as string[]).includes(String(record.provider))) return [];
    if (
      record.status !== "PUBLISHED"
      && record.status !== "FAILED"
      && record.status !== "SKIPPED"
      && record.status !== "AMBIGUOUS"
    ) return [];
    const locale = typeof record.locale === "string" && (SOCIAL_LOCALES as readonly string[]).includes(record.locale)
      ? record.locale as SocialLocale
      : undefined;
    return [{
      provider: record.provider as SocialProviderName,
      status: record.status,
      attemptedAt: String(record.attemptedAt || ""),
      attemptCount: typeof record.attemptCount === "number" && Number.isInteger(record.attemptCount) && record.attemptCount > 0
        ? record.attemptCount
        : undefined,
      nextRetryAt: typeof record.nextRetryAt === "string" ? record.nextRetryAt : undefined,
      locale,
      languagePolicyVersion: typeof record.languagePolicyVersion === "string"
        ? record.languagePolicyVersion
        : undefined,
      externalId: typeof record.externalId === "string" ? record.externalId : undefined,
      externalUrl: typeof record.externalUrl === "string" || record.externalUrl === null ? record.externalUrl : undefined,
      error: typeof record.error === "string" ? record.error : undefined,
      reason: typeof record.reason === "string" ? record.reason : undefined,
      activationAt: typeof record.activationAt === "string" ? record.activationAt : undefined,
    }];
  });
}

export async function runSocialPublisher(
  now = new Date(),
  options: { forceRetryFailedProviders?: boolean } = {},
): Promise<GrowthAgentResult> {
  return executeAgent("social-publisher", "PUBLISH_APPROVED_SOCIAL_PACKAGE", now, async () => {
    if (env.SOCIAL_PUBLISHING_ENABLED !== "true") {
      return { published: 0, skipped: true, reason: "social_publishing_disabled" };
    }
    const providers = getConfiguredSocialProviders();
    if (providers.length === 0) return { published: 0, skipped: true, reason: "no_configured_social_provider" };

    const readyArtifacts = await db.agentArtifact.findMany({
      where: {
        agentName: "social-listener-draft",
        artifactType: "SOCIAL_DRAFT_PACKAGE",
        status: AgentArtifactStatus.READY,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const artifact = readyArtifacts.find((candidate) => !isSocialPackageStale(candidate.createdAt, now));
    const staleArtifacts = readyArtifacts.filter((candidate) => isSocialPackageStale(candidate.createdAt, now));
    const supersededArtifacts = artifact
      ? readyArtifacts.filter((candidate) => candidate.id !== artifact.id && !isSocialPackageStale(candidate.createdAt, now))
      : [];
    for (const archivedArtifact of [...staleArtifacts, ...supersededArtifacts]) {
      await db.agentArtifact.update({
        where: { id: archivedArtifact.id },
        data: {
          status: AgentArtifactStatus.ARCHIVED,
          archivedAt: now,
          payload: asInputJson({
            ...asRecord(archivedArtifact.payload),
            abandonedAt: now.toISOString(),
            abandonedReason: staleArtifacts.some((candidate) => candidate.id === archivedArtifact.id)
              ? "stale_social_package"
              : "superseded_social_package",
          }),
        },
      });
    }
    if (!artifact) {
      return {
        published: 0,
        skipped: true,
        reason: "no_fresh_ready_social_package",
        staleArchived: staleArtifacts.length,
        supersededArchived: supersededArtifacts.length,
      };
    }

    const sourceRefs = asRecord(artifact.sourceRefs);
    const contentItemId = typeof sourceRefs.contentItemId === "string" ? sourceRefs.contentItemId : "";
    const content = contentItemId
      ? await db.contentItem.findFirst({ where: { id: contentItemId, status: ContentWorkflowStatus.PUBLISHED }, select: { id: true } })
      : null;
    if (!content) {
      await db.agentArtifact.update({ where: { id: artifact.id }, data: { status: AgentArtifactStatus.QUARANTINED } });
      return { published: 0, quarantined: true, reason: "source_content_not_published" };
    }

    const drafts = readSocialDrafts(artifact.payload);
    if (drafts.length === 0) {
      await db.agentArtifact.update({ where: { id: artifact.id }, data: { status: AgentArtifactStatus.QUARANTINED } });
      return { published: 0, quarantined: true, reason: "invalid_social_package" };
    }
    const previousDeliveries = readSocialDeliveries(artifact.payload);
    let deliveries = [...previousDeliveries];
    const published: SocialDelivery[] = [];
    const latestGrowthReport = await db.agentArtifact.findFirst({
      where: { agentName: "content-performance", artifactType: "DAILY_GROWTH_REPORT" },
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });
    const measuredTraffic = latestGrowthReport
      ? asRecord(latestGrowthReport.payload).traffic30d as TrafficSummary | undefined
      : undefined;
    const relatedArtifacts = contentItemId
      ? await db.agentArtifact.findMany({
          where: {
            id: { not: artifact.id },
            agentName: "social-listener-draft",
            artifactType: "SOCIAL_DRAFT_PACKAGE",
            sourceRefs: { path: ["contentItemId"], equals: contentItemId },
          },
          select: { payload: true },
          take: 100,
        })
      : [];
    const previouslyPublishedProviders = new Set(
      relatedArtifacts
        .flatMap((candidate) => readSocialDeliveries(candidate.payload))
        .filter((delivery) => delivery.status === "PUBLISHED")
        .map((delivery) => delivery.provider),
    );
    const previouslyAmbiguousProviders = new Set(
      relatedArtifacts
        .flatMap((candidate) => readSocialDeliveries(candidate.payload))
        .filter((delivery) => delivery.status === "AMBIGUOUS")
        .map((delivery) => delivery.provider),
    );

    for (const provider of providers) {
      if (deliveries.some((delivery) => delivery.provider === provider && (
        delivery.status === "PUBLISHED"
        || delivery.status === "SKIPPED"
        || delivery.status === "AMBIGUOUS"
      ))) continue;
      if (previouslyAmbiguousProviders.has(provider)) {
        deliveries = deliveries.filter((delivery) => delivery.provider !== provider);
        deliveries.push({
          provider,
          status: "AMBIGUOUS",
          attemptedAt: now.toISOString(),
          languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
          reason: "ambiguous_delivery_exists",
        });
        await db.agentArtifact.update({
          where: { id: artifact.id },
          data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
        });
        continue;
      }
      if (previouslyPublishedProviders.has(provider)) {
        deliveries = deliveries.filter((delivery) => delivery.provider !== provider);
        deliveries.push({
          provider,
          status: "SKIPPED",
          attemptedAt: now.toISOString(),
          languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
          reason: "content_already_published",
        });
        await db.agentArtifact.update({
          where: { id: artifact.id },
          data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
        });
        continue;
      }
      if (shouldSkipSocialProviderForActivation(provider, artifact.createdAt)) {
        deliveries = deliveries.filter((delivery) => delivery.provider !== provider);
        deliveries.push({
          provider,
          status: "SKIPPED",
          attemptedAt: now.toISOString(),
          languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
          reason: "before_provider_activation",
          activationAt: socialProviderActivatedAt(provider)?.toISOString(),
        });
        await db.agentArtifact.update({
          where: { id: artifact.id },
          data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
        });
        continue;
      }
      const previousFailure = deliveries.find((delivery) => delivery.provider === provider && delivery.status === "FAILED");
      if (previousFailure && !options.forceRetryFailedProviders && !isSocialDeliveryRetryDue(previousFailure, now)) continue;
      if ((previousFailure?.attemptCount ?? (previousFailure ? 1 : 0)) >= SOCIAL_MAX_DELIVERY_ATTEMPTS) {
        deliveries = deliveries.filter((delivery) => delivery.provider !== provider);
        deliveries.push({
          provider,
          status: "SKIPPED",
          attemptedAt: now.toISOString(),
          locale: previousFailure?.locale,
          languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
          attemptCount: previousFailure?.attemptCount ?? SOCIAL_MAX_DELIVERY_ATTEMPTS,
          error: previousFailure?.error,
          reason: "retry_budget_exhausted",
        });
        await db.agentArtifact.update({
          where: { id: artifact.id },
          data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
        });
        continue;
      }
      deliveries = deliveries.filter((delivery) => delivery.provider !== provider || delivery.status === "PUBLISHED");
      const measuredLocale = selectMeasuredLocale(measuredTraffic || null, provider, drafts.map((draft) => draft.locale));
      const selectedLocale = (measuredLocale as SocialLocale | null)
        || selectProviderLocale(provider, artifact.id, drafts.map((draft) => draft.locale));
      const draft = drafts.find((candidate) => candidate.locale === selectedLocale) || drafts[0];
      const text = draft.channels[provider];
      if (containsHighRiskContent(text) || !text.includes(draft.contentUrl)) {
        deliveries.push({
          provider,
          status: "SKIPPED",
          attemptedAt: now.toISOString(),
          locale: draft.locale,
          languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
          reason: "social_copy_safety_gate_failed",
        });
      } else {
        try {
          const result = await publishSocialPost(provider, text, socialIdempotencyKey([artifact.id, provider]));
          const delivery: SocialDelivery = {
            provider,
            status: "PUBLISHED",
            attemptedAt: now.toISOString(),
            locale: draft.locale,
            languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
            externalId: result.externalId,
            externalUrl: result.externalUrl,
          };
          deliveries.push(delivery);
          published.push(delivery);
        } catch (error) {
          if (isSocialPublicationOutcomeAmbiguous(error)) {
            deliveries.push({
              provider,
              status: "AMBIGUOUS",
              attemptedAt: now.toISOString(),
              attemptCount: (previousFailure?.attemptCount ?? (previousFailure ? 1 : 0)) + 1,
              locale: draft.locale,
              languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
              error: safeError(error),
              reason: "manual_reconciliation_required",
            });
            await db.agentArtifact.update({
              where: { id: artifact.id },
              data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
            });
            continue;
          }
          const attemptCount = (previousFailure?.attemptCount ?? (previousFailure ? 1 : 0)) + 1;
          const failedDelivery: SocialDelivery = {
            provider,
            status: attemptCount >= SOCIAL_MAX_DELIVERY_ATTEMPTS ? "SKIPPED" : "FAILED",
            attemptedAt: now.toISOString(),
            attemptCount,
            ...(nextSocialRetryAt(now, attemptCount) ? { nextRetryAt: nextSocialRetryAt(now, attemptCount) } : {}),
            locale: draft.locale,
            languagePolicyVersion: SOCIAL_LANGUAGE_POLICY_VERSION,
            error: safeError(error),
            ...(attemptCount >= SOCIAL_MAX_DELIVERY_ATTEMPTS ? { reason: "retry_budget_exhausted" } : {}),
          };
          deliveries.push(failedDelivery);
        }
      }
      await db.agentArtifact.update({
        where: { id: artifact.id },
        data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
      });
    }

    const completedProviders = new Set(
      deliveries
        .filter((delivery) => (
          delivery.status === "PUBLISHED"
          || delivery.status === "SKIPPED"
          || delivery.status === "AMBIGUOUS"
        ))
        .map((delivery) => delivery.provider),
    );
    const complete = providers.every((provider) => completedProviders.has(provider));
    await db.agentArtifact.update({
      where: { id: artifact.id },
      data: complete
        ? { status: AgentArtifactStatus.ARCHIVED, archivedAt: now, payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) }
        : { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
    });
    return {
      published: published.length,
      staleArchived: staleArtifacts.length,
      supersededArchived: supersededArtifacts.length,
      configuredProviders: providers,
      completedProviders: [...completedProviders],
      artifactId: artifact.id,
      complete,
      skippedProviders: deliveries
        .filter((delivery) => delivery.status === "SKIPPED")
        .map((delivery) => ({ provider: delivery.provider, reason: delivery.reason })),
      ambiguousProviders: deliveries
        .filter((delivery) => delivery.status === "AMBIGUOUS")
        .map((delivery) => ({ provider: delivery.provider, reason: delivery.reason })),
      failures: deliveries.filter((delivery) => delivery.status === "FAILED").map((delivery) => ({ provider: delivery.provider, error: delivery.error })),
    };
  });
}

export async function runLongFormDistributionPublisher(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("distribution-publisher", "PUBLISH_APPROVED_LONG_FORM_DISTRIBUTION", now, async () => {
    const latest = await db.contentVariant.findFirst({
      where: {
        locale: "en",
        publishedAt: { not: null },
        contentItem: { status: ContentWorkflowStatus.PUBLISHED },
      },
      orderBy: { publishedAt: "desc" },
      select: { locale: true, slug: true },
    });
    if (!latest) {
      return { published: 0, skipped: true, reason: "no_published_english_article" };
    }

    const article = await getDistributionArticle(latest.locale, latest.slug);
    if (!article) {
      return { published: 0, skipped: true, reason: "source_article_not_publishable" };
    }

    const result = await dispatchDistributionPublisher({ article, now });
    if (result.configuredProviders.length === 0) {
      return {
        published: 0,
        skipped: true,
        reason: "no_configured_long_form_provider",
        canonicalUrl: article.canonicalUrl,
        configuredProviders: [],
      };
    }

    return {
      canonicalUrl: article.canonicalUrl,
      configuredProviders: result.configuredProviders,
      deliveries: result.deliveries,
      published: result.deliveries.filter((delivery) => delivery.status === "PUBLISHED").length,
      reused: result.deliveries.filter((delivery) => delivery.status === "REUSED").length,
      blocked: result.deliveries.filter((delivery) => delivery.status === "BLOCKED").length,
      ambiguous: result.deliveries.filter((delivery) => delivery.status === "AMBIGUOUS").length,
    };
  });
}

export async function runAdsReporting(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("ads-reporting", "BUILD_ADS_READINESS_REPORT", now, async (agentRunId) => {
    const since = new Date(now.getTime() - 30 * 86_400_000);
    const [users, verifiedUsers, subscriptions, aiQueries, activityEvents] = await Promise.all([
      db.user.count({ where: { role: "USER" } }),
      db.user.count({ where: { role: "USER", emailVerifiedAt: { not: null } } }),
      db.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      db.aiQuery.count({ where: { createdAt: { gte: since } } }),
      db.userActivityLog.count({ where: { createdAt: { gte: since } } }),
    ]);
    const dateKey = utcDateKey(now);
    const fingerprint = sha256Fingerprint(["ads-reporting", dateKey]);
    const readiness = verifiedUsers >= 25 ? "BASELINE_READY" : "INSUFFICIENT_BASELINE";
    const recommendations = [
      "Keep advertising spend at zero; this agent has no spend authority.",
      verifiedUsers >= 25
        ? "Prepare a human-reviewed experiment brief using observed conversion baselines."
        : "Collect an organic baseline from at least 25 verified non-admin users before proposing paid acquisition.",
      "Use only aggregate product metrics; do not export user-level spiritual or onboarding data to advertising platforms.",
    ];
    const artifact = await createArtifact({
      agentRunId,
      agentName: "ads-reporting",
      artifactType: "ADS_READINESS_REPORT",
      fingerprint,
      title: `Ads readiness report — ${dateKey}`,
      summary: `Aggregate-only acquisition readiness: ${readiness}. No campaign or spend change was made.`,
      payload: { periodDays: 30, users, verifiedUsers, subscriptions, aiQueries, activityEvents, readiness, recommendations, spendMutationAllowed: false },
      status: AgentArtifactStatus.READY,
      qualityScore: 100,
    });
    return { created: artifact.created ? 1 : 0, duplicate: !artifact.created, artifactId: artifact.id, readiness, spendChanged: false };
  });
}

export async function runCfoReporting(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("cfo-reporting", "BUILD_CFO_OPERATING_REPORT", now, async (agentRunId) => {
    const since = new Date(now.getTime() - 30 * 86_400_000);
    const [invoiceSummary, subscriptions, stripeEvents, aiTokenUsage, lessonTokenUsage, failedAgentRuns] = await Promise.all([
      db.invoiceRecord.groupBy({ by: ["currency", "status"], _count: { _all: true }, _sum: { amountCents: true } }),
      db.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      db.stripeWebhookEvent.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      db.aiQuery.aggregate({ where: { createdAt: { gte: since } }, _sum: { tokensUsed: true }, _count: { _all: true } }),
      db.lessonAttempt.aggregate({ where: { createdAt: { gte: since } }, _sum: { tokensUsed: true }, _count: { _all: true } }),
      db.agentRun.count({ where: { status: AgentRunStatus.FAILED, createdAt: { gte: since } } }),
    ]);
    const dateKey = utcDateKey(now);
    const fingerprint = sha256Fingerprint(["cfo-reporting", dateKey]);
    const recommendations = [
      "Treat this report as an operational snapshot, not accounting or financial advice.",
      "Investigate failed payment or webhook states before relying on revenue totals.",
      "Keep financial records immutable from this agent; corrections require the bounded billing workflow.",
    ];
    const artifact = await createArtifact({
      agentRunId,
      agentName: "cfo-reporting",
      artifactType: "CFO_OPERATING_REPORT",
      fingerprint,
      title: `CFO operating snapshot — ${dateKey}`,
      summary: "Read-only aggregate financial and operating snapshot. No billing, payout, or ledger record was changed.",
      payload: { periodDays: 30, invoiceSummary, subscriptions, stripeEvents, aiTokenUsage, lessonTokenUsage, failedAgentRuns, recommendations, financialMutationAllowed: false },
      status: AgentArtifactStatus.READY,
      qualityScore: 100,
    });
    return { created: artifact.created ? 1 : 0, duplicate: !artifact.created, artifactId: artifact.id, financialRecordsChanged: false };
  });
}

export async function runRevenueOrchestrator(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("revenue-orchestrator", "BUILD_INTERNAL_GROWTH_RECOMMENDATIONS", now, async (agentRunId) => {
    const since = new Date(now.getTime() - 2 * 86_400_000);
    const [recentReports, contentDrafts, activeSubscriptions, openFeedback] = await Promise.all([
      db.agentArtifact.findMany({
        where: { agentName: { in: ["ads-reporting", "cfo-reporting"] }, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, agentName: true, artifactType: true },
      }),
      db.contentItem.count({ where: { status: ContentWorkflowStatus.DRAFT } }),
      db.subscription.count({ where: { status: "ACTIVE" } }),
      db.feedbackItem.count({ where: { status: "OPEN" } }),
    ]);
    const dateKey = utcDateKey(now);
    const fingerprint = sha256Fingerprint(["revenue-orchestrator", dateKey]);
    const recommendations = [
      {
        key: "content-cadence",
        priority: BacklogPriority.MEDIUM,
        title: "Maintain a measurable multilingual draft cadence",
        summary: `There are ${contentDrafts} safe content drafts. Track review quality and engagement before enabling publication automation.`,
      },
      {
        key: "organic-baseline",
        priority: BacklogPriority.HIGH,
        title: "Establish an organic conversion baseline before ad spend",
        summary: `There are ${activeSubscriptions} active subscriptions. Keep spend disabled until acquisition and conversion metrics are statistically useful.`,
      },
      {
        key: "feedback-loop",
        priority: BacklogPriority.MEDIUM,
        title: "Close the user-feedback learning loop",
        summary: `There are ${openFeedback} open feedback items. Feed aggregate categories into product and content planning without exposing user text.`,
      },
    ];

    const ideaIds: string[] = [];
    for (const recommendation of recommendations) {
      const sourceRef = `${fingerprint}:${recommendation.key}`;
      let idea = await db.ideaRecord.findFirst({ where: { sourceType: IdeaSourceType.GROWTH, sourceRef }, select: { id: true } });
      if (!idea) {
        idea = await db.ideaRecord.create({
          data: {
            sourceType: IdeaSourceType.GROWTH,
            sourceRef,
            title: recommendation.title,
            summary: recommendation.summary,
            reporterType: "revenue-orchestrator",
            rawPayloadJson: asInputJson({ externalActionAllowed: false, sourceReportIds: recentReports.map((report) => report.id) }),
            backlogItems: {
              create: {
                title: recommendation.title,
                summary: recommendation.summary,
                status: BacklogItemStatus.PROPOSED,
                priority: recommendation.priority,
                riskLevel: "LOW",
                ownerAgent: "revenue-orchestrator",
              },
            },
          },
          select: { id: true },
        });
        await db.decisionLog.create({
          data: {
            entityType: DecisionEntityType.IDEA,
            entityId: idea.id,
            decisionMaker: "revenue-orchestrator",
            decisionKind: "CREATE_INTERNAL_RECOMMENDATION",
            decision: "PROPOSED",
            rationaleSummary: "Created from aggregate internal growth and operating signals.",
            rationaleJson: asInputJson({ externalActionAllowed: false, spendAllowed: false }),
            agentRunId,
          },
        });
      }
      ideaIds.push(idea.id);
    }

    const artifact = await createArtifact({
      agentRunId,
      agentName: "revenue-orchestrator",
      artifactType: "REVENUE_RECOMMENDATION_PACKAGE",
      fingerprint,
      title: `Internal growth recommendations — ${dateKey}`,
      summary: "Internal-only recommendations derived from bounded reports. No external action, spend, pricing, or billing mutation occurred.",
      payload: { recommendations, ideaIds, sourceReportIds: recentReports.map((report) => report.id), externalActionAllowed: false, spendAllowed: false },
      sourceRefs: { reportCount: recentReports.length },
      status: AgentArtifactStatus.READY,
      qualityScore: 100,
    });
    return {
      created: artifact.created ? 1 : 0,
      duplicate: !artifact.created,
      artifactId: artifact.id,
      recommendations: recommendations.length,
      internalIdeas: ideaIds.length,
      externalActions: 0,
      spendChanged: false,
      financialRecordsChanged: false,
    };
  });
}

export async function runGrowthAgentByName(
  agentName: GrowthAgentName,
  now = new Date()
): Promise<GrowthAgentResult> {
  switch (agentName) {
    case "seo-kulliyat-draft":
      return runSeoKulliyatDraft(now);
    case "content-locale-backfill":
      return runContentLocaleBackfill(now);
    case "content-publisher":
      return runContentPublisher(now);
    case "content-performance":
      return runContentPerformance(now);
    case "podcast-publisher":
      return runPodcastPublisher(now);
    case "video-publisher":
      return runVideoPublisher(now);
    case "social-listener":
      return runSocialListener(now);
    case "social-listener-draft":
      return runSocialListenerDraft(now);
    case "social-publisher":
      return runSocialPublisher(now);
    case "distribution-publisher":
      return runLongFormDistributionPublisher(now);
    case "ads-reporting":
      return runAdsReporting(now);
    case "cfo-reporting":
      return runCfoReporting(now);
    case "revenue-orchestrator":
      return runRevenueOrchestrator(now);
  }
}
