export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { authorizeAdminPost } from "@/lib/admin-post";
import {
  runContentPublisher,
  runSeoKulliyatDraft,
  runSocialListenerDraft,
  runSocialPublisher,
} from "@/lib/growth-agents/runners";

/**
 * Owner-triggered acceleration of the existing bounded distribution chain.
 * Every stage retains its own idempotency, independent safety gate, daily cap,
 * provider switches, delivery logs, and AgentRun audit record.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeAdminPost(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const now = new Date();
  const contentDraft = await runSeoKulliyatDraft(now);
  const contentPublication = await runContentPublisher(now);
  const socialPackage = await runSocialListenerDraft(now);
  const socialPublication = await runSocialPublisher(now, { forceRetryFailedProviders: true });

  return NextResponse.json(
    {
      ok: true,
      safeguards: {
        locales: ["en", "tr", "es", "de", "fr", "ar", "ru", "zh"],
        separateSiteVariants: true,
        dailyContentCapPreserved: true,
        independentPublicationGatePreserved: true,
        configuredProvidersOnly: true,
        engagementActionsDisabled: true,
      },
      stages: { contentDraft, contentPublication, socialPackage, socialPublication },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
