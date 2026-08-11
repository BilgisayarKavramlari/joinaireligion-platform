export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authorizeAdminPost } from "@/lib/admin-post";
import { runSocialPublisher } from "@/lib/growth-agents/runners";

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeAdminPost(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const result = await runSocialPublisher(new Date(), { forceRetryFailedProviders: true });
  return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
}
