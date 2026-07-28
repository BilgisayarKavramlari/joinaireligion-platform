import {
  AgentArtifactStatus,
  AgentRunStatus,
  BacklogItemStatus,
  BacklogPriority,
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
  sha256Fingerprint,
  sixHourBucket,
  slugify,
  utcDateKey,
  type LocalizedContentVariant,
  type SupportedContentLocale,
} from "@/lib/growth-agents/content";

export const GROWTH_AGENT_NAMES = [
  "seo-kulliyat-draft",
  "social-listener-draft",
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
] as const;

const LOCALE_NAMES: Record<SupportedContentLocale, string> = {
  en: "English",
  tr: "Turkish",
  es: "Spanish",
  de: "German",
  fr: "French",
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

function selectTopic(now: Date) {
  const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
  return TOPICS[dayNumber % TOPICS.length];
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
    publicationMode: "draft-only",
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

async function collectSafeContentSignals(now: Date) {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [feedbackCount, queryCount, responseCount, lessonAttemptCount] = await Promise.all([
    db.feedbackItem.count({ where: { createdAt: { gte: since } } }),
    db.aiQuery.count({ where: { createdAt: { gte: since } } }),
    db.practiceResponse.count({ where: { createdAt: { gte: since } } }),
    db.lessonAttempt.count({ where: { createdAt: { gte: since } } }),
  ]);

  return [
    { sourceType: "AGGREGATE_FEEDBACK", summary: `${feedbackCount} feedback items in the last 30 days`, count: feedbackCount },
    { sourceType: "AGGREGATE_AI_USAGE", summary: `${queryCount} AI queries in the last 30 days`, count: queryCount },
    { sourceType: "AGGREGATE_PRACTICE", summary: `${responseCount} practice responses in the last 30 days`, count: responseCount },
    { sourceType: "AGGREGATE_LESSONS", summary: `${lessonAttemptCount} lesson attempts in the last 30 days`, count: lessonAttemptCount },
  ];
}

export async function runSeoKulliyatDraft(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("seo-kulliyat-draft", "GENERATE_MULTILINGUAL_CONTENT_DRAFT", now, async (agentRunId) => {
    const dateKey = utcDateKey(now);
    const topic = selectTopic(now);
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
      publicationAttempted: false,
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

export async function runSocialListenerDraft(now = new Date()): Promise<GrowthAgentResult> {
  return executeAgent("social-listener-draft", "BUILD_SOCIAL_DRAFTS", now, async (agentRunId) => {
    const contentItem = await db.contentItem.findFirst({
      where: { status: { in: [ContentWorkflowStatus.DRAFT, ContentWorkflowStatus.READY] } },
      orderBy: { createdAt: "desc" },
      include: { variants: { orderBy: { locale: "asc" } } },
    });
    if (!contentItem) {
      return { created: 0, skipped: true, reason: "no_safe_internal_content" };
    }

    const bucket = sixHourBucket(now);
    const fingerprint = sha256Fingerprint(["social-listener-draft", bucket, contentItem.id]);
    const drafts = contentItem.variants.map((variant) => ({
      locale: variant.locale,
      channels: {
        linkedin: `${variant.title}\n\n${variant.summary}\n\n#ReflectiveLearning #AI #MeaningMaking`,
        x: `${variant.title}: ${variant.summary}`.slice(0, 260),
        instagram: `${variant.summary}\n\nDraft only — fictional educational reflection. #Reflection #Learning`,
      },
    }));
    const artifact = await createArtifact({
      agentRunId,
      agentName: "social-listener-draft",
      artifactType: "SOCIAL_DRAFT_PACKAGE",
      fingerprint,
      title: `Social drafts: ${contentItem.canonicalTopic}`,
      summary: "Draft-only social package derived from approved internal content. No external listening or posting occurred.",
      payload: { publishingEnabled: false, externalListeningEnabled: false, bucket, drafts },
      sourceRefs: { contentItemId: contentItem.id },
      status: AgentArtifactStatus.DRAFT,
      qualityScore: drafts.length === SUPPORTED_CONTENT_LOCALES.length ? 90 : 60,
    });
    return {
      created: artifact.created ? 1 : 0,
      duplicate: !artifact.created,
      artifactId: artifact.id,
      sourceContentItemId: contentItem.id,
      localeCoverage: drafts.length,
      publishingAttempted: false,
      externalListeningAttempted: false,
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
    case "social-listener-draft":
      return runSocialListenerDraft(now);
    case "ads-reporting":
      return runAdsReporting(now);
    case "cfo-reporting":
      return runCfoReporting(now);
    case "revenue-orchestrator":
      return runRevenueOrchestrator(now);
  }
}
