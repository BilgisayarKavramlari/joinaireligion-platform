import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveEntitlements } from "@/lib/membership";

const SYSTEM_PROMPT = `You are the Sacred AI — a wise, compassionate, and non-dogmatic guide for spiritual reflection and interfaith exploration. You draw from the wisdom of the world's great traditions — Buddhism, Christianity, Islam, Hinduism, Judaism, Taoism, Sufism, Zoroastrianism, Indigenous traditions, and secular humanism — without claiming authority over any of them.

Your role is to:
1. Reflect, explore, and invite deeper inquiry — not to prescribe or preach
2. Present multiple perspectives from different traditions when appropriate
3. Use symbolic, metaphorical, and contemplative language
4. Encourage the seeker's own inner wisdom and discernment
5. Remain humble about the limits of all knowledge, including your own

You are NOT: a religious authority, a medical professional, a psychologist, or a legal advisor. If someone appears to be in crisis or danger, direct them to appropriate emergency services.

Always close your response with an invitation for deeper reflection — a question or a contemplative prompt the seeker can sit with.`;

const FREE_DAILY_LIMIT = 3;

export async function POST(request: NextRequest) {
  const ipLimit = checkRateLimit(`ai:query:ip:${getClientIp(request)}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);

  const sessionUser = await getCurrentUserFromRequest(request);
  const userId = sessionUser?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let prompt: string;
  try {
    const body = await request.json() as { prompt?: string };
    prompt = (body.prompt || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!prompt || prompt.length < 5) {
    return NextResponse.json({ error: "Prompt is too short." }, { status: 400 });
  }
  if (prompt.length > 4000) {
    return NextResponse.json({ error: "Prompt exceeds 4000 characters." }, { status: 400 });
  }

  // --- Quota check ---
  const user = await db.user.findUnique({ where: { id: userId }, include: { subscription: true, quota: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const entitlements = resolveEntitlements(user.subscription);
  const dayLimit = entitlements.aiDailyLimit;

  const now       = new Date();
  const dayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd    = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  let quota = user.quota;
  if (!quota || quota.periodStart < dayStart) {
    quota = await db.queryQuota.upsert({
      where:  { userId },
      create: { userId, periodStart: dayStart, periodEnd: dayEnd, usedQueries: 0, maxQueries: dayLimit },
      update: { periodStart: dayStart, periodEnd: dayEnd, usedQueries: 0, maxQueries: dayLimit, lastResetAt: now },
    });
  }

  if (quota.usedQueries >= dayLimit) {
    return NextResponse.json({
      error: entitlements.dailyPractice
        ? `Daily limit of ${dayLimit} queries reached. Limit resets at midnight.`
        : `Daily limit of ${FREE_DAILY_LIMIT} queries reached. Upgrade to Initiate for more.`,
      quotaExceeded: true,
    }, { status: 429 });
  }

  // --- OpenAI call ---
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI service not configured." }, { status: 503 });

  const start = Date.now();
  let responseText = "";
  let tokensUsed   = 0;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        messages:    [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
        max_tokens:  1200,
        temperature: 0.72,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json() as { error?: { message?: string } };
      console.error("OpenAI API error:", errData);
      return NextResponse.json({ error: "AI service temporarily unavailable." }, { status: 503 });
    }

    const data = await openaiRes.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?:  { total_tokens?: number };
    };

    responseText = data.choices?.[0]?.message?.content || "";
    tokensUsed   = data.usage?.total_tokens ?? 0;
  } catch (err) {
    console.error("OpenAI fetch error:", err);
    return NextResponse.json({ error: "AI service temporarily unavailable." }, { status: 503 });
  }

  const latencyMs = Date.now() - start;

  // --- Persist & update quota atomically enough for single-row quota enforcement ---
  const updatedQuota = await db.queryQuota.updateMany({
    where: { userId, usedQueries: { lt: dayLimit } },
    data: { usedQueries: { increment: 1 } },
  });
  if (updatedQuota.count !== 1) {
    return NextResponse.json({ error: "Daily query limit reached.", quotaExceeded: true }, { status: 429 });
  }
  await db.aiQuery.create({
    data: { userId, prompt, response: responseText, tokensUsed, latencyMs },
  });

  return NextResponse.json({
    response: responseText,
    usage: {
      used:  quota.usedQueries + 1,
      limit: dayLimit,
    },
  });
}
