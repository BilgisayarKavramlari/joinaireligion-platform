export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveEntitlements } from "@/lib/membership";
import {
  buildReflectionInstructions,
  buildUntrustedReflectionInput,
  crisisResponse,
  detectsCrisisLanguage,
  detectsPromptInjection,
  hashedSafetyIdentifier,
  outputViolatesReflectionPolicy,
  parseReflectionRequest,
  parseStructuredReflectionAnswer,
  REFLECTION_RESPONSE_FORMAT,
  safeFallbackResponse,
  type ReflectionAnswer,
} from "@/lib/reflection-companion";
import {
  hashReflectionIp,
  recordReflectionOutcome,
  reflectionQuotaStatus,
  reserveReflectionUsage,
} from "@/lib/reflection-abuse";
import { moderateReflectionText } from "@/lib/reflection-provider";

type ResponsesApiResponse = {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
};

const BOT_PATTERN = /bot|crawler|spider|slurp|headless|lighthouse|preview/i;

function noStoreJson(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", ...headers },
  });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  try { allowed.add(new URL(env.NEXT_PUBLIC_APP_URL).origin); } catch { /* forwarded origin remains */ }
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host"))?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host && proto) allowed.add(`${proto}://${host}`);
  return allowed.has(origin);
}

async function fetchJsonWithTimeout(url: string, options: RequestInit, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function outputText(payload: ResponsesApiResponse): string {
  return (payload.output || [])
    .flatMap((item) => item.type === "message" ? item.content || [] : [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("")
    .trim();
}

async function currentProductUser(request: NextRequest) {
  const session = await getCurrentUserFromRequest(request);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, emailVerifiedAt: true, onboardingDone: true, preferredLocale: true, subscription: true },
  });
  return user ? { ...user, sessionId: session.sessionId } : null;
}

export async function GET(request: NextRequest) {
  const user = await currentProductUser(request);
  if (!user) return noStoreJson({ error: "Authentication required." }, 401);
  if (!user.emailVerifiedAt || !user.onboardingDone) {
    return noStoreJson({ error: "Email verification and onboarding are required." }, 403);
  }
  const entitlements = resolveEntitlements(user.subscription);
  const quota = await reflectionQuotaStatus({ userId: user.id, entitlements });
  return noStoreJson({
    enabled: env.AI_REFLECTION_ENABLED !== "false",
    plan: entitlements.plan || "free",
    quota,
    modes: entitlements.reflectionLifeMode ? ["lesson", "life"] : ["lesson"],
    privacy: {
      conversationTextStored: false,
      providerApplicationStateStored: false,
      providerAbuseMonitoringMayRetainUpToDays: 30,
      liveMonitoring: false,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return noStoreJson({ error: "Invalid request origin." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return noStoreJson({ error: "Unsupported content type." }, 415);
  }
  if (BOT_PATTERN.test(request.headers.get("user-agent") || "")) return noStoreJson({ error: "Automated clients are not allowed." }, 403);
  if (env.AI_REFLECTION_ENABLED === "false") return noStoreJson({ error: "Reflection Companion is temporarily unavailable." }, 503);

  const apiKey = env.OPENAI_API_KEY;
  const hashSecret = env.ANALYTICS_HASH_SECRET || env.CRON_SECRET;
  if (!apiKey || !hashSecret) return noStoreJson({ error: "Reflection Companion is not safely configured." }, 503);

  const ipHash = hashReflectionIp(getClientIp(request), hashSecret);
  const burstLimit = checkRateLimit(`reflection:ip:${ipHash}`, { limit: 10, windowMs: 60_000 });
  if (!burstLimit.allowed) return rateLimitResponse(burstLimit.retryAfter);

  const user = await currentProductUser(request);
  if (!user) return noStoreJson({ error: "Authentication required." }, 401);
  if (!user.emailVerifiedAt) return noStoreJson({ error: "Verify your email before using Reflection Companion." }, 403);
  if (!user.onboardingDone) return noStoreJson({ error: "Complete onboarding before using Reflection Companion.", next: "/onboarding" }, 403);

  const accountBurst = checkRateLimit(`reflection:user:${user.id}`, { limit: 4, windowMs: 60_000 });
  if (!accountBurst.allowed) return rateLimitResponse(accountBurst.retryAfter);

  const body = parseReflectionRequest(await request.json().catch(() => null));
  if (!body) return noStoreJson({ error: "Invalid or oversized reflection request." }, 400);
  const entitlements = resolveEntitlements(user.subscription);
  if (body.mode === "life" && !entitlements.reflectionLifeMode) {
    return noStoreJson({ error: "Life Reflection is available with Initiate membership.", upgradeRequired: true }, 403);
  }
  const historyCharacters = body.history.reduce((sum, message) => sum + message.content.length, 0);
  const historyLimit = entitlements.reflectionLifeMode ? { messages: 15, characters: 20_000 } : { messages: 5, characters: 7_500 };
  if (body.history.length > historyLimit.messages || historyCharacters > historyLimit.characters) {
    return noStoreJson({ error: "The visible conversation context is too long for this membership." }, 400);
  }

  const untrustedText = [...body.history.map((message) => message.content), body.prompt].join("\n");
  if (detectsPromptInjection(untrustedText)) {
    await recordReflectionOutcome({
      userId: user.id, conversationId: body.conversationId, mode: body.mode,
      promptCharCount: body.prompt.length, model: null, tokensInput: null, tokensOutput: null, totalTokens: null,
      latencyMs: 0, outcome: "input_blocked", safetyFlags: ["deterministic_prompt_injection"],
    }).catch(() => undefined);
    return noStoreJson({ error: "This request attempts to change or reveal protected system instructions.", safetyCode: "prompt_injection" }, 400);
  }

  if (detectsCrisisLanguage(body.prompt)) {
    const answer = crisisResponse(user.preferredLocale);
    await recordReflectionOutcome({
      userId: user.id,
      conversationId: body.conversationId,
      mode: body.mode,
      promptCharCount: body.prompt.length,
      model: null,
      tokensInput: null,
      tokensOutput: null,
      totalTokens: null,
      latencyMs: 0,
      outcome: "crisis_redirect",
      safetyFlags: ["deterministic_crisis_language"],
      unlinkUser: true,
    }).catch(() => undefined);
    return noStoreJson({ answer, safetyRedirect: true, quotaConsumed: false });
  }

  const lesson = body.mode === "lesson" ? await db.userLesson.findFirst({
    where: { userId: user.id, lessonId: body.lessonId as string },
    select: {
      lesson: { select: { title: true, tradition: true, readingText: true, practiceDescription: true } },
    },
  }) : null;
  if (body.mode === "lesson" && !lesson) return noStoreJson({ error: "Choose one of your available lessons." }, 403);

  const reservation = await reserveReflectionUsage({
    userId: user.id,
    ipHash,
    conversationId: body.conversationId,
    mode: body.mode,
    entitlements,
  });
  if (!reservation.allowed) {
    const messages = {
      daily_quota: "Your daily Reflection Companion limit has been reached.",
      session_limit: "Your daily guided-session limit has been reached.",
      turn_limit: "This guided session is complete. Start a new session when your plan allows.",
      ip_budget: "The safety limit for this network has been reached.",
      global_budget: "Reflection Companion reached its protected daily service budget.",
    } as const;
    return noStoreJson({ error: messages[reservation.code], quotaExceeded: true, budgetCode: reservation.code }, 429, { "Retry-After": String(reservation.retryAfter) });
  }

  const inputModeration = await moderateReflectionText(apiKey, untrustedText);
  if (!inputModeration.ok) {
    await recordReflectionOutcome({
      userId: user.id, conversationId: body.conversationId, mode: body.mode,
      promptCharCount: body.prompt.length, model: null, tokensInput: null, tokensOutput: null, totalTokens: null,
      latencyMs: 0, outcome: "provider_failed", safetyFlags: [`input_moderation_${inputModeration.failureCode}`],
    }).catch(() => undefined);
    return noStoreJson({ error: "Safety screening is temporarily unavailable." }, 503);
  }
  if (inputModeration.flagged) {
    const selfHarm = inputModeration.flags.some((flag) => flag.startsWith("self-harm"));
    const answer = selfHarm ? crisisResponse(user.preferredLocale) : safeFallbackResponse(user.preferredLocale);
    await recordReflectionOutcome({
      userId: user.id, conversationId: body.conversationId, mode: body.mode,
      promptCharCount: body.prompt.length, model: null, tokensInput: null, tokensOutput: null, totalTokens: null,
      latencyMs: 0, outcome: "input_blocked", safetyFlags: inputModeration.flags,
      unlinkUser: selfHarm,
    }).catch(() => undefined);
    return noStoreJson({ answer, safetyRedirect: true, quota: reservation });
  }

  const model = env.AI_REFLECTION_MODEL || "gpt-5-mini";
  const initiate = entitlements.plan === "initiate" && entitlements.subscriptionActive;
  const startedAt = Date.now();
  let providerPayload: ResponsesApiResponse | null = null;
  try {
    const providerResponse = await fetchJsonWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: buildReflectionInstructions(body.mode, user.preferredLocale, !initiate),
        input: buildUntrustedReflectionInput({ prompt: body.prompt, history: body.history, lesson: lesson?.lesson || null }),
        text: { format: REFLECTION_RESPONSE_FORMAT },
        max_output_tokens: initiate ? 1_400 : 900,
        tools: [],
        tool_choice: "none",
        parallel_tool_calls: false,
        store: false,
        truncation: "disabled",
        safety_identifier: hashedSafetyIdentifier(user.id, hashSecret),
      }),
    });
    if (providerResponse.ok) providerPayload = await providerResponse.json() as ResponsesApiResponse;
  } catch {
    providerPayload = null;
  }

  const latencyMs = Date.now() - startedAt;
  const usage = providerPayload?.usage;
  if (!providerPayload || providerPayload.status !== "completed") {
    await recordReflectionOutcome({
      userId: user.id, conversationId: body.conversationId, mode: body.mode,
      promptCharCount: body.prompt.length, model, tokensInput: usage?.input_tokens ?? null,
      tokensOutput: usage?.output_tokens ?? null, totalTokens: usage?.total_tokens ?? null,
      latencyMs, outcome: "provider_failed", safetyFlags: ["response_provider_unavailable"],
    }).catch(() => undefined);
    return noStoreJson({ error: "Reflection Companion is temporarily unavailable. This attempt was stopped within the daily safety budget." }, 503);
  }

  let answer: ReflectionAnswer | null = parseStructuredReflectionAnswer(outputText(providerPayload));
  let outcome: "completed" | "output_blocked" = "completed";
  let safetyFlags: string[] = [];
  if (!answer || outputViolatesReflectionPolicy(answer)) {
    answer = safeFallbackResponse(user.preferredLocale);
    outcome = "output_blocked";
    safetyFlags = ["structured_or_policy_validation_failed"];
  } else {
    const outputModeration = await moderateReflectionText(apiKey, `${answer.answer}\n${answer.reflectionQuestion}\n${answer.nextStep || ""}`);
    if (!outputModeration.ok || outputModeration.flagged) {
      answer = safeFallbackResponse(user.preferredLocale);
      outcome = "output_blocked";
      safetyFlags = outputModeration.ok ? outputModeration.flags : [`output_moderation_${outputModeration.failureCode}`];
    }
  }

  await recordReflectionOutcome({
    userId: user.id,
    conversationId: body.conversationId,
    mode: body.mode,
    promptCharCount: body.prompt.length,
    model,
    tokensInput: usage?.input_tokens ?? null,
    tokensOutput: usage?.output_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    latencyMs,
    outcome,
    safetyFlags,
  }).catch(() => undefined);

  return noStoreJson({
    answer,
    conversationId: body.conversationId,
    quota: reservation,
    privacy: {
      conversationTextStored: false,
      providerApplicationStateStored: false,
      providerAbuseMonitoringMayRetainUpToDays: 30,
    },
  });
}
