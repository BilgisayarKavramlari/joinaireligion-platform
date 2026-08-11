import {
  AgentArtifactStatus,
  AgentRunStatus,
  ContentWorkflowStatus,
  DeliveryStatus,
  FeedbackStatus,
  GenerationStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;
export type AgentLifecycle = "IMPLEMENTED" | "PLANNED";
export type AgentRegistryStatus = "ACTIVE" | "IDLE" | "INACTIVE" | "FAILED" | "BLOCKED";
export type AgentExecutionMode =
  | "LIVE"
  | "SKELETON"
  | "LOG_ONLY"
  | "DRAFT_ONLY"
  | "REPORT_ONLY"
  | "SAFE_REPAIR"
  | "INACTIVE";

type AgentScheduleKind = "daily_utc" | "weekly_utc" | "hourly" | "interval_hours" | "manual";

interface AgentSchedule {
  kind: AgentScheduleKind;
  label: string;
  cron?: string;
  hour?: number;
  minute?: number;
  intervalHours?: number;
  weekday?: number;
}

export interface AutonomousDecisionLogContract {
  version: "2026-05-30";
  requiresRoutineHumanApproval: false;
  requiredFields: string[];
  notes: string[];
}

export interface AgentPolicyBoundary {
  autonomyLevel: AutonomyLevel;
  allowedActions: string[];
  forbiddenActions: string[];
  escalationConditions: string[];
  defaultSafeBoundaries: string[];
  decisionLog: AutonomousDecisionLogContract;
}

export interface AgentGovernanceRole {
  roleName: "EMA" | "FLA";
  title: string;
  responsibility: string;
  autonomyLevel: AutonomyLevel;
  requiresRoutineHumanApproval: false;
  allowedActions: string[];
  hardBoundaries: string[];
}

export interface OwnerOverrideContract {
  version: "2026-08-07";
  source: "explicit-owner-command";
  projectPolicyPrecedence: "highest";
  mayBeInferred: false;
  mustBeScopeBound: true;
  mustBeLogged: true;
  notes: string[];
}

export interface AgentDefinition {
  agentName: string;
  title: string;
  description: string;
  lifecycle: AgentLifecycle;
  mode: AgentExecutionMode;
  schedule: AgentSchedule;
  backlogLabel: string;
  policy: AgentPolicyBoundary;
}

export interface AgentRunSummary {
  id: string;
  taskType: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface AgentRegistrySnapshot {
  agentName: string;
  title: string;
  description: string;
  lifecycle: AgentLifecycle;
  mode: AgentExecutionMode;
  autonomyLevel: AutonomyLevel;
  status: AgentRegistryStatus;
  statusReason: string;
  backlogCount: number | null;
  backlogLabel: string;
  lastRunAt: string | null;
  nextScheduledRunAt: string | null;
  latestAgentRun: AgentRunSummary | null;
  policy: AgentPolicyBoundary;
}

export const DECISION_LOG_CONTRACT: AutonomousDecisionLogContract = {
  version: "2026-05-30",
  requiresRoutineHumanApproval: false,
  requiredFields: [
    "agentName",
    "action",
    "autonomyLevel",
    "allowedByPolicy",
    "policyRule",
    "riskLevel",
    "escalated",
    "inputSummary",
    "outputSummary",
    "occurredAt",
  ],
  notes: [
    "Routine actions inside policy must not require per-action approval.",
    "Escalate only for abnormal, forbidden, risky, or out-of-policy cases.",
    "Persist the decision contract in AgentRun output and related audit trails.",
  ],
};

export const AUTONOMY_LEVELS: Record<AutonomyLevel, { label: string; description: string }> = {
  0: { label: "Observe Only", description: "Read-only monitoring and reporting." },
  1: { label: "Draft Only", description: "Drafts, classification, and internal task creation." },
  2: { label: "Safe Internal Execution", description: "Reversible internal actions inside policy boundaries." },
  3: { label: "Bounded External Execution", description: "Explicitly approved external actions within hard guardrails." },
  4: { label: "Strategic Autonomy", description: "Cross-agent orchestration inside owner-defined caps." },
};

export const OWNER_OVERRIDE_CONTRACT: OwnerOverrideContract = {
  version: "2026-08-07",
  source: "explicit-owner-command",
  projectPolicyPrecedence: "highest",
  mayBeInferred: false,
  mustBeScopeBound: true,
  mustBeLogged: true,
  notes: [
    "A direct owner command overrides project-level agent priorities and policies for the stated target and scope.",
    "FLA records and routes the command; it must never invent, broaden, or silently extend an override.",
    "An owner override does not disclose secrets, bypass platform safety requirements, or authorize unrelated actions.",
  ],
};

export const AGENT_GOVERNANCE_ROLES: AgentGovernanceRole[] = [
  {
    roleName: "EMA",
    title: "EMA — Executive Orchestrator",
    responsibility: "Owns performance outcomes and coordinates all registered agents without routine human approval.",
    autonomyLevel: 4,
    requiresRoutineHumanApproval: false,
    allowedActions: [
      "prioritize, sequence, pause, resume, and retry registered agent work",
      "take initiative to meet owner-defined performance criteria inside configured caps",
      "apply reversible internal repairs and create audited follow-up work",
      "invoke already-enabled external actions through their provider-specific safety gates",
    ],
    hardBoundaries: [
      "obey explicit owner commands routed through FLA",
      "do not expand or rewrite its own authority",
      "do not read, reveal, rotate, or persist secret values",
      "do not perform irreversible deletion, uncapped spending, or unreviewed production schema changes without an explicit scope-bound owner command",
      "do not use private belief or journal data for targeting, public content, or social distribution",
    ],
  },
  {
    roleName: "FLA",
    title: "FLA — Owner Liaison",
    responsibility: "Owns communication from the project owner and converts direct owner commands into scoped, logged instructions for EMA and downstream agents.",
    autonomyLevel: 1,
    requiresRoutineHumanApproval: false,
    allowedActions: [
      "receive and summarize owner commands",
      "record an explicit owner override with its target, scope, and timestamp",
      "route owner priorities and corrections to EMA",
      "ask the owner only when a material ambiguity cannot be resolved safely",
      "return concise operating status and genuine decision requests",
    ],
    hardBoundaries: [
      "do not infer or fabricate an owner command",
      "do not broaden an override beyond the owner's stated scope",
      "do not impersonate the owner in external communication",
      "do not expose secrets or private user content in summaries or logs",
    ],
  },
];

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    agentName: "practice-generator",
    title: "Practice Generator",
    description: "Builds scheduled practice messages for eligible users.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "daily_utc", label: "Daily at 06:00 UTC", cron: "0 6 * * *", hour: 6, minute: 0 },
    backlogLabel: "messages awaiting generation",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["create practice drafts", "write PracticeMessage records", "log AgentRun output"],
      forbiddenActions: ["change autonomy boundaries", "modify billing", "change secrets"],
      escalationConditions: ["generation error rate spikes", "prompt output is empty", "content risk breaches configured thresholds"],
      defaultSafeBoundaries: ["no per-action approvals", "internal writes only", "no secret or billing mutation"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "practice-email-sender",
    title: "Practice Email Sender",
    description: "Processes queued practice deliveries using the configured email mode.",
    lifecycle: "IMPLEMENTED",
    mode: env.EMAIL_SENDING_ENABLED === "true" ? "LIVE" : "LOG_ONLY",
    schedule: { kind: "daily_utc", label: "Daily at 07:00 UTC", cron: "0 7 * * *", hour: 7, minute: 0 },
    backlogLabel: "queued practice emails",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["deliver queued practice emails in configured mode", "log intended emails when live sending is disabled"],
      forbiddenActions: ["enable live email automatically", "change email policy", "contact users outside queued practice delivery"],
      escalationConditions: ["delivery failures spike", "provider returns auth errors", "high bounce or complaint rate"],
      defaultSafeBoundaries: ["respect EMAIL_SENDING_ENABLED", "no policy override", "always write AgentRun output"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "response-scorer",
    title: "Response Scorer",
    description: "Scores incoming practice responses and records XP-related output.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "hourly", label: "Hourly at :30", cron: "30 * * * *", minute: 30 },
    backlogLabel: "unscored responses",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["score responses", "write feedback summaries", "record XP outcomes"],
      forbiddenActions: ["change payout or billing records", "change autonomy rules", "destroy response history"],
      escalationConditions: ["duplicate scoring risk", "score output is empty", "batch failures repeat"],
      defaultSafeBoundaries: ["internal writes only", "no routine owner approvals", "persist scoring logs"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "autonomy-repair",
    title: "Autonomy Repair",
    description: "Applies safe, idempotent repairs for known operational drift.",
    lifecycle: "IMPLEMENTED",
    mode: "SAFE_REPAIR",
    schedule: { kind: "daily_utc", label: "Daily at 07:35 UTC", cron: "35 7 * * *", hour: 7, minute: 35 },
    backlogLabel: "repairable health findings",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["run safe data repairs", "requeue eligible work", "create follow-up logs"],
      forbiddenActions: ["destructive database cleanup", "secret mutation", "unsafe production writes"],
      escalationConditions: ["repair requires schema change", "manual audit is needed", "fix would be irreversible"],
      defaultSafeBoundaries: ["idempotent operations only", "no routine approval", "log each repair action"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "support-triage",
    title: "Support Triage",
    description: "Endpoint and cron script are live; the current skeleton records AgentRuns and OPEN feedback backlog only, with no classification or replies yet.",
    lifecycle: "IMPLEMENTED",
    mode: "SKELETON",
    schedule: { kind: "interval_hours", label: "Every 2 hours", cron: "0 */2 * * *", intervalHours: 2, minute: 0 },
    backlogLabel: "open support tickets",
    policy: {
      autonomyLevel: 1,
      allowedActions: ["count open support backlog", "record AgentRun output", "surface readiness for future classification"],
      forbiddenActions: ["send real support email by default", "promise refunds", "bypass privacy boundaries"],
      escalationConditions: ["classification is requested before implementation", "legal, safety, abuse, refund, or auth issues", "duplicate surge"],
      defaultSafeBoundaries: ["skeleton only", "no classification yet", "no replies", "no routine owner approvals", "log every triage run"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "seo-kulliyat-draft",
    title: "SEO Content Producer",
    description: "Builds separate English, Turkish, Spanish, German, French, Arabic, Russian, and Simplified Chinese variants and sends passing candidates to a separate independent publication gate.",
    lifecycle: "IMPLEMENTED",
    mode: "DRAFT_ONLY",
    schedule: { kind: "daily_utc", label: "Daily at 09:00 UTC", cron: "0 9 * * *", hour: 9, minute: 0 },
    backlogLabel: "draft content backlog",
    policy: {
      autonomyLevel: 1,
      allowedActions: ["research aggregate trends", "draft all eight configured language variants", "organize content queue", "flag risks"],
      forbiddenActions: ["publish content", "cross forbidden doctrinal or legal boundaries", "make unverifiable claims"],
      escalationConditions: ["topic risk threshold exceeded", "forbidden topic detected", "queue freshness breach"],
      defaultSafeBoundaries: ["draft-only", "no routine approval requests", "full decision logging"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "content-publisher",
    title: "Independent Content Publisher",
    description: "Independently rechecks safety, quality, completeness, and duplication before publishing at most one article per UTC day.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "interval_hours", label: "Every 2 hours at :20", cron: "20 */2 * * *", intervalHours: 2, minute: 20 },
    backlogLabel: "content awaiting independent publication",
    policy: {
      autonomyLevel: 3,
      allowedActions: ["independently review draft content", "publish passing site content", "quarantine failing content", "write publication audit records"],
      forbiddenActions: ["publish without two passing gates", "publish more than one content item per UTC day", "delete content", "publish externally to social networks"],
      escalationConditions: ["high-risk claim detected", "locale coverage incomplete", "duplicate topic detected", "publication route unavailable"],
      defaultSafeBoundaries: ["two-agent separation of duties", "daily publication cap", "reversible state changes", "no deletion"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "content-locale-backfill",
    title: "Published Content Locale Backfill",
    description: "Adds independently reviewed Russian and Simplified Chinese variants to already-published content without changing or deleting existing variants.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "hourly", label: "Hourly at :10", cron: "10 * * * *", minute: 10 },
    backlogLabel: "published items missing Russian or Chinese",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["read published English content", "translate into configured missing locales", "run the full multilingual safety gate", "add new published locale variants", "notify IndexNow"],
      forbiddenActions: ["change existing variants", "delete or unpublish content", "introduce new claims", "publish a translation that fails the safety gate"],
      escalationConditions: ["English source missing", "translation schema failure", "risk gate failure", "locale slug collision"],
      defaultSafeBoundaries: ["published source content only", "additive writes only", "Russian and Simplified Chinese only", "audited AgentRun", "no deletion"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "content-performance",
    title: "Content & Acquisition Performance Analyst",
    description: "Aggregates minimized first-party traffic, owned-social engagement and content feedback; publishes the daily admin report and feeds only thresholded signals back into future content and locale selection.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "daily_utc", label: "Daily at 04:30 UTC", cron: "30 4 * * *", hour: 4, minute: 30 },
    backlogLabel: "published content awaiting aggregation",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["aggregate anonymous content and acquisition metrics", "read aggregate counters for owned social posts", "update performance scores", "reversibly unpublish content with strong negative signals", "create and email daily admin performance reports"],
      forbiddenActions: ["store raw IP addresses", "store full referrer URLs or analytics query strings", "profile individual users", "link pseudonymous visitor sessions across days", "delete content", "change publication safety thresholds at runtime"],
      escalationConditions: ["unexpected metric volume", "database growth anomaly", "provider analytics authorization repeatedly fails", "repeated automatic unpublishing"],
      defaultSafeBoundaries: ["aggregate-only learning", "minimum sample thresholds", "daily rotating session hash", "90-day raw analytics retention", "reversible unpublish", "no deletion of content"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "podcast-publisher",
    title: "Reflective Audio Publisher",
    description: "Creates a weekly English audio edition from independently reviewed published content and exposes only completed MP3 episodes in the podcast RSS feed.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "weekly_utc", label: "Sundays at 16:10 UTC", cron: "10 16 * * 0", weekday: 0, hour: 16, minute: 10 },
    backlogLabel: "completed podcast episodes",
    policy: {
      autonomyLevel: 3,
      allowedActions: ["read published English content", "generate disclosed AI narration", "write audio to persistent uploads", "publish standards-based podcast RSS metadata"],
      forbiddenActions: ["narrate unpublished content", "imitate a person", "hide AI voice disclosure", "delete source content or prior episodes"],
      escalationConditions: ["audio generation repeatedly fails", "source content becomes unpublished", "storage write fails", "feed metadata becomes invalid"],
      defaultSafeBoundaries: ["published content only", "one episode per source item", "built-in voice only", "clear AI disclosure", "idempotent publication"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "video-publisher",
    title: "Reflective Video Publisher",
    description: "Creates a validated weekly MP4 edition from a completed podcast artifact and exposes only ready video episodes in Media RSS and the video sitemap.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "weekly_utc", label: "Sundays at 16:30 UTC", cron: "30 16 * * 0", weekday: 0, hour: 16, minute: 30 },
    backlogLabel: "completed video episodes",
    policy: {
      autonomyLevel: 3,
      allowedActions: ["read ready podcast artifacts", "render disclosed video editions", "write MP4 files to persistent uploads", "publish Media RSS and video sitemap metadata"],
      forbiddenActions: ["render unpublished content", "hide AI assistance disclosure", "delete source audio or prior videos", "include private user material"],
      escalationConditions: ["source media validation fails", "video encoding repeatedly fails", "persistent storage is unavailable", "feed metadata becomes invalid"],
      defaultSafeBoundaries: ["reviewed public content only", "one video per podcast artifact", "idempotent rendering", "clear AI disclosure", "no deletion"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "social-listener",
    title: "Public Social Listener",
    description: "Collects public aggregate trend counts and hashtags without retaining raw post text or private messages.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "interval_hours", label: "Every 6 hours at :10", cron: "10 */6 * * *", intervalHours: 6, minute: 10 },
    backlogLabel: "public trend snapshots",
    policy: {
      autonomyLevel: 0,
      allowedActions: ["read approved public search endpoints", "aggregate public result counts", "extract aggregate public hashtags", "create internal trend snapshots"],
      forbiddenActions: ["retain raw post text", "read private messages", "identify or profile users", "reply, follow, like, or publish"],
      escalationConditions: ["provider authorization failure", "unexpected private data", "adversarial content spike"],
      defaultSafeBoundaries: ["public sources only", "aggregate storage only", "no user-level data", "no external mutations"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "social-listener-draft",
    title: "Social Composer",
    description: "Prepares eight locale-specific social drafts from independently reviewed, published site content and packages them for configured providers.",
    lifecycle: "IMPLEMENTED",
    mode: "DRAFT_ONLY",
    schedule: { kind: "daily_utc", label: "Daily at 12:00 UTC", cron: "0 12 * * *", hour: 12, minute: 0 },
    backlogLabel: "social packages awaiting publication",
    policy: {
      autonomyLevel: 1,
      allowedActions: ["read published site content", "draft all eight configured locale variants", "create idempotent publication packages", "flag content risk"],
      forbiddenActions: ["publish or reply publicly", "engage on sensitive topics", "change brand policy"],
      escalationConditions: ["reputation risk spike", "adversarial topic detected", "abnormal mention volume"],
      defaultSafeBoundaries: ["published site content only", "one package per content item per day", "no direct posting", "log each draft decision"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "social-publisher",
    title: "Bounded Social Publisher",
    description: "Publishes approved locale-specific posts to configured verified provider accounts with idempotency and per-provider delivery logs.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "hourly", label: "Hourly at :25", cron: "25 * * * *", minute: 25 },
    backlogLabel: "approved social packages",
    policy: {
      autonomyLevel: 3,
      allowedActions: ["publish approved posts to configured provider accounts", "record provider delivery ids", "retry idempotent provider deliveries", "archive completed packages"],
      forbiddenActions: ["send direct messages", "reply to users", "follow or like accounts", "spend advertising money", "publish unpublished site content"],
      escalationConditions: ["provider rejects authorization", "social copy safety gate fails", "source content becomes unpublished", "unexpected posting volume"],
      defaultSafeBoundaries: ["explicit production switch required", "one verified brand account per provider", "configured providers only", "idempotent provider delivery", "no engagement actions"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "distribution-publisher",
    title: "Bounded Long-form Distributor",
    description: "Publishes an already-public English article to configured owned Blogger or Tumblr accounts with persistent idempotency and fail-closed delivery records.",
    lifecycle: "IMPLEMENTED",
    mode: "LIVE",
    schedule: { kind: "hourly", label: "Hourly at :35", cron: "35 * * * *", minute: 35 },
    backlogLabel: "approved long-form distribution",
    policy: {
      autonomyLevel: 3,
      allowedActions: ["read published public site content", "publish to configured owned Blogger or Tumblr accounts", "record provider delivery ids", "reuse confirmed delivery records"],
      forbiddenActions: ["publish unpublished or private content", "reply or message users", "follow or like accounts", "accept provider terms", "spend money", "retry an ambiguous insert"],
      escalationConditions: ["provider authorization failure", "ambiguous provider response", "delivery record persistence failure", "source content becomes unpublished"],
      defaultSafeBoundaries: ["explicit global and provider switches required", "published English source only", "configured owned accounts only", "persistent idempotency claim", "no engagement actions"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "ads-reporting",
    title: "Ads Reporting",
    description: "Produces aggregate acquisition-readiness reports without campaign access or spend authority.",
    lifecycle: "IMPLEMENTED",
    mode: "REPORT_ONLY",
    schedule: { kind: "daily_utc", label: "Daily at 10:00 UTC", cron: "0 10 * * *", hour: 10, minute: 0 },
    backlogLabel: "ads reporting queue",
    policy: {
      autonomyLevel: 1,
      allowedActions: ["compile ad performance reports", "draft recommendations", "flag anomalies"],
      forbiddenActions: ["spend money", "launch campaigns", "change targeting or budget"],
      escalationConditions: ["financial risk threshold exceeded", "data anomaly detected", "policy boundary breach"],
      defaultSafeBoundaries: ["report-only", "no budget mutation", "log all recommendations"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "cfo-reporting",
    title: "CFO Reporting",
    description: "Prepares read-only finance and operations snapshots without mutating billing or ledger records.",
    lifecycle: "IMPLEMENTED",
    mode: "REPORT_ONLY",
    schedule: { kind: "daily_utc", label: "Daily at 11:00 UTC", cron: "0 11 * * *", hour: 11, minute: 0 },
    backlogLabel: "finance reporting queue",
    policy: {
      autonomyLevel: 1,
      allowedActions: ["compile operating snapshots", "draft recommendations", "surface anomalies"],
      forbiddenActions: ["mutate billing", "move money", "change payout records"],
      escalationConditions: ["financial risk threshold exceeded", "unexpected revenue anomaly", "billing inconsistency"],
      defaultSafeBoundaries: ["report-only", "no routine approval requests", "log every recommendation"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
  {
    agentName: "revenue-orchestrator",
    title: "Revenue Orchestrator",
    description: "Coordinates internal growth reports into ideas and proposed backlog items; external actions and spend remain disabled.",
    lifecycle: "IMPLEMENTED",
    mode: "REPORT_ONLY",
    schedule: { kind: "daily_utc", label: "Daily at 11:30 UTC", cron: "30 11 * * *", hour: 11, minute: 30 },
    backlogLabel: "orchestration opportunities",
    policy: {
      autonomyLevel: 2,
      allowedActions: ["summarize cross-agent opportunities", "create internal follow-up tasks", "recommend sequencing"],
      forbiddenActions: ["override agent policy", "spend money", "publish externally"],
      escalationConditions: ["strategy requires external action", "budget boundary would be crossed", "policy conflict exists"],
      defaultSafeBoundaries: ["internal coordination only", "no routine approval requests", "log orchestration decisions"],
      decisionLog: DECISION_LOG_CONTRACT,
    },
  },
];

type LatestRunRecord = Record<string, AgentRunSummary | null>;
type BacklogRecord = Record<string, number | null>;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function getNextScheduledRun(schedule: AgentSchedule, now: Date): string | null {
  if (schedule.kind === "manual") return null;

  const next = new Date(now);

  if (schedule.kind === "hourly") {
    next.setUTCMinutes(schedule.minute ?? 0, 0, 0);
    if (next <= now) next.setUTCHours(next.getUTCHours() + 1);
    return next.toISOString();
  }

  if (schedule.kind === "interval_hours") {
    const interval = schedule.intervalHours ?? 1;
    next.setUTCMinutes(schedule.minute ?? 0, 0, 0);
    const hoursSinceBlock = next.getUTCHours() % interval;
    next.setUTCHours(next.getUTCHours() - hoursSinceBlock);
    if (next <= now) next.setUTCHours(next.getUTCHours() + interval);
    while (next <= now) next.setUTCHours(next.getUTCHours() + interval);
    return next.toISOString();
  }

  if (schedule.kind === "weekly_utc") {
    next.setUTCHours(schedule.hour ?? 0, schedule.minute ?? 0, 0, 0);
    const daysUntilTarget = ((schedule.weekday ?? 0) - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + daysUntilTarget);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    return next.toISOString();
  }

  next.setUTCHours(schedule.hour ?? 0, schedule.minute ?? 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function isRunFresh(latestRun: AgentRunSummary | null, schedule: AgentSchedule, now: Date): boolean {
  if (!latestRun) return false;

  const startedAt = new Date(latestRun.startedAt).getTime();
  const ageMs = now.getTime() - startedAt;

  switch (schedule.kind) {
    case "hourly":
      return ageMs <= 2 * 60 * 60 * 1000;
    case "interval_hours":
      return ageMs <= ((schedule.intervalHours ?? 1) + 1) * 60 * 60 * 1000;
    case "daily_utc":
      return ageMs <= 36 * 60 * 60 * 1000;
    case "weekly_utc":
      return ageMs <= 8 * 24 * 60 * 60 * 1000;
    case "manual":
      return latestRun.status === AgentRunStatus.SUCCESS;
  }
}

function buildStatus(definition: AgentDefinition, latestRun: AgentRunSummary | null, backlogCount: number | null, now: Date) {
  if (definition.lifecycle === "PLANNED") {
    return {
      status: "INACTIVE" as const,
      statusReason: "Planned only. Execution is not enabled in Phase 1.",
    };
  }

  if (latestRun?.status === AgentRunStatus.FAILED) {
    return {
      status: "FAILED" as const,
      statusReason: latestRun.errorMessage || "Latest AgentRun failed.",
    };
  }

  if (definition.mode === "INACTIVE") {
    return {
      status: "BLOCKED" as const,
      statusReason: "Execution mode is intentionally inactive.",
    };
  }

  if (definition.mode === "SKELETON") {
    if (isRunFresh(latestRun, definition.schedule, now)) {
      return {
        status: "ACTIVE" as const,
        statusReason: backlogCount && backlogCount > 0
          ? "Skeleton endpoint is running and counting open support backlog. Classification and replies remain disabled."
          : "Skeleton endpoint is running. Classification and replies remain disabled.",
      };
    }

    return {
      status: "IDLE" as const,
      statusReason: latestRun
        ? "Skeleton is implemented, but no recent support-triage run is inside the expected schedule window."
        : "Skeleton is implemented with endpoint and cron script, but no AgentRun has been recorded yet.",
    };
  }

  if (isRunFresh(latestRun, definition.schedule, now)) {
    return {
      status: "ACTIVE" as const,
      statusReason: backlogCount && backlogCount > 0 ? "Agent is scheduled and has pending backlog." : "Agent is scheduled and healthy.",
    };
  }

  return {
    status: "IDLE" as const,
    statusReason: latestRun ? "No recent run inside the expected schedule window." : "No AgentRun recorded yet.",
  };
}

async function fetchLatestRuns(): Promise<LatestRunRecord> {
  const runs = await Promise.all(
    AGENT_DEFINITIONS.map(async (definition) => {
      const latestRun = await db.agentRun.findFirst({
        where: { agentName: definition.agentName },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          taskType: true,
          status: true,
          startedAt: true,
          completedAt: true,
          durationMs: true,
          errorMessage: true,
        },
      });

      return [
        definition.agentName,
        latestRun
          ? {
              id: latestRun.id,
              taskType: latestRun.taskType,
              status: latestRun.status,
              startedAt: latestRun.startedAt.toISOString(),
              completedAt: toIso(latestRun.completedAt),
              durationMs: latestRun.durationMs,
              errorMessage: latestRun.errorMessage,
            }
          : null,
      ] as const;
    })
  );

  return Object.fromEntries(runs);
}

async function fetchBacklogs(): Promise<BacklogRecord> {
  const [
    pendingGenerations,
    queuedEmails,
    unscoredResponses,
    openFeedback,
    contentCandidates,
    contentLocaleBacklog,
    publishableDrafts,
    publishedContent,
    podcastEpisodes,
    videoEpisodes,
    socialSnapshots,
    socialDrafts,
    adsReports,
    cfoReports,
    revenueReports,
  ] = await Promise.all([
    db.practiceMessage.count({ where: { generationStatus: GenerationStatus.PENDING } }),
    db.practiceMessage.count({ where: { deliveryStatus: DeliveryStatus.QUEUED } }),
    db.practiceResponse.count({ where: { score: null } }),
    db.feedbackItem.count({ where: { status: FeedbackStatus.OPEN } }),
    db.contentItem.count({ where: { status: { in: [ContentWorkflowStatus.DRAFT, ContentWorkflowStatus.QUARANTINED] } } }),
    db.contentItem.count({
      where: {
        status: ContentWorkflowStatus.PUBLISHED,
        OR: [
          { variants: { none: { locale: "ru" } } },
          { variants: { none: { locale: "zh" } } },
        ],
      },
    }),
    db.contentItem.count({ where: { status: ContentWorkflowStatus.DRAFT } }),
    db.contentItem.count({ where: { status: ContentWorkflowStatus.PUBLISHED } }),
    db.agentArtifact.count({ where: { agentName: "podcast-publisher", artifactType: "PODCAST_EPISODE", status: AgentArtifactStatus.READY } }),
    db.agentArtifact.count({ where: { agentName: "video-publisher", artifactType: "VIDEO_EPISODE", status: AgentArtifactStatus.READY } }),
    db.agentArtifact.count({ where: { agentName: "social-listener", status: AgentArtifactStatus.READY } }),
    db.agentArtifact.count({ where: { agentName: "social-listener-draft", status: AgentArtifactStatus.READY } }),
    db.agentArtifact.count({ where: { agentName: "ads-reporting", status: AgentArtifactStatus.READY } }),
    db.agentArtifact.count({ where: { agentName: "cfo-reporting", status: AgentArtifactStatus.READY } }),
    db.agentArtifact.count({ where: { agentName: "revenue-orchestrator", status: AgentArtifactStatus.READY } }),
  ]);

  return {
    "practice-generator": pendingGenerations,
    "practice-email-sender": queuedEmails,
    "response-scorer": unscoredResponses,
    "autonomy-repair": null,
    "support-triage": openFeedback,
    "seo-kulliyat-draft": contentCandidates,
    "content-locale-backfill": contentLocaleBacklog,
    "content-publisher": publishableDrafts,
    "content-performance": publishedContent,
    "podcast-publisher": podcastEpisodes,
    "video-publisher": videoEpisodes,
    "social-listener": socialSnapshots,
    "social-listener-draft": socialDrafts,
    "social-publisher": socialDrafts,
    "ads-reporting": adsReports,
    "cfo-reporting": cfoReports,
    "revenue-orchestrator": revenueReports,
  };
}

export async function getAgentRegistrySnapshot(): Promise<AgentRegistrySnapshot[]> {
  const now = new Date();
  const [latestRuns, backlogs] = await Promise.all([fetchLatestRuns(), fetchBacklogs()]);

  return AGENT_DEFINITIONS.map((definition) => {
    const latestRun = latestRuns[definition.agentName] ?? null;
    const backlogCount = backlogs[definition.agentName] ?? null;
    const { status, statusReason } = buildStatus(definition, latestRun, backlogCount, now);

    return {
      agentName: definition.agentName,
      title: definition.title,
      description: definition.description,
      lifecycle: definition.lifecycle,
      mode: definition.mode,
      autonomyLevel: definition.policy.autonomyLevel,
      status,
      statusReason,
      backlogCount,
      backlogLabel: definition.backlogLabel,
      lastRunAt: latestRun?.startedAt ?? null,
      nextScheduledRunAt: getNextScheduledRun(definition.schedule, now),
      latestAgentRun: latestRun,
      policy: definition.policy,
    };
  });
}
