import { PrismaDistributionDeliveryStore } from "@/lib/distribution/delivery-store";
import {
  dispatchDistributionArticle,
  type DistributionRuntimeDependencies,
  type DistributionRuntimeProviderName,
} from "@/lib/distribution/runtime";
import type { DistributionArticle } from "@/lib/distribution/types";

/**
 * Server-side entry point for a future bounded cron/route. All provider
 * switches remain default-off and persistent delivery claims are mandatory.
 */
export function runDistributionPublisher(input: {
  article: DistributionArticle;
  providers?: readonly DistributionRuntimeProviderName[];
  runtimeEnv?: Record<string, string | undefined>;
  dependencies?: Omit<DistributionRuntimeDependencies, "deliveryStore">;
  now?: Date;
}) {
  return dispatchDistributionArticle({
    article: input.article,
    providers: input.providers,
    runtimeEnv: input.runtimeEnv,
    now: input.now,
    dependencies: {
      ...input.dependencies,
      deliveryStore: new PrismaDistributionDeliveryStore(),
    },
  });
}
