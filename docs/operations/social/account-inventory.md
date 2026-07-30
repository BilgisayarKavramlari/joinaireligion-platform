# Social account inventory

Last updated: 2026-07-29

This file stores public, non-secret account identifiers and connection state only. Passwords, tokens, recovery data, personal identity fields, and OAuth codes must never be written here.

| Platform | Public account state | Agent connection state | Next gate |
| --- | --- | --- | --- |
| Mastodon / MastoTurk | Live: `@joinaireligion@mastoturk.org` | Live publishing verified | Routine token health only |
| Bluesky | Live: `joinaireligion.bsky.social` | Live publishing verified | Routine app-password health only |
| Pinterest | Public profile previously verified: `joinaireligion` | Image Pin adapter implemented and verified behind `PINTEREST_PUBLISHING_ENABLED`; credentials absent | Business-account check, Trial Access OAuth/demo, then Standard Access review |
| YouTube | Owner-created channel: `@JoinAIReligion`; channel ID `UCumLEY1yAl6SHoEISqVCO9Q` | Video pipeline and OAuth not implemented | Google Cloud project, API audit, one-time OAuth |
| Facebook | Live Page: `joinaireligion` | Live publishing verified | Routine Page-token health only |
| Instagram | Live Professional account: `joinaireligion` | Live image publishing verified | Routine Page-token and asset-link health only |
| X | Brand account tab exists but its public handle is not independently verified | Text adapter exists behind `X_PUBLISHING_ENABLED`; credentials absent; owner deferred paid API access | Revisit only if pay-per-use API spending is approved |
| LinkedIn | No Join AI Religion organization Page verified | Text adapter exists behind `LINKEDIN_PUBLISHING_ENABLED`; credentials absent | Create organization Page and obtain Community Management access |
| Threads | Live: `@joinaireligion` | Live text publishing verified; long-lived user token installed and hourly provider switch enabled | Routine token-expiry monitoring and refresh |
| TikTok | Not opened | Adapter not implemented | Create Business account, then Content Posting API review |

## Release rule

Each platform is independent. Missing or failed providers do not pause providers that have passed their canary. A provider is added to scheduled publishing only after its public identifier is confirmed, its scoped credential is stored only in the production secret store, its provider switch is explicitly enabled, and one delivery result is externally verified.

Threads canary verification: `https://www.threads.com/@joinaireligion/post/DbZapNrgKm6`.
