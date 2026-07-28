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
import { callOpenAIJsonWithError } from "@/lib/openai/client";
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
  collectPublicSocialSignals,
  getConfiguredSocialProviders,
  publishSocialPost,
  socialIdempotencyKey,
  type SocialProviderName,
} from "@/lib/social/providers";

export const GROWTH_AGENT_NAMES = [
  "seo-kulliyat-draft",
  "content-locale-backfill",
  "content-publisher",
  "content-performance",
  "social-listener",
  "social-listener-draft",
  "social-publisher",
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

const TOPICS = [
  { key: "everyday-meaning", title: "Noticing meaning in everyday moments", category: "reflection", contentType: "guided_reflection" },
  { key: "journaling-perspective", title: "Reflective journaling and the role of perspective", category: "journaling", contentType: "educational_article" },
  { key: "meditation-attention", title: "Meditation as a cross-cultural attention practice", category: "meditation", contentType: "educational_article" },
  { key: "respectful-curiosity", title: "Approaching unfamiliar traditions with respectful curiosity", category: "comparative_culture", contentType: "faq" },
  { key: "values-in-action", title: "Questions for noticing personal values in action", category: "values", contentType: "guided_reflection" },
  { key: "attention-and-choice", title: "How attention shapes everyday choices", category: "reflection", contentType: "educational_article" },
  { key: "journaling-uncertainty", title: "Journaling with uncertainty instead of rushing to answers", category: "journaling", contentType: "guided_reflection" },
  { key: "ritual-and-routine", title: "The difference between reflective ritual and routine", category: "comparative_culture", contentType: "educational_article" },
  { key: "questions-for-values", title: "Five questions for clarifying values without judging beliefs", category: "values", contentType: "faq" },
  { key: "digital-pause", title: "A short digital pause for more deliberate attention", category: "meditation", contentType: "guided_reflection" },
  { key: "symbols-and-meaning", title: "How symbols can support personal reflection", category: "comparative_culture", contentType: "educational_article" },
  { key: "curiosity-before-certainty", title: "Practicing curiosity before certainty", category: "reflection", contentType: "guided_reflection" },
  { key: "journaling-patterns", title: "Using journaling to notice recurring patterns", category: "journaling", contentType: "educational_article" },
  { key: "listening-practice", title: "A reflective listening practice for difficult conversations", category: "values", contentType: "guided_reflection" },
  { key: "technology-and-meaning", title: "Using AI as a prompt for reflection without giving it authority", category: "responsible_ai", contentType: "faq" },
  { key: "cross-cultural-care", title: "Reading cross-cultural practices with context and care", category: "comparative_culture", contentType: "educational_article" },
  { key: "beginner-meditation", title: "A beginner-friendly attention exercise without spiritual claims", category: "meditation", contentType: "guided_reflection" },
  { key: "values-conflict", title: "Reflecting when two personal values seem to conflict", category: "values", contentType: "guided_reflection" },
  { key: "meaningful-questions", title: "What makes a reflective question meaningful", category: "reflection", contentType: "faq" },
  { key: "responsible-ai-reflection", title: "Boundaries for responsible AI-guided reflection", category: "responsible_ai", contentType: "educational_article" },
] as const;

const LOCALE_NAMES: Record<SupportedContentLocale, string> = {
  en: "English",
  tr: "Turkish",
  es: "Spanish",
  de: "German",
  fr: "French",
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
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.SUCCESS,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        output: asInputJson(output),
      },
    });
    return { ok: true, agentName, agentRunId: run.id, output };
  } catch (error) {
    const errorMessage = safeError(error);
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.FAILED,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        errorMessage,
        output: { failed: true },
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
  const candidates = TOPICS.filter((topic) => !publishedTopics.has(topic.title));
  const pool = candidates.length ? candidates : [...TOPICS];
  return [...pool].sort((left, right) => {
    const scoreDifference = (categoryScores.get(right.category) || 0) - (categoryScores.get(left.category) || 0);
    if (scoreDifference !== 0) return scoreDifference;
    const leftIndex = TOPICS.indexOf(left);
    const rightIndex = TOPICS.indexOf(right);
    return ((leftIndex - dayNumber) % TOPICS.length + TOPICS.length) % TOPICS.length - ((rightIndex - dayNumber) % TOPICS.length + TOPICS.length) % TOPICS.length;
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
  const faqBlocks = parseFaqBlocks(record.faqBlocks);
  if (!title || !summary || !bodyMarkdown || !seoTitle || !seoDescription || !faqBlocks) return null;

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
  topic: (typeof TOPICS)[number],
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
  const systemPrompt = `Translate one already-published Join AI Religion article faithfully into ${LOCALE_NAMES[locale]}. Preserve its educational meaning, headings, caution, and factual scope. Do not introduce new claims, spiritual authority, doctrine, therapy, medical, legal, financial, political, or superiority claims. Keep the body substantial and natural in the target language. Return only one JSON object with title, summary, bodyMarkdown, seoTitle, seoDescription, and faqBlocks (at least two translated question/answer objects).`;
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
  const [feedbackCount, queryCount, responseCount, lessonAttemptCount, engagement, socialSnapshot] = await Promise.all([
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
  return executeAgent("content-locale-backfill", "BACKFILL_PUBLISHED_CONTENT_LOCALES", now, async (agentRunId) => {
    const targetLocales = ["ru", "zh"] as const satisfies readonly SupportedContentLocale[];
    const publishedItems = await db.contentItem.findMany({
      where: { status: ContentWorkflowStatus.PUBLISHED },
      orderBy: { publishedAt: "asc" },
      take: 100,
      include: { variants: { orderBy: { locale: "asc" } } },
    });
    const candidate = publishedItems.find((item) => {
      const available = new Set(item.variants.map((variant) => variant.locale));
      return targetLocales.some((locale) => !available.has(locale));
    });
    if (!candidate) return { backfilled: 0, skipped: true, reason: "all_published_content_locales_complete" };

    const source = candidate.variants.find((variant) => variant.locale === "en");
    if (!source) {
      return { backfilled: 0, skipped: true, contentItemId: candidate.id, reason: "english_source_variant_missing" };
    }

    const available = new Set(candidate.variants.map((variant) => variant.locale));
    const missingLocales = targetLocales.filter((locale) => !available.has(locale));
    const dateKey = utcDateKey(candidate.publishedAt || candidate.createdAt);
    const translated = await Promise.all(
      missingLocales.map((locale) => generateTranslatedVariant(locale, source, dateKey))
    );
    const errors = translated.flatMap((result, index) =>
      result.variant ? [] : [`${missingLocales[index]}:${result.error || "translation_failed"}`]
    );
    const newVariants = translated.flatMap((result) => result.variant ? [result.variant] : []);
    if (errors.length > 0 || newVariants.length !== missingLocales.length) {
      return { backfilled: 0, contentItemId: candidate.id, missingLocales, errors: errors.map(safeError) };
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
          publishedAt: candidate.publishedAt || now,
        },
      })),
      db.contentModerationDecision.create({
        data: {
          contentItemId: candidate.id,
          agentRunId,
          outcome: ContentModerationOutcome.PASS,
          riskLevel: "LOW",
          reasons: asInputJson(["published_locale_backfill_passed_independent_gate", ...missingLocales.map((locale) => `locale_added:${locale}`)]),
          qualityScores: asInputJson(gate.localeScores),
        },
      }),
    ]);

    const urls = newVariants.map(
      (variant) => `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`
    );
    let indexNow: { submitted: number; accepted: boolean; status: number | null } | { error: string };
    try {
      indexNow = await submitIndexNowUrls(urls);
    } catch (error) {
      indexNow = { error: safeError(error) };
    }

    return {
      backfilled: newVariants.length,
      contentItemId: candidate.id,
      locales: newVariants.map((variant) => variant.locale),
      qualityScore: gate.qualityScore,
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
    return {
      aggregated: items.length,
      autoUnpublished: autoUnpublished.length,
      autoUnpublishedIds: autoUnpublished,
      artifactId: artifact.id,
      duplicateReport: !artifact.created,
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

export async function runSocialListenerDraft(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("social-listener-draft", "BUILD_SOCIAL_DRAFTS", now, async (agentRunId) => {
    const contentItem = await db.contentItem.findFirst({
      where: { status: ContentWorkflowStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
      include: { variants: { orderBy: { locale: "asc" } } },
    });
    if (!contentItem) {
      return { created: 0, skipped: true, reason: "no_safe_internal_content" };
    }

    const dateKey = utcDateKey(now);
    const fingerprint = sha256Fingerprint(["social-listener-draft", dateKey, contentItem.id]);
    const drafts = contentItem.variants.map((variant) => ({
      locale: variant.locale,
      contentUrl: `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`,
      channels: {
        linkedin: `${variant.title}\n\n${variant.summary}\n\nRead: https://joinaireligion.com/content/${variant.locale}/${variant.slug}\n\n#ReflectiveLearning #ResponsibleAI #MeaningMaking`,
        x: `${variant.title}: ${variant.summary} https://joinaireligion.com/content/${variant.locale}/${variant.slug}`.slice(0, 280),
        mastodon: `${variant.title}\n\n${variant.summary}\n\nhttps://joinaireligion.com/content/${variant.locale}/${variant.slug}\n\n#Reflection #ResponsibleAI`.slice(0, 500),
      },
    }));
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

type SocialDelivery = {
  provider: SocialProviderName;
  status: "PUBLISHED" | "FAILED";
  attemptedAt: string;
  externalId?: string;
  externalUrl?: string | null;
  error?: string;
};

function readSocialDrafts(payload: unknown): Array<{
  locale: string;
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
    if (!locale || !contentUrl.startsWith("https://joinaireligion.com/content/")) return [];
    const linkedin = typeof channels.linkedin === "string" ? channels.linkedin : "";
    const x = typeof channels.x === "string" ? channels.x : "";
    const mastodon = typeof channels.mastodon === "string" ? channels.mastodon : "";
    if (!linkedin || !x || !mastodon) return [];
    return [{ locale, contentUrl, channels: { linkedin, x, mastodon } }];
  });
}

function readSocialDeliveries(payload: unknown): SocialDelivery[] {
  const deliveries = asRecord(payload).deliveries;
  if (!Array.isArray(deliveries)) return [];
  return deliveries.flatMap((delivery) => {
    const record = asRecord(delivery);
    if (!(["mastodon", "x", "linkedin"] as string[]).includes(String(record.provider))) return [];
    if (record.status !== "PUBLISHED" && record.status !== "FAILED") return [];
    return [{
      provider: record.provider as SocialProviderName,
      status: record.status,
      attemptedAt: String(record.attemptedAt || ""),
      externalId: typeof record.externalId === "string" ? record.externalId : undefined,
      externalUrl: typeof record.externalUrl === "string" || record.externalUrl === null ? record.externalUrl : undefined,
      error: typeof record.error === "string" ? record.error : undefined,
    }];
  });
}

export async function runSocialPublisher(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("social-publisher", "PUBLISH_APPROVED_SOCIAL_PACKAGE", now, async () => {
    if (env.SOCIAL_PUBLISHING_ENABLED !== "true") {
      return { published: 0, skipped: true, reason: "social_publishing_disabled" };
    }
    const providers = getConfiguredSocialProviders();
    if (providers.length === 0) return { published: 0, skipped: true, reason: "no_configured_social_provider" };

    const artifact = await db.agentArtifact.findFirst({
      where: {
        agentName: "social-listener-draft",
        artifactType: "SOCIAL_DRAFT_PACKAGE",
        status: AgentArtifactStatus.READY,
      },
      orderBy: { createdAt: "asc" },
    });
    if (!artifact) return { published: 0, skipped: true, reason: "no_ready_social_package" };

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
    const localeIndex = Math.floor(now.getTime() / 86_400_000) % drafts.length;
    const draft = drafts[localeIndex] || drafts[0];
    const previousDeliveries = readSocialDeliveries(artifact.payload);
    let deliveries = [...previousDeliveries];
    const published: SocialDelivery[] = [];

    for (const provider of providers) {
      if (deliveries.some((delivery) => delivery.provider === provider && delivery.status === "PUBLISHED")) continue;
      if (provider !== "mastodon" && deliveries.some((delivery) => delivery.provider === provider && delivery.status === "FAILED")) continue;
      deliveries = deliveries.filter((delivery) => delivery.provider !== provider || delivery.status === "PUBLISHED");
      const text = draft.channels[provider];
      if (containsHighRiskContent(text) || !text.includes(draft.contentUrl)) {
        deliveries.push({ provider, status: "FAILED", attemptedAt: now.toISOString(), error: "social_copy_safety_gate_failed" });
      } else {
        try {
          const result = await publishSocialPost(provider, text, socialIdempotencyKey([artifact.id, provider]));
          const delivery: SocialDelivery = {
            provider,
            status: "PUBLISHED",
            attemptedAt: now.toISOString(),
            externalId: result.externalId,
            externalUrl: result.externalUrl,
          };
          deliveries.push(delivery);
          published.push(delivery);
        } catch (error) {
          deliveries.push({ provider, status: "FAILED", attemptedAt: now.toISOString(), error: safeError(error) });
        }
      }
      await db.agentArtifact.update({
        where: { id: artifact.id },
        data: { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
      });
    }

    const completedProviders = new Set(deliveries.filter((delivery) => delivery.status === "PUBLISHED").map((delivery) => delivery.provider));
    const complete = providers.every((provider) => completedProviders.has(provider));
    await db.agentArtifact.update({
      where: { id: artifact.id },
      data: complete
        ? { status: AgentArtifactStatus.ARCHIVED, archivedAt: now, payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) }
        : { payload: asInputJson({ ...asRecord(artifact.payload), deliveries }) },
    });
    return {
      published: published.length,
      configuredProviders: providers,
      completedProviders: [...completedProviders],
      artifactId: artifact.id,
      complete,
      failures: deliveries.filter((delivery) => delivery.status === "FAILED").map((delivery) => ({ provider: delivery.provider, error: delivery.error })),
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
    case "social-listener":
      return runSocialListener(now);
    case "social-listener-draft":
      return runSocialListenerDraft(now);
    case "social-publisher":
      return runSocialPublisher(now);
    case "ads-reporting":
      return runAdsReporting(now);
    case "cfo-reporting":
      return runCfoReporting(now);
    case "revenue-orchestrator":
      return runRevenueOrchestrator(now);
  }
}
