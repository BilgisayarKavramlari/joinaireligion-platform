# First-party growth analytics

## Purpose

The existing `content-performance` agent runs at 04:30 UTC. It now combines:

- cookie-free public page-view and link-click events;
- daily sessions derived from a server-side, daily rotating HMAC;
- minimized UTM source, medium and campaign labels;
- referrer hostname only, never the full referring URL;
- optional country code from an explicitly trusted infrastructure header;
- aggregate counters for owned social posts; and
- a protected `/admin/growth` dashboard plus a daily admin email when email delivery is enabled.

No raw IP, analytics user-agent, URL query string, private user text, social user identity, or cross-day visitor profile is stored. Browser Do Not Track and Global Privacy Control signals disable the client event sender. Raw analytics events are deleted after 90 days; aggregate daily reports remain in `AgentArtifact` for trend comparisons.

## Attribution contract

New social draft packages add these labels to each provider-specific content URL:

```text
utm_source=<provider>
utm_medium=social
utm_campaign=organic_reflection_<utc-date>
```

Only the allowlisted, normalized label values are stored. Search terms and `utm_content` are intentionally excluded because they can carry sensitive text. Existing posts without UTM labels can still be classified from a minimized referrer hostname when the browser supplies one.

## Feedback guardrails

Measured locale feedback may change a provider's locale choice only when the preceding 30 days contain at least 20 attributable sessions for that provider, the leading locale has at least 60% of those sessions, and it leads the runner-up by at least 25%. Below those thresholds, the stable configured language policy remains in force. No belief, journal, prompt, demographic, or user-level behavior enters this decision.

## Country reporting

Country reporting fails closed. `ANALYTICS_TRUSTED_COUNTRY_HEADERS=true` may be enabled only when the origin is protected against clients spoofing the chosen infrastructure header. The endpoint accepts `CF-IPCountry` or `X-Vercel-IP-Country` after that switch is enabled. The admin dashboard suppresses country groups below five daily sessions.

The current direct VPS/Nginx origin does not provide a trusted country header. Leave the switch unset until either:

1. the domain is proxied through Cloudflare and direct-origin access is restricted; or
2. a locally maintained GeoLite country database is installed and Nginx is configured to overwrite, rather than forward, the country header.

## Daily verification

1. Confirm `/api/health` is HTTP 200.
2. Open two public pages in a browser without Do Not Track enabled.
3. Confirm `/admin/growth` shows the page views and one daily session.
4. Run the content-performance agent and confirm a `DAILY_GROWTH_REPORT` artifact exists.
5. Confirm the artifact contains `containsUserLevelData: false` and the privacy contract.
6. Confirm email delivery is `SENT` or deliberately `LOG_ONLY`.
