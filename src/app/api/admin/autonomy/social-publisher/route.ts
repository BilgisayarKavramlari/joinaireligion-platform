export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { runSocialPublisher } from "@/lib/growth-agents/runners";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    return NextResponse.json(
      { error: message === "FORBIDDEN_ADMIN" ? "Forbidden" : "Unauthorized" },
      { status: message === "FORBIDDEN_ADMIN" ? 403 : 401 },
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const result = await runSocialPublisher(new Date(), { forceRetryFailedProviders: true });
  return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
}
