export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { env } from "@/lib/env";
import { moderateReflectionTextResilient } from "@/lib/reflection-provider";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      safetyAvailable: false,
      moderationAvailable: false,
      activeBoundary: null,
      failureCode: "not_configured",
      httpStatus: null,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const result = await moderateReflectionTextResilient(
    env.OPENAI_API_KEY,
    "Routine Reflection Companion safety availability check.",
    "gpt-4o-mini",
  );
  return NextResponse.json({
    ok: result.ok,
    safetyAvailable: result.ok,
    moderationAvailable: result.ok && result.source === "moderation_api",
    activeBoundary: result.ok ? result.source : null,
    failureCode: result.ok ? result.primaryFailureCode || null : result.failureCode,
    httpStatus: result.ok ? (result.primaryFailureCode ? null : 200) : result.httpStatus,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
