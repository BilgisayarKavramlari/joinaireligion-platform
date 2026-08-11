import crypto from "crypto";
import {
  publishBloggerArticle,
  publishTumblrArticle,
} from "@/lib/distribution/http-providers";
import {
  assertDistributionProviderEnabled,
  distributionProviderReadiness,
} from "@/lib/distribution/providers";
import {
  assertDistributionArticle,
  type DistributionArticle,
  type DistributionProviderName,
  type DistributionPublicationResult,
  type FetchLike,
} from "@/lib/distribution/types";

type RuntimeEnv = Record<string, string | undefined>;

export const DISTRIBUTION_RUNTIME_PROVIDER_ORDER = [
  "blogger",
  "tumblr",
] as const satisfies readonly DistributionProviderName[];

export type DistributionRuntimeProviderName = (typeof DISTRIBUTION_RUNTIME_PROVIDER_ORDER)[number];

export type DistributionStoredDelivery = {
  contentFingerprint: string;
  state: "IN_FLIGHT" | "PUBLISHED" | "AMBIGUOUS";
  attemptedAt: string;
  externalId?: string;
  externalUrl?: string | null;
  error?: string;
};

export type DistributionDeliveryClaim =
  | { status: "CLAIMED" }
  | { status: "EXISTING"; delivery: DistributionStoredDelivery };

/**
 * Claims must be atomic and persistent. Provider insert endpoints do not share
 * one portable idempotency protocol, so an in-flight or uncertain delivery is
 * never retried automatically.
 */
export interface DistributionDeliveryStore {
  claim(deliveryKey: string, contentFingerprint: string, attemptedAt: string): Promise<DistributionDeliveryClaim>;
  resolve(deliveryKey: string, delivery: DistributionStoredDelivery): Promise<void>;
}

export type DistributionDispatchDelivery = {
  provider: DistributionRuntimeProviderName;
  status: "PUBLISHED" | "REUSED" | "BLOCKED" | "AMBIGUOUS";
  attemptedAt: string;
  externalId?: string;
  externalUrl?: string | null;
  missing?: string[];
  reason?: string;
  error?: string;
};

export type DistributionRuntimeDependencies = {
  deliveryStore: DistributionDeliveryStore;
  fetchImpl?: FetchLike;
};

function setting(runtimeEnv: RuntimeEnv, key: string): string {
  const value = runtimeEnv[key]?.trim();
  if (!value) throw new Error(`Missing required distribution setting: ${key}`);
  return value;
}

function safeRuntimeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(?:access|refresh|client|consumer|token|secret|key)[_-]?[A-Za-z0-9]*[=:]\S+/gi, "[redacted-secret]")
    .slice(0, 500);
}

function contentFingerprint(article: DistributionArticle): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    idempotencyKey: article.idempotencyKey,
    title: article.title,
    summary: article.summary,
    bodyMarkdown: article.bodyMarkdown,
    canonicalUrl: article.canonicalUrl,
    locale: article.locale,
    tags: article.tags,
    imageUrl: article.imageUrl,
    publishedAt: article.publishedAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  })).digest("hex");
}

function deliveryKey(provider: DistributionRuntimeProviderName, article: DistributionArticle): string {
  return crypto.createHash("sha256").update(`distribution|${provider}|${article.idempotencyKey}`).digest("hex");
}

async function publishThroughProvider(
  provider: DistributionRuntimeProviderName,
  article: DistributionArticle,
  runtimeEnv: RuntimeEnv,
  dependencies: DistributionRuntimeDependencies,
): Promise<DistributionPublicationResult> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  switch (provider) {
    case "blogger":
      return publishBloggerArticle(article, {
        blogId: setting(runtimeEnv, "BLOGGER_BLOG_ID"),
        clientId: setting(runtimeEnv, "BLOGGER_CLIENT_ID"),
        clientSecret: setting(runtimeEnv, "BLOGGER_CLIENT_SECRET"),
        refreshToken: setting(runtimeEnv, "BLOGGER_REFRESH_TOKEN"),
      }, fetchImpl);
    case "tumblr":
      return publishTumblrArticle(article, {
        consumerKey: setting(runtimeEnv, "TUMBLR_CONSUMER_KEY"),
        consumerSecret: setting(runtimeEnv, "TUMBLR_CONSUMER_SECRET"),
        accessToken: setting(runtimeEnv, "TUMBLR_ACCESS_TOKEN"),
        tokenSecret: setting(runtimeEnv, "TUMBLR_TOKEN_SECRET"),
        blogIdentifier: setting(runtimeEnv, "TUMBLR_BLOG_IDENTIFIER"),
      }, fetchImpl);
  }
}

export async function dispatchDistributionArticle(input: {
  article: DistributionArticle;
  dependencies: DistributionRuntimeDependencies;
  runtimeEnv?: RuntimeEnv;
  providers?: readonly DistributionRuntimeProviderName[];
  now?: Date;
}): Promise<{ configuredProviders: DistributionRuntimeProviderName[]; deliveries: DistributionDispatchDelivery[] }> {
  assertDistributionArticle(input.article);
  const runtimeEnv = input.runtimeEnv ?? process.env;
  const now = input.now ?? new Date();
  const readiness = distributionProviderReadiness(runtimeEnv);
  const readinessByProvider = new Map(readiness.map((entry) => [entry.provider, entry]));
  const requested = input.providers ? new Set(input.providers) : null;
  const configuredProviders = DISTRIBUTION_RUNTIME_PROVIDER_ORDER.filter((provider) => {
    if (requested) return requested.has(provider);
    return readinessByProvider.get(provider)?.enabled === true;
  });
  const fingerprint = contentFingerprint(input.article);
  const deliveries: DistributionDispatchDelivery[] = [];

  for (const provider of configuredProviders) {
    const attemptedAt = now.toISOString();
    const providerReadiness = readinessByProvider.get(provider);
    try {
      assertDistributionProviderEnabled(provider, runtimeEnv);
    } catch (error) {
      deliveries.push({
        provider,
        status: "BLOCKED",
        attemptedAt,
        missing: providerReadiness?.missing ?? [],
        reason: "provider_disabled_or_incomplete",
        error: safeRuntimeError(error),
      });
      continue;
    }

    const key = deliveryKey(provider, input.article);
    const claim = await input.dependencies.deliveryStore.claim(key, fingerprint, attemptedAt);
    if (claim.status === "EXISTING") {
      if (claim.delivery.contentFingerprint !== fingerprint) {
        deliveries.push({ provider, status: "BLOCKED", attemptedAt, reason: "idempotency_key_reused_for_different_content" });
      } else if (claim.delivery.state === "PUBLISHED" && claim.delivery.externalId) {
        deliveries.push({
          provider,
          status: "REUSED",
          attemptedAt,
          externalId: claim.delivery.externalId,
          externalUrl: claim.delivery.externalUrl ?? null,
          reason: "already_published",
        });
      } else {
        deliveries.push({
          provider,
          status: "BLOCKED",
          attemptedAt,
          reason: claim.delivery.state === "AMBIGUOUS" ? "manual_reconciliation_required" : "delivery_in_flight",
        });
      }
      continue;
    }

    let result: DistributionPublicationResult;
    try {
      result = await publishThroughProvider(provider, input.article, runtimeEnv, input.dependencies);
    } catch (error) {
      const safeError = safeRuntimeError(error);
      let statePersisted = true;
      try {
        await input.dependencies.deliveryStore.resolve(key, {
          contentFingerprint: fingerprint,
          state: "AMBIGUOUS",
          attemptedAt,
          error: safeError,
        });
      } catch {
        // The original persistent claim remains IN_FLIGHT, which is fail-closed
        // and blocks another insert until an operator reconciles the provider.
        statePersisted = false;
      }
      deliveries.push({
        provider,
        status: "AMBIGUOUS",
        attemptedAt,
        reason: statePersisted ? "manual_reconciliation_required" : "delivery_state_persistence_failed",
        error: safeError,
      });
      continue;
    }

    const stored: DistributionStoredDelivery = {
      contentFingerprint: fingerprint,
      state: "PUBLISHED",
      attemptedAt,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
    };
    try {
      await input.dependencies.deliveryStore.resolve(key, stored);
    } catch (error) {
      // Do not perform a second brittle write after the provider has accepted
      // the insert. The IN_FLIGHT claim deliberately blocks blind retry.
      deliveries.push({
        provider,
        status: "AMBIGUOUS",
        attemptedAt,
        reason: "delivery_result_persistence_failed",
        error: safeRuntimeError(error),
      });
      continue;
    }
    deliveries.push({
      provider,
      status: "PUBLISHED",
      attemptedAt,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
    });
  }

  return { configuredProviders: [...configuredProviders], deliveries };
}
