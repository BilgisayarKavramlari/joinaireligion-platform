import { DISTRIBUTION_PROVIDERS, type DistributionProviderName } from "@/lib/distribution/types";

type RuntimeEnv = Record<string, string | undefined>;

type ProviderSpec = {
  enabledKey: string;
  requiredKeys: readonly string[];
  requiredTrueKeys?: readonly string[];
  automation: "setup_then_unattended" | "approved_scope_only" | "external_signer";
};

const PROVIDER_SPECS: Record<DistributionProviderName, ProviderSpec> = {
  dev: { enabledKey: "DEV_PUBLISHING_ENABLED", requiredKeys: ["DEV_API_KEY"], automation: "setup_then_unattended" },
  appleNews: {
    enabledKey: "APPLE_NEWS_PUBLISHING_ENABLED",
    requiredKeys: ["APPLE_NEWS_CHANNEL_ID", "APPLE_NEWS_KEY_ID", "APPLE_NEWS_KEY_SECRET"],
    requiredTrueKeys: ["APPLE_NEWS_CHANNEL_APPROVED"],
    automation: "setup_then_unattended",
  },
  blogger: { enabledKey: "BLOGGER_PUBLISHING_ENABLED", requiredKeys: ["BLOGGER_CLIENT_ID", "BLOGGER_CLIENT_SECRET", "BLOGGER_REFRESH_TOKEN", "BLOGGER_BLOG_ID"], automation: "setup_then_unattended" },
  tumblr: { enabledKey: "TUMBLR_PUBLISHING_ENABLED", requiredKeys: ["TUMBLR_CONSUMER_KEY", "TUMBLR_CONSUMER_SECRET", "TUMBLR_ACCESS_TOKEN", "TUMBLR_TOKEN_SECRET", "TUMBLR_BLOG_IDENTIFIER"], automation: "setup_then_unattended" },
  hashnode: {
    enabledKey: "HASHNODE_PUBLISHING_ENABLED",
    requiredKeys: ["HASHNODE_PAT", "HASHNODE_PUBLICATION_ID"],
    requiredTrueKeys: ["HASHNODE_PRO_CONFIRMED"],
    automation: "setup_then_unattended",
  },
  ghost: { enabledKey: "GHOST_PUBLISHING_ENABLED", requiredKeys: ["GHOST_ADMIN_URL", "GHOST_ADMIN_API_KEY"], automation: "setup_then_unattended" },
  line: { enabledKey: "LINE_PUBLISHING_ENABLED", requiredKeys: ["LINE_CHANNEL_ACCESS_TOKEN"], automation: "setup_then_unattended" },
  lemmy: {
    enabledKey: "LEMMY_PUBLISHING_ENABLED",
    requiredKeys: ["LEMMY_INSTANCE_URL", "LEMMY_ACCESS_TOKEN", "LEMMY_COMMUNITY_ID"],
    requiredTrueKeys: ["LEMMY_COMMUNITY_APPROVED"],
    automation: "approved_scope_only",
  },
  mediawiki: {
    enabledKey: "MEDIAWIKI_PUBLISHING_ENABLED",
    requiredKeys: ["MEDIAWIKI_API_URL", "MEDIAWIKI_AUTHORIZATION", "MEDIAWIKI_TITLE_PREFIX"],
    requiredTrueKeys: ["MEDIAWIKI_COMMUNITY_APPROVED"],
    automation: "approved_scope_only",
  },
  fandom: {
    enabledKey: "FANDOM_PUBLISHING_ENABLED",
    requiredKeys: ["FANDOM_API_URL", "FANDOM_AUTHORIZATION", "FANDOM_TITLE_PREFIX"],
    requiredTrueKeys: ["FANDOM_COMMUNITY_APPROVED"],
    automation: "approved_scope_only",
  },
  nostr: {
    enabledKey: "NOSTR_PUBLISHING_ENABLED",
    requiredKeys: ["NOSTR_PUBLIC_KEY", "NOSTR_RELAYS"],
    requiredTrueKeys: ["NOSTR_EXTERNAL_SIGNER_CONFIRMED"],
    automation: "external_signer",
  },
};

export type DistributionProviderReadiness = {
  provider: DistributionProviderName;
  automation: ProviderSpec["automation"];
  enabled: boolean;
  ready: boolean;
  missing: string[];
};

export function distributionProviderReadiness(runtimeEnv: RuntimeEnv = process.env): DistributionProviderReadiness[] {
  const globallyEnabled = runtimeEnv.DISTRIBUTION_PUBLISHING_ENABLED === "true";
  return DISTRIBUTION_PROVIDERS.map((provider) => {
    const spec = PROVIDER_SPECS[provider];
    const missing = [
      ...spec.requiredKeys.filter((key) => !runtimeEnv[key]?.trim()),
      ...(spec.requiredTrueKeys || []).filter((key) => runtimeEnv[key] !== "true"),
    ];
    const providerEnabled = runtimeEnv[spec.enabledKey] === "true";
    return {
      provider,
      automation: spec.automation,
      enabled: globallyEnabled && providerEnabled,
      ready: globallyEnabled && providerEnabled && missing.length === 0,
      missing,
    };
  });
}

export function assertDistributionProviderEnabled(provider: DistributionProviderName, runtimeEnv: RuntimeEnv = process.env): void {
  const readiness = distributionProviderReadiness(runtimeEnv).find((entry) => entry.provider === provider);
  if (!readiness?.ready) throw new Error(`${provider} distribution is disabled or incomplete`);
}
