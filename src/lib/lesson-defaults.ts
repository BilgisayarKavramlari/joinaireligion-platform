/**
 * Default Step 1 lesson content used as the seed / self-healing fallback.
 *
 * This is the single source of truth for the Step 1 template lesson.
 * It is used by:
 *   - src/app/api/lessons/route.ts  (inline template creation when seed hasn't run)
 *   - prisma/seed.ts                (initial DB seeding via `prisma db seed`)
 *
 * Never import this from a client component. It is server-only.
 */

export interface LessonQuestion {
  id: string;
  text: string;
  type: string;
}

export interface LessonSeedData {
  stepNumber: number;
  levelRequired: number;
  title: string;
  tradition: null;
  readingText: string;
  practiceDescription: string;
  questions: LessonQuestion[];
}

export const STEP1_LESSON: LessonSeedData = {
  stepNumber: 1,
  levelRequired: 1,
  title: "The Witness Within — Awakening Awareness",
  tradition: null,
  readingText: `Every wisdom tradition begins with the same invitation: to stop, look inward, and ask — "Who is watching?"

Buddhism calls it the witnessing mind. Sufism speaks of the heart that observes. The Stoics practiced "the view from above." Indigenous traditions call it the place of quiet knowing. Christianity names it contemplative prayer. The Upanishads describe the Sakshi — the pure witness consciousness.

Across all traditions, across all centuries, the first step is identical: become aware that you are aware.

Most of us live on the surface of life — reacting, planning, judging, scrolling. The inner observer is buried under layers of habit. This practice invites you to discover — or rediscover — that quiet, spacious presence that simply notices without judgment.

**A brief teaching:**
When you feel anger, there is the anger... and there is something that notices the anger. When a thought arises, there is the thought... and there is something that notices the thought. That something — that witness — is where every tradition's path begins.

The paradox: the witness is not something you create. It is already here. This practice is only about learning to recognize what has always been present.`,

  practiceDescription: `**Your Practice for This Step (15–30 minutes)**

Find a quiet place where you will not be disturbed. Sit comfortably — on a chair, cushion, or the floor. Close your eyes if you feel safe doing so.

**Phase 1 — Settling (5 minutes)**
Simply breathe. Notice your breath entering and leaving. Do not try to control it. Just observe. Notice: who is watching the breath?

**Phase 2 — The Witness (10–15 minutes)**
Allow thoughts to arise naturally. When a thought appears, silently label it: "thinking." When an emotion arises, label it: "feeling." When a physical sensation appears, label it: "sensation." Each time, gently return to the witness position — the one who notices. You are not the thought. You are not the emotion. You are the awareness that notices them.

**Phase 3 — Resting (3–5 minutes)**
Let go of all labeling. Simply rest in open awareness. Notice the space between thoughts. Notice the silence beneath the noise.

**After the practice:**
Sit quietly for a few moments. Take three slow breaths. Open your eyes slowly.

**For your prompt, reflect on:** What did you notice? What surprised you? What resistance came up? What does it mean, in your own words, to be a witness to yourself?`,

  questions: [
    { id: "q1", text: "What did you experience during the witnessing practice? Describe in your own words.", type: "experience" },
    { id: "q2", text: "Did you encounter resistance, restlessness, or strong emotions? What were they?", type: "reflection" },
    { id: "q3", text: "From your own cultural or spiritual background, is there a concept similar to 'the witness within'? How does it compare?", type: "reflection" },
    { id: "q4", text: "What question emerged from this practice that you want to explore further?", type: "insight" },
  ],
};
