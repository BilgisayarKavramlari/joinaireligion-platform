export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { authorizeAdminPost } from "@/lib/admin-post";
import { runSocialListenerDraft, runSocialPublisher } from "@/lib/growth-agents/runners";
import { launchReflectionCompanionCampaign } from "@/lib/reflection-launch";

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeAdminPost(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const now = new Date();
  const content = await launchReflectionCompanionCampaign(now);
  const socialPackage = await runSocialListenerDraft(now, { contentItemId: content.contentItem.id });
  const artifactId = typeof socialPackage.output.artifactId === "string" ? socialPackage.output.artifactId : undefined;
  const socialPublication = artifactId
    ? await runSocialPublisher(now, { forceRetryFailedProviders: true, artifactId })
    : { ok: true, skipped: true, reason: "launch_social_package_missing" };

  return NextResponse.json(
    {
      ok: true,
      safeguards: {
        explicitOwnerScope: true,
        publicProductCopyOnly: true,
        localeCoverage: 8,
        configuredProvidersOnly: true,
        noAdSpend: true,
        noEngagementActions: true,
        idempotent: true,
      },
      stages: { content, socialPackage, socialPublication },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
