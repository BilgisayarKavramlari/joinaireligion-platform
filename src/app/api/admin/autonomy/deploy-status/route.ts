/**
 * GET /api/admin/autonomy/deploy-status
 *
 * Returns a snapshot of the current deployment state: git commit, build
 * timestamp, database connectivity, last AgentRun per agent, generation
 * mode, and email mode.  No secrets are returned.
 *
 * Authentication: authenticated admin session only. CRON_SECRET is reserved for /api/cron/* routes.
 *
 * Response shape:
 *   {
 *     checkedAt:           ISO string,
 *     gitCommit:           string | null,
 *     buildTimestamp:      string | null,
 *     appVersion:          string | null,
 *     dbConnected:         boolean,
 *     generationMode:      "placeholder" | "openai" | string,
 *     openaiKeyPresent:    boolean,
 *     emailMode:           "LIVE" | "LOG_ONLY",
 *     emailSendingEnabled: boolean,
 *     lastAgentRuns:       Record<string, AgentRunSummary | null>,
 *   }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireAdminSession } from "@/lib/admin";
import { AGENT_DEFINITIONS } from "@/lib/agents";
import { getConfiguredSocialProviders } from "@/lib/social/providers";

// ─── Auth (same pattern as health endpoint) ────────────────────────────────

async function isAuthorized(_request: NextRequest): Promise<boolean> {
  try {
    await requireAdminSession();
    return true;
  } catch {
    return false;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface AgentRunSummary {
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function buildDeployStatusReport() {
  const checkedAt = new Date().toISOString();

  // ── DB connectivity ─────────────────────────────────────────────────────
  let dbConnected = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  // ── Last run per agent ──────────────────────────────────────────────────
  const agentNames = AGENT_DEFINITIONS.map((definition) => definition.agentName);

  const lastAgentRuns: Record<string, AgentRunSummary | null> = {};

  if (dbConnected) {
    await Promise.all(
      agentNames.map(async (name) => {
        try {
          const run = await db.agentRun.findFirst({
            where: { agentName: name },
            orderBy: { startedAt: "desc" },
            select: { status: true, startedAt: true, completedAt: true, durationMs: true },
          });
          lastAgentRuns[name] = run
            ? {
                status: run.status,
                startedAt: run.startedAt.toISOString(),
                completedAt: run.completedAt?.toISOString() ?? null,
                durationMs: run.durationMs,
              }
            : null;
        } catch {
          lastAgentRuns[name] = null;
        }
      })
    );
  } else {
    for (const name of agentNames) {
      lastAgentRuns[name] = null;
    }
  }

  // ── Build metadata (written to .env by deploy workflow) ─────────────────
  // These env vars are non-secret and safe to return.
  const gitCommit = process.env.GIT_COMMIT_SHA ?? null;
  const buildTimestamp = process.env.BUILD_TIMESTAMP ?? null;

  // ── App version from package.json ───────────────────────────────────────
  const appVersion: string | null = process.env.npm_package_version ?? null;

  // ── Mode flags (no secret values returned) ──────────────────────────────
  const generationMode = env.PRACTICE_GENERATION_MODE ?? "placeholder";
  const openaiKeyPresent = Boolean(env.OPENAI_API_KEY);
  const emailSendingEnabled = env.EMAIL_SENDING_ENABLED === "true";
  const emailMode: "LIVE" | "LOG_ONLY" = emailSendingEnabled ? "LIVE" : "LOG_ONLY";
  const socialPublishingEnabled = env.SOCIAL_PUBLISHING_ENABLED === "true";
  const configuredSocialProviders = getConfiguredSocialProviders();

  return {
    checkedAt,
    gitCommit,
    buildTimestamp,
    appVersion,
    dbConnected,
    generationMode,
    openaiKeyPresent,
    emailMode,
    emailSendingEnabled,
    socialPublishingEnabled,
    configuredSocialProviders,
    lastAgentRuns,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await buildDeployStatusReport(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
