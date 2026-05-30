/**
 * practice-builder.ts
 *
 * Builds deterministic placeholder practice content from user context.
 * No OpenAI calls — all output is generated from template pools.
 * When OpenAI is integrated, replace buildPlaceholderContent() with a call
 * to the AI service; the types and buildUserContext() stay unchanged.
 */

import { MessageCadence, SubscriptionStatus } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of the user record fetched by the cron route. */
export type UserForPracticeGen = {
  id: string;
  displayName: string | null;
  currentLevel: number;
  xpTotal: number;
  subscription: { status: SubscriptionStatus } | null;
  profile: {
    tradition: string | null;
    intent: string | null;
    bio: string | null;
    timezone: string | null;
  } | null;
  onboarding: { questionKey: string; answer: string }[];
  journeyLevels: { level: number; label: string }[];
  practiceResponses: { responseText: string; score: number | null }[];
  dialogues: { userPrompt: string }[];
};

/** Normalised context passed to the content-generation step. */
export type PracticeContext = {
  userId: string;
  displayName: string;
  level: number;
  tradition: string | null;
  intent: string | null;
  cadence: MessageCadence;
  scheduledDate: Date;
  /** Extracts from the user's most recent practice responses (for context). */
  recentResponseSnippets: string[];
  /** Extracts from the user's most recent AI dialogue prompts (for context). */
  recentDialogueSnippets: string[];
};

/** The fields written to PracticeMessage. */
export type PracticeContent = {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  xpReward: number;
};

// ─── Practice template pools ──────────────────────────────────────────────────

type PracticePrompt = {
  title: string;
  instruction: string;
  reflection: string;
};

const DAILY_PROMPTS: PracticePrompt[] = [
  {
    title: "Morning Silence",
    instruction:
      "Before reaching for your phone or beginning any task, sit quietly for 10 minutes. Do not try to meditate or achieve anything — simply allow yourself to exist without agenda.",
    reflection:
      "What did stillness reveal that busy-ness conceals?",
  },
  {
    title: "Breath as Anchor",
    instruction:
      "Set a timer for 10 minutes. Whenever your mind wanders, gently return your attention to the sensation of breathing — not the idea of breath, but the felt experience. Notice the gap between out-breath and in-breath.",
    reflection:
      "Where did your mind most naturally want to wander? What does that tell you?",
  },
  {
    title: "Sacred Pause",
    instruction:
      "Three times today — morning, midday, and evening — stop whatever you are doing for 60 seconds. Close your eyes. Ask inwardly: 'What is actually here right now?' Then return to your activity.",
    reflection:
      "What did you find in those pauses that your ordinary attention overlooks?",
  },
  {
    title: "Gratitude Inquiry",
    instruction:
      "Write three things you are genuinely grateful for today. Then sit with the question: what is the nature of gratitude itself? Not what you are grateful for, but what gratitude *is* — where does it arise?",
    reflection:
      "Does gratitude point toward something beyond the objects you listed?",
  },
  {
    title: "Body as Teacher",
    instruction:
      "Spend 15 minutes in slow, attentive movement — walking, stretching, or simply shifting your weight. Bring full awareness to physical sensation without labeling or judging it.",
    reflection:
      "What does the body know that the thinking mind does not?",
  },
  {
    title: "Listening Deeper",
    instruction:
      "Choose one conversation today in which you commit to listening without planning your response. Receive what is said as if hearing it for the first time, without the filter of your own story.",
    reflection:
      "What did genuine listening open in you and in the other person?",
  },
  {
    title: "The Present Moment",
    instruction:
      "For one full hour today, bring your attention back to the immediate sensory field — what you see, hear, smell, feel — every time you notice you have drifted into past or future thought.",
    reflection:
      "What is the quality of experience when you are genuinely here?",
  },
];

const WEEKLY_PROMPTS: PracticePrompt[] = [
  {
    title: "Review and Integration",
    instruction:
      "Set aside 30 quiet minutes. Review the past seven days without judgment: what arose, what passed, what surprised you, what you resisted. Write freely, then read what you have written as if reading a stranger's diary.",
    reflection:
      "What theme or pattern is this week pointing toward in your larger journey?",
  },
  {
    title: "The Question That Won't Leave",
    instruction:
      "What question has been living in you this week — not necessarily one you have been asking consciously, but one that keeps surfacing in small moments? Sit with it for 20 minutes without trying to answer it. Let the question itself be the practice.",
    reflection:
      "What does the persistence of this question tell you about where you are on your path?",
  },
  {
    title: "Contemplative Reading",
    instruction:
      "Choose one passage — from a sacred text, a poem, or any writing that has moved you — and read it three times slowly. On the first reading, read with your mind. On the second, read with your heart. On the third, read with your body.",
    reflection:
      "What shifted between readings? What did the text reveal about your current inner state?",
  },
  {
    title: "Nature as Mirror",
    instruction:
      "Spend 30 minutes in nature with no phone and no agenda. Find a single element of the natural world — a tree, a stone, moving water, a patch of sky — and observe it with the attention you would give to something sacred.",
    reflection:
      "What did sustained attention to one simple thing open in your awareness?",
  },
  {
    title: "Ancestor Awareness",
    instruction:
      "Spend 20 minutes writing about the traditions — spiritual, cultural, familial — that formed you. Which do you carry consciously? Which unconsciously? Which do you wish to honour, and which to transform?",
    reflection:
      "How do inherited patterns shape the seeker you are becoming?",
  },
];

// Tradition-specific introduction lines
const TRADITION_OPENINGS: Record<string, string> = {
  sufi:
    "From the tradition of the heart — where love is both the path and the destination —",
  buddhist:
    "In the spirit of wakefulness — meeting this moment with clear, open attention —",
  christian:
    "Held in the grace that precedes all effort —",
  hindu:
    "In the light of inquiry that has illumined seekers for millennia —",
  jewish:
    "In the spirit of sacred questioning that runs through your tradition —",
  taoist:
    "Moving with what is, rather than against it —",
  indigenous:
    "In relationship with the living world that holds us —",
  secular:
    "Drawing on the accumulated wisdom of human contemplative experience —",
};

const DEFAULT_OPENING = "On the path of sincere inquiry —";

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Simple non-cryptographic hash for deterministic selection. */
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function levelLabel(level: number): string {
  if (level <= 1) return "Beginning";
  if (level <= 3) return "Awakening";
  if (level <= 5) return "Deepening";
  if (level <= 7) return "Integrating";
  return "Advanced";
}

function traditionOpening(tradition: string | null): string {
  if (!tradition) return DEFAULT_OPENING;
  const key = tradition.toLowerCase().trim();
  return (
    TRADITION_OPENINGS[key] ??
    TRADITION_OPENINGS[Object.keys(TRADITION_OPENINGS).find((k) => key.includes(k)) ?? ""] ??
    DEFAULT_OPENING
  );
}

// ─── Context builder ──────────────────────────────────────────────────────────

/**
 * Extracts a normalised PracticeContext from the full user record.
 * Pure function — no DB calls.
 */
export function buildUserContext(
  user: UserForPracticeGen,
  cadence: MessageCadence,
  scheduledDate: Date
): PracticeContext {
  return {
    userId: user.id,
    displayName: user.displayName ?? "Seeker",
    level: user.currentLevel,
    tradition: user.profile?.tradition ?? null,
    intent: user.profile?.intent ?? null,
    cadence,
    scheduledDate,
    recentResponseSnippets: user.practiceResponses
      .slice(0, 3)
      .map((r) => r.responseText.slice(0, 120).trim()),
    recentDialogueSnippets: user.dialogues
      .slice(0, 3)
      .map((d) => d.userPrompt.slice(0, 120).trim()),
  };
}

// ─── Content builder ──────────────────────────────────────────────────────────

/**
 * Generates deterministic placeholder practice content.
 * The same user + scheduledDate will always produce the same content.
 *
 * Replace this function with an OpenAI call when AI generation is ready;
 * the return type and signature remain unchanged.
 */
export function buildPlaceholderContent(ctx: PracticeContext): PracticeContent {
  const pool =
    ctx.cadence === MessageCadence.DAILY ? DAILY_PROMPTS : WEEKLY_PROMPTS;

  // Deterministic selection: hash of userId + date string
  const seed = simpleHash(`${ctx.userId}:${formatDate(ctx.scheduledDate)}`);
  const prompt = pool[seed % pool.length];

  const cadenceLabel = ctx.cadence === MessageCadence.DAILY ? "daily" : "weekly";
  const opening = traditionOpening(ctx.tradition);
  const stage = levelLabel(ctx.level);
  const dateStr = formatDate(ctx.scheduledDate);

  const subject = `Your ${cadenceLabel} practice — ${prompt.title} (${dateStr})`;

  // ── Plain-text body ────────────────────────────────────────────────────────
  const bodyText = [
    `Hello ${ctx.displayName},`,
    "",
    `${opening}`,
    "",
    `Your ${cadenceLabel} practice for ${dateStr}: ${prompt.title}`,
    `Journey stage: ${stage} (Level ${ctx.level})`,
    "",
    "─────────────────────────────────",
    "",
    prompt.instruction,
    "",
    "─────────────────────────────────",
    "",
    "Reflection question:",
    prompt.reflection,
    "",
    "When you have completed this practice, reply to share your experience.",
    "Your reflection earns XP and deepens your journey.",
    "",
    "In presence,",
    "The JoinAI Practice Team",
  ].join("\n");

  // ── HTML body ──────────────────────────────────────────────────────────────
  const bodyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  body { margin: 0; padding: 0; background: #0a0614; font-family: Georgia, serif; color: #ede8dc; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  .header { text-align: center; padding-bottom: 32px; border-bottom: 1px solid rgba(201,162,39,0.2); margin-bottom: 32px; }
  .gold { color: #c9a227; }
  .light-gold { color: #f0d47a; }
  .muted { color: rgba(237,232,220,0.5); font-size: 0.85em; }
  h1 { font-size: 1.4rem; color: #f0d47a; margin: 0 0 8px; font-weight: 600; }
  h2 { font-size: 1.1rem; color: #c9a227; margin: 0 0 16px; font-weight: 500; }
  .meta { font-size: 0.8rem; color: rgba(237,232,220,0.4); letter-spacing: 0.05em; text-transform: uppercase; }
  .opening { font-style: italic; color: rgba(237,232,220,0.65); margin-bottom: 24px; font-size: 0.95rem; }
  .instruction { background: rgba(255,255,255,0.03); border-left: 3px solid rgba(201,162,39,0.4); padding: 20px 24px; border-radius: 0 4px 4px 0; margin-bottom: 24px; line-height: 1.75; }
  .reflection { background: rgba(201,162,39,0.06); border: 1px solid rgba(201,162,39,0.2); border-radius: 4px; padding: 16px 20px; margin-bottom: 24px; }
  .reflection-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #c9a227; margin-bottom: 8px; font-family: system-ui, sans-serif; }
  .reflection-text { font-style: italic; line-height: 1.6; }
  .cta { text-align: center; margin: 32px 0; }
  .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(201,162,39,0.15); font-size: 0.8rem; color: rgba(237,232,220,0.35); font-family: system-ui, sans-serif; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="meta">${cadenceLabel} practice &nbsp;·&nbsp; ${dateStr}</div>
    <h1>${prompt.title}</h1>
    <div class="muted">Journey stage: ${stage} &nbsp;·&nbsp; Level ${ctx.level}</div>
  </div>

  <p>Dear ${ctx.displayName},</p>
  <p class="opening">${opening}</p>

  <h2>Today's Practice</h2>
  <div class="instruction">${prompt.instruction}</div>

  <div class="reflection">
    <div class="reflection-label">Reflection question</div>
    <div class="reflection-text">${prompt.reflection}</div>
  </div>

  <p style="color: rgba(237,232,220,0.65); line-height: 1.7;">
    When you have completed this practice, reply to this email with your reflection.
    Your response earns XP and is woven into the tapestry of your unfolding journey.
  </p>

  <div class="footer">
    JoinAI &nbsp;·&nbsp; Your Personalised Contemplative Path<br>
    <span class="gold">Placeholder content — AI generation coming soon</span>
  </div>
</div>
</body>
</html>`;

  const xpReward = ctx.cadence === MessageCadence.DAILY ? 20 : 10;

  return { subject, bodyText, bodyHtml, xpReward };
}
