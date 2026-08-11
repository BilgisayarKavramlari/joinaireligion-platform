#!/usr/bin/env node

const specs = {
  flipboard: { enabledKey: "FLIPBOARD_PUBLISHING_ENABLED", fields: [], trueFields: ["FLIPBOARD_SUBMISSION_APPROVED"], mode: "rss_after_publisher_approval" },
  dev: { enabledKey: "DEV_PUBLISHING_ENABLED", fields: ["DEV_API_KEY"], mode: "setup_then_unattended" },
  appleNews: { enabledKey: "APPLE_NEWS_PUBLISHING_ENABLED", fields: ["APPLE_NEWS_CHANNEL_ID", "APPLE_NEWS_KEY_ID", "APPLE_NEWS_KEY_SECRET"], trueFields: ["APPLE_NEWS_CHANNEL_APPROVED"], mode: "setup_then_unattended" },
  blogger: { enabledKey: "BLOGGER_PUBLISHING_ENABLED", fields: ["BLOGGER_CLIENT_ID", "BLOGGER_CLIENT_SECRET", "BLOGGER_REFRESH_TOKEN", "BLOGGER_BLOG_ID"], mode: "refreshing_oauth_setup_then_unattended" },
  tumblr: { enabledKey: "TUMBLR_PUBLISHING_ENABLED", fields: ["TUMBLR_CONSUMER_KEY", "TUMBLR_CONSUMER_SECRET", "TUMBLR_ACCESS_TOKEN", "TUMBLR_TOKEN_SECRET", "TUMBLR_BLOG_IDENTIFIER"], mode: "oauth1_owner_setup_then_unattended" },
  hashnode: { enabledKey: "HASHNODE_PUBLISHING_ENABLED", fields: ["HASHNODE_PAT", "HASHNODE_PUBLICATION_ID"], trueFields: ["HASHNODE_PRO_CONFIRMED"], mode: "paid_setup_then_unattended" },
  ghost: { enabledKey: "GHOST_PUBLISHING_ENABLED", fields: ["GHOST_ADMIN_URL", "GHOST_ADMIN_API_KEY"], mode: "setup_then_unattended" },
  line: { enabledKey: "LINE_PUBLISHING_ENABLED", fields: ["LINE_CHANNEL_ACCESS_TOKEN"], mode: "opt_in_broadcast_only" },
  lemmy: { enabledKey: "LEMMY_PUBLISHING_ENABLED", fields: ["LEMMY_INSTANCE_URL", "LEMMY_ACCESS_TOKEN", "LEMMY_COMMUNITY_ID"], trueFields: ["LEMMY_COMMUNITY_APPROVED"], mode: "approved_community_only" },
  mediawiki: { enabledKey: "MEDIAWIKI_PUBLISHING_ENABLED", fields: ["MEDIAWIKI_API_URL", "MEDIAWIKI_AUTHORIZATION", "MEDIAWIKI_TITLE_PREFIX"], trueFields: ["MEDIAWIKI_COMMUNITY_APPROVED"], mode: "owned_or_approved_wiki_only" },
  fandom: { enabledKey: "FANDOM_PUBLISHING_ENABLED", fields: ["FANDOM_API_URL", "FANDOM_AUTHORIZATION", "FANDOM_TITLE_PREFIX"], trueFields: ["FANDOM_COMMUNITY_APPROVED"], mode: "approved_fandom_community_only" },
  nostr: { enabledKey: "NOSTR_PUBLISHING_ENABLED", fields: ["NOSTR_PUBLIC_KEY", "NOSTR_RELAYS"], trueFields: ["NOSTR_EXTERNAL_SIGNER_CONFIRMED"], mode: "external_signer_two_relay_minimum" },
};

const args = process.argv.slice(2);
const providerIndex = args.indexOf("--provider");
const selected = providerIndex >= 0 ? args[providerIndex + 1] : null;
if (selected && !specs[selected]) {
  process.stderr.write(`Unknown provider: ${selected}\n`);
  process.exit(2);
}

const globallyEnabled = process.env.DISTRIBUTION_PUBLISHING_ENABLED === "true";
const reports = Object.entries(specs)
  .filter(([provider]) => !selected || provider === selected)
  .map(([provider, spec]) => {
    const missing = [
      ...spec.fields.filter((key) => !process.env[key]?.trim()),
      ...(spec.trueFields || []).filter((key) => process.env[key] !== "true"),
    ];
    const providerEnabled = process.env[spec.enabledKey] === "true";
    return {
      provider,
      mode: spec.mode,
      globallyEnabled,
      providerEnabled,
      ready: globallyEnabled && providerEnabled && missing.length === 0,
      missing,
      allowedActions: provider === "line" ? ["broadcast_to_opted_in_friends"] : provider === "lemmy" ? ["create_post_in_approved_community"] : provider === "mediawiki" || provider === "fandom" ? ["create_or_revision_guarded_edit_in_approved_wiki"] : ["publish_reviewed_public_content"],
      prohibitedActions: ["account_creation", "terms_acceptance", "payment", "oauth_grant", "reply", "direct_message", "like", "follow", "vote", "ad_spend", "sensitive_targeting"],
    };
  });

const report = {
  ready: reports.every((entry) => entry.ready),
  feed: { url: "https://joinaireligion.com/feed.xml", flipboardMetadataImplemented: true },
  providers: reports,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (args.includes("--require-ready") && !report.ready) process.exitCode = 1;
