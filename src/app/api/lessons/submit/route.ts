import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { enforceLearningAccess } from "@/lib/access";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveEntitlements } from "@/lib/membership";

// Passing thresholds by level
function passingScore(level: number): number {
  if (level <= 4) return 60;
  if (level <= 8) return 70;
  return 80;
}

// XP earned by step
function xpForStep(stepNumber: number): number {
  return Math.min(50 + stepNumber * 10, 200);
}

// Context engineering: system prompt varies by level
function buildSystemPrompt(stepNumber: number, userLevel: number, tradition: string | null): string {
  const threshold = passingScore(userLevel);

  const baseRole = `You are a compassionate, wise guide for an educational reflective simulation platform called "Join AI Religion". You evaluate written reflections from seekers on their symbolic inner journey.`;

  const scoringContext = stepNumber <= 3
    ? `This is an early-stage seeker (Step ${stepNumber}). Be generous and encouraging. Early reflections do not need to be profound — sincerity, honesty, and genuine effort are what matter. Score warmly. Most sincere efforts at this stage should score between 65–85.`
    : stepNumber <= 7
    ? `This is a mid-journey seeker (Step ${stepNumber}). You expect more nuanced self-awareness, honest confrontation with difficulty, and integration of the practice experience. Score between 55–80 based on depth and specificity.`
    : `This is an advanced seeker (Step ${stepNumber}). You expect sophisticated self-inquiry, paradox tolerance, non-conceptual awareness, and genuine transformation evidence. Score critically but caringly, 45–90.`;

  const traditionContext = tradition ? `The seeker's tradition is: ${tradition}.` : "";

  return `${baseRole}

${scoringContext}
${traditionContext}

Scoring criteria:
- Authenticity & honesty (0–30 pts)
- Engagement with the practice (0–25 pts)
- Self-awareness & insight (0–25 pts)
- Addressing the reflection questions (0–20 pts)

Passing threshold for this level: ${threshold}/100.

Return ONLY valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "passed": <boolean>,
  "feedback": "<1-3 sentences of warm, specific, guiding feedback in English. Acknowledge what they did well, then offer one suggestion for deepening.>"
}`;
}

export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(`lessons:submit:ip:${getClientIp(req)}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const access = await enforceLearningAccess();
    if (!access.ok) return access.response;

    const userId = access.user.id;
    const { lessonId, promptText } = await req.json() as { lessonId: string; promptText: string };

    if (!lessonId || !promptText?.trim())
      return NextResponse.json({ error: "Missing lessonId or prompt." }, { status: 400 });
    if (promptText.trim().length < 80)
      return NextResponse.json({ error: "Prompt too short. Please write at least 80 characters." }, { status: 400 });

    // Load user + lesson
    const [user, lesson, userLesson] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, include: { lessonQuota: true, subscription: true, onboarding: true } }),
      db.lesson.findUnique({ where: { id: lessonId } }),
      db.userLesson.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    ]);

    if (!user || !lesson) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (userLesson?.status === "COMPLETED")
      return NextResponse.json({ error: "You have already completed this lesson." }, { status: 400 });

    // Quota check
    const now = new Date();
    const hasDailyAccess = resolveEntitlements(user.subscription).dailyLessonAttempt;
    const quota = user.lessonQuota;

    if (quota && quota.usedAttempts >= quota.maxAttempts && now < new Date(quota.periodEnd)) {
      return NextResponse.json({
        error: hasDailyAccess
          ? "You've used your daily prompt attempt. Come back tomorrow."
          : "You've used your free attempt this week. Upgrade to Initiate for daily access.",
      }, { status: 429 });
    }

    // Ensure UserLesson exists
    let ul = userLesson;
    if (!ul) {
      ul = await db.userLesson.create({ data: { userId, lessonId, status: "IN_PROGRESS", startedAt: now } });
    }

    // Build context for OpenAI
    const previousAttempts = await db.lessonAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const tradition = user.onboarding.find((a) => a.questionKey === "tradition")?.answer || null;

    const systemPrompt = buildSystemPrompt(lesson.stepNumber, user.currentLevel, tradition);

    const userMessage = `Seeker's reflection for Step ${lesson.stepNumber}: "${lesson.title}"

Practice context: ${lesson.practiceDescription.slice(0, 600)}

Reflection questions:
${(lesson.questions as { id: string; text: string }[]).map((q, i) => `${i + 1}. ${q.text}`).join("\n")}

Previous attempts on this journey: ${previousAttempts.length} (to inform difficulty calibration, not visible to seeker)

Seeker's submission:
---
${promptText.trim()}
---`;

    const fullContextSent = `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userMessage}`;

    let score = 70;
    let passed = false;
    let feedback = "";
    let aiRawResponse = "";
    let tokensUsed = 0;
    let latencyMs = 0;

    if (env.OPENAI_API_KEY) {
      const t0 = Date.now();
      try {
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
            temperature: 0.4,
            max_tokens: 400,
            response_format: { type: "json_object" },
          }),
        });
        latencyMs = Date.now() - t0;
        aiRawResponse = await aiRes.text();
        const parsed = JSON.parse(aiRawResponse);
        const content = JSON.parse(parsed.choices?.[0]?.message?.content || "{}");
        tokensUsed = parsed.usage?.total_tokens || 0;
        score = Math.max(0, Math.min(100, Number(content.score) || 70));
        feedback = String(content.feedback || "");
        passed = score >= passingScore(user.currentLevel);
      } catch (e) {
        console.error("openai_error", e);
        // Fallback — give passing score for good-faith attempt
        score = 72;
        passed = true;
        feedback = "Your reflection shows sincere effort. Continue deepening your practice.";
      }
    } else {
      // No API key — auto-pass with encouragement
      score = 75;
      passed = true;
      feedback = "Your reflection demonstrates genuine engagement. Well done, seeker.";
    }

    // Save attempt
    const attempt = await db.lessonAttempt.create({
      data: {
        userLessonId: ul.id,
        userId,
        promptText: promptText.trim(),
        fullContextSent,
        aiRawResponse: aiRawResponse || JSON.stringify({ score, passed, feedback }),
        score,
        passed,
        feedback,
        tokensUsed,
        latencyMs,
      },
    });

    // Update quota
    if (quota) {
      const newPeriodStart = now;
      const newPeriodEnd = hasDailyAccess
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)      // paid: daily
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // free: weekly

      if (quota.usedAttempts >= quota.maxAttempts) {
        // Reset period
        await db.lessonQuota.update({
          where: { userId },
          data: { usedAttempts: 1, periodStart: newPeriodStart, periodEnd: newPeriodEnd, lastResetAt: now },
        });
      } else {
        await db.lessonQuota.update({ where: { userId }, data: { usedAttempts: { increment: 1 } } });
      }
    } else {
      // Create quota
      await db.lessonQuota.create({
        data: {
          userId,
          periodStart: now,
          periodEnd: hasDailyAccess ? new Date(now.getTime() + 86400000) : new Date(now.getTime() + 7 * 86400000),
          usedAttempts: 1,
          maxAttempts: 1,
        },
      });
    }

    // If passed → update UserLesson status and award XP
    if (passed) {
      const xp = xpForStep(lesson.stepNumber);
      await db.userLesson.update({
        where: { id: ul.id },
        data: { status: "COMPLETED", completedAt: now, xpEarned: xp },
      });

      // Count completed lessons
      const completedCount = await db.userLesson.count({ where: { userId, status: "COMPLETED" } });
      const newXp = (user.xpTotal || 0) + xp;

      // Level up every 12 completed lessons
      const newLevel = Math.min(10, Math.floor(completedCount / 12) + 1);
      const leveledUp = newLevel > user.currentLevel;

      await db.user.update({
        where: { id: userId },
        data: {
          xpTotal: newXp,
          currentLevel: newLevel,
          lastActiveDate: now,
        },
      });

      if (leveledUp) {
        const levelLabels = ["","Seeker","Awakened","Inquirer","Contemplative","Universal","Hermit","Returned","Bridge","Sovereign","Transcendent"];
        await db.journeyLevel.create({
          data: { userId, level: newLevel, label: levelLabels[newLevel] || `Level ${newLevel}` },
        });
      }

      // Trigger next lesson generation (async, non-blocking)
      generateNextLesson(userId, lesson.stepNumber + 1, user, attempt.id).catch(console.error);
    } else {
      // Update status to FAILED (can retry when quota allows)
      await db.userLesson.update({
        where: { id: ul.id },
        data: { status: "FAILED" },
      });
    }

    // Activity log
    await db.userActivityLog.create({
      data: {
        userId,
        eventType: "PROMPT",
        eventName: "lesson_submit",
        metadata: { lessonId, score, passed, stepNumber: lesson.stepNumber },
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, score, passed, feedback, attemptId: attempt.id });
  } catch (error) {
    console.error("lesson_submit_error", error);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}

// Generate next personalized lesson via OpenAI
async function generateNextLesson(userId: string, nextStep: number, user: { id: string; currentLevel: number; onboarding: { questionKey: string; answer: string }[] }, lastAttemptId: string) {
  if (!env.OPENAI_API_KEY) return;
  if (nextStep > 12) return; // max 12 lessons per level

  // Check if next lesson already exists for this user
  const existingLesson = await db.lesson.findFirst({
    where: { forUserId: userId, stepNumber: nextStep },
  });
  if (existingLesson) return;

  // Gather user context
  const onboardingMap: Record<string, string> = {};
  user.onboarding.forEach((a) => { onboardingMap[a.questionKey] = a.answer; });

  // Get completed lessons for context
  const completedAttempts = await db.lessonAttempt.findMany({
    where: { userId, passed: true },
    include: { userLesson: { include: { lesson: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const completedSummary = completedAttempts.map((a) =>
    `Step ${a.userLesson.lesson.stepNumber}: "${a.userLesson.lesson.title}" — Score: ${a.score}/100`
  ).join("\n");

  const systemPrompt = `You are a master teacher of contemplative traditions generating personalized sacred lessons for an educational reflective simulation platform. Create a deeply personalized Step ${nextStep} lesson for this seeker.`;

  const userMessage = `Seeker profile:
- Tradition: ${onboardingMap.tradition || "Universal"}
- Relationship with spirituality: ${onboardingMap.relationship || "Exploring"}
- What draws them: ${onboardingMap.draw || "Not specified"}
- Key obstacle: ${onboardingMap.obstacle || "Not specified"}
- Core question: ${onboardingMap.question || "Not specified"}
- Level: ${user.currentLevel}

Completed lessons:
${completedSummary || "None yet"}

Create Step ${nextStep} lesson JSON with these exact fields:
{
  "title": "<evocative lesson title>",
  "tradition": ${onboardingMap.tradition ? `"${onboardingMap.tradition}"` : "null"},
  "readingText": "<400-600 word reading text weaving wisdom from their tradition with universal contemplative themes. Use **bold** for section headers>",
  "practiceDescription": "<200-350 word practice instructions with phases labeled **Phase 1**, **Phase 2**, etc.>",
  "questions": [
    {"id": "q1", "text": "<question 1 tailored to their profile>", "type": "experience"},
    {"id": "q2", "text": "<question 2>", "type": "reflection"},
    {"id": "q3", "text": "<question 3>", "type": "reflection"},
    {"id": "q4", "text": "<question 4 — deeper inquiry>", "type": "insight"}
  ]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        temperature: 0.7,
        max_tokens: 1800,
        response_format: { type: "json_object" },
      }),
    });
    const raw = await res.json();
    const content = JSON.parse(raw.choices?.[0]?.message?.content || "{}");

    if (content.title && content.readingText) {
      const newLesson = await db.lesson.create({
        data: {
          stepNumber: nextStep,
          levelRequired: user.currentLevel,
          title: content.title,
          tradition: content.tradition || null,
          readingText: content.readingText,
          practiceDescription: content.practiceDescription,
          questions: content.questions || [],
          isTemplate: false,
          forUserId: userId,
        },
      });

      // Add to user's lesson list
      await db.userLesson.create({
        data: { userId, lessonId: newLesson.id, status: "PENDING" },
      });
    }
  } catch (e) {
    console.error("generate_next_lesson_error", e);
  }
}
