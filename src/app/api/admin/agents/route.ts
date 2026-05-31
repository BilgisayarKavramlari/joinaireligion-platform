export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getSessionFromCookie } from "@/lib/auth";
import { AUTONOMY_LEVELS, DECISION_LOG_CONTRACT, getAgentRegistrySnapshot } from "@/lib/agents";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`) {
    return true;
  }

  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
  return session?.role === "ADMIN";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agents = await getAgentRegistrySnapshot();

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      autonomyLevels: AUTONOMY_LEVELS,
      decisionLogContract: DECISION_LOG_CONTRACT,
      agents,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
