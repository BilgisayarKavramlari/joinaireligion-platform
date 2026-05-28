/**
 * POST /api/lessons/generate-next
 *
 * Explicitly requests the next personalized lesson for the authenticated user.
 * Normally called automatically after a lesson is passed (fire-and-forget in
 * the submit route). This endpoint lets the client poll / retry if the async
 * generation failed or hasn't run yet.
 *
 * Body: { afterStepNumber: number }   — the step number just completed
 *
 * Returns:
 *   { ok: true, lessonId, stepNumber, title }   — if a lesson already exists or was generated
 *   { ok: false, reason }                        — if generation failed or step limit reached
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

const MAX_STEPS_PER_LEVEL = 12;

const LEVEL_LABELS = [
  "", "Seeker", "Awakened", "Inquirer", "Contemplative",
  "Universal", "Hermit", "Returned", "Bridge", "Sovereign", "Transcendent",
];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.userId;
    const { afterStepNumber } = await req.json() as { afterStepNumber?: number };
    const nextStep = (afterStepNumber ?? 0) + 1;

    if (nextStep > MAX_STEPS_PER_LEVEL) {
      return NextResponse.json({ ok: false, reason: "Maximum steps reached for this level." });
    }

    // ── 1. Check whether the next lesson already exists ───────────────────────
    const existing = await db.lesson.findFirst({
      where: { forUserId: userId, stepNumber: nextStep },
    });

    if (existing) {
      // Ensure the user has a UserLesson row for it
      await db.userLesson.upsert({
        where:  { userId_lessonId: { userId, lessonId: existing.id } },
        create: { userId, lessonId: existing.id, status: "PENDING" },
        update: {},
      });
      return NextResponse.json({ ok: true, lessonId: existing.id, stepNumber: existing.stepNumber, title: existing.title });
    }

    // ── 2. No lesson yet — generate via OpenAI ────────────────────────────────
    if (!env.OPENAI_API_KEY) {
      // Dev fallback: clone the Step 1 template with an updated step number
      const template = await db.lesson.findFirst({ where: { stepNumber: 1, isTemplate: true, forUserId: null } });
      if (!template) return NextResponse.json({ ok: false, reason: "No template lesson found." });

      const fallback = await db.lesson.create({
        data: {
          stepNumber: nextStep,
          levelRequired: 1,
          title: `${template.title} — Step ${nextStep}`,
          tradition: template.tradition,
          readingText: template.readingText,
          practiceDescription: template.practiceDescription,
          questions: template.questions as Prisma.InputJsonValue,
          isTemplate: false,
          forUserId: userId,
        },
      });
      await db.userLesson.create({ data: { userId, lessonId: fallback.id, status: "PENDING" } });
      return NextResponse.json({ ok: true, lessonId: fallback.id, stepNumber: fallback.stepNumber, title: fallback.title });
    }

    // ── 3. Fetch user context ─────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { onboarding: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const onboardingMap: Record<string, string> = {};
    user.onboarding.forEach((a) => { onboardingMap[a.questionKey] = a.answer; });

    const completedAttempts = await db.lessonAttempt.findMany({
      where: { userId, passed: true },
      include: { userLesson: { include: { lesson: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const completedSummary = completedAttempts.map((a) =>
      `Step ${a.userLesson.lesson.stepNumber}: "${a.userLesson.lesson.title}" — Score: ${a.score}/100`
    ).join("\n");

    // ── 4. Build prompt ───────────────────────────────────────────────────────
    const systemPrompt = `You are a master teacher of contemplative traditions. Generate a deeply personalized Step ${nextStep} lesson for a seeker on an educational symbolic reflection platform. The lesson must be substantive, tradition-aware, and draw on the seeker's profile and history.`;

    const userMessage = `Seeker profile:
- Tradition: ${onboardingMap.tradition || "Universal / Not Specified"}
- Relationship with spirituality: ${onboardingMap.relationship || "Exploring"}
- What draws them to this path: ${onboardingMap.draw || "Not specified"}
- Core obstacle: ${onboardingMap.obstacle || "Not specified"}
- Deepest question: ${onboardingMap.question || "Not specified"}
- Preferred practice: ${onboardingMap.practice || "Not specified"}
- Journey level: ${user.currentLevel} (${LEVEL_LABELS[user.currentLevel] ?? "Unknown"})

Completed lessons (most recent first):
${completedSummary || "None yet — this is their first personalized lesson"}

Generate Step ${nextStep} as a JSON object with these exact fields:
{
  "title": "<evocative 4–8 word title referencing their tradition or a universal symbol>",
  "tradition": ${onboardingMap.tradition ? `"${onboardingMap.tradition}"` : "null"},
  "readingText": "<400–650 word reading that weaves wisdom from their tradition with universal contemplative themes. Open with a paradox or teaching. Use **bold** for section headers. End with a 1-line invitation to practice.>",
  "practiceDescription": "<200–350 word step-by-step practice with phases labeled **Phase 1: Name**, **Phase 2: Name**, etc. Specify duration for each phase. End with guidance on what to write in their prompt.>",
  "questions": [
    {"id": "q1", "text": "<experience question — what they noticed or felt>", "type": "experience"},
    {"id": "q2", "text": "<reflection question — connecting to their tradition or past>", "type": "reflection"},
    {"id": "q3", "text": "<insight question — integrating with their daily life>", "type": "reflection"},
    {"id": "q4", "text": "<depth question — their deepest honest inquiry>", "type": "insight"}
  ]
}`;

    // ── 5. Call OpenAI ────────────────────────────────────────────────────────
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.72,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      console.error("generate_next_openai_error", aiRes.status);
      return NextResponse.json({ ok: false, reason: "AI generation temporarily unavailable. Try again shortly." });
    }

    const raw = await aiRes.json();
    let content: {
      title?: string;
      tradition?: string | null;
      readingText?: string;
      practiceDescription?: string;
      questions?: { id: string; text: string; type: string }[];
    } = {};

    try {
      content = JSON.parse(raw.choices?.[0]?.message?.content || "{}");
    } catch {
      return NextResponse.json({ ok: false, reason: "AI returned malformed lesson. Please retry." });
    }

    if (!content.title || !content.readingText || !content.practiceDescription) {
      return NextResponse.json({ ok: false, reason: "AI lesson incomplete. Please retry." });
    }

    // ── 6. Save lesson + UserLesson ───────────────────────────────────────────
    const newLesson = await db.lesson.create({
      data: {
        stepNumber:           nextStep,
        levelRequired:        user.currentLevel,
        title:                content.title,
        tradition:            content.tradition ?? onboardingMap.tradition ?? null,
        readingText:          content.readingText,
        practiceDescription:  content.practiceDescription,
        questions:            (content.questions ?? []) as object,
        isTemplate:           false,
        forUserId:            userId,
      },
    });

    await db.userLesson.create({
      data: { userId, lessonId: newLesson.id, status: "PENDING" },
    });

    // Log activity
    await db.userActivityLog.create({
      data: {
        userId,
        eventType: "AI",
        eventName: "lesson_generated",
        metadata:  { stepNumber: nextStep, lessonId: newLesson.id },
      },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      lessonId:   newLesson.id,
      stepNumber: newLesson.stepNumber,
      title:      newLesson.title,
    });
  } catch (error) {
    console.error("generate_next_lesson_error", error);
    return NextResponse.json({ error: "Failed to generate lesson." }, { status: 500 });
  }
}
