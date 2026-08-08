/**
 * GET /api/cron/autonomy-health
 *
 * Read-only operations endpoint for the scheduled health probe. The admin
 * endpoint remains session-only; this route accepts only the exact cron token.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildAutonomyHealthReport } from "@/app/api/admin/autonomy/health/route";
import { env } from "@/lib/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await buildAutonomyHealthReport(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
