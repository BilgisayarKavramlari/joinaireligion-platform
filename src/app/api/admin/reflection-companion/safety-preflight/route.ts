export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { env } from "@/lib/env";
import { moderateReflectionText } from "@/lib/reflection-provider";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      moderationAvailable: false,
      failureCode: "not_configured",
      httpStatus: null,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const result = await moderateReflectionText(
    env.OPENAI_API_KEY,
    "Routine Reflection Companion safety availability check.",
  );
  return NextResponse.json({
    ok: result.ok,
    moderationAvailable: result.ok,
    failureCode: result.ok ? null : result.failureCode,
    httpStatus: result.ok ? 200 : result.httpStatus,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
