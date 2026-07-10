export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { AUTONOMY_LEVELS, DECISION_LOG_CONTRACT, getAgentRegistrySnapshot } from "@/lib/agents";

async function isAuthorized(_request: NextRequest): Promise<boolean> {
  try {
    await requireAdminSession();
    return true;
  } catch {
    return false;
  }
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
