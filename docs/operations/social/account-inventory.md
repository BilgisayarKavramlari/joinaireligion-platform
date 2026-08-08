# Social account inventory

Last updated: 2026-08-08

This file stores public, non-secret account identifiers and connection state only. Passwords, tokens, recovery data, personal identity fields, and OAuth codes must never be written here.

| Platform | Public account state | Agent connection state | Next gate |
| --- | --- | --- | --- |
| Mastodon / MastoTurk | Live: `@joinaireligion@mastoturk.org`; 3 posts, 6 followers; last post 2026-07-30 | Live publishing verified | Bounded retry and delivery-health monitoring |
| Bluesky | Live: `joinaireligion.bsky.social`; 5 posts, 1 follower; last post 2026-07-30 | Live publishing verified | Bounded retry and app-password health |
| Pinterest | Public profile `joinaireligion` has no public Pins; Trial Access approved on 2026-07-29 | Image Pin adapter is implemented behind `PINTEREST_PUBLISHING_ENABLED`; public Standard-access activation is not verified | Obtain Standard access and production token/board, then run one public canary Pin |
| YouTube | `@JoinAIReligion`; channel ID `UCumLEY1yAl6SHoEISqVCO9Q`; no public videos | Internal site video pipeline is live; YouTube OAuth/upload adapter is not implemented | Google Cloud project, one-time OAuth, private canary upload, then public verification |
| Facebook | Live Page: `joinaireligion`; 1 follower; last visible activity 2026-07-29 | Live publishing verified; queue was blocked by a provider-failure deadlock | Bounded retry, stale-backlog suppression, and Page-token health |
| Instagram | Live Professional account: `joinaireligion`; 2 posts, 2 followers; both posts dated 2026-07-29 | Live image publishing verified; language policy v4 uses one multilingual account and a 4:5 code-generated visual preset | Bounded retry, profile link/bio completion, and 90-day aggregate format/language measurement |
| X | Brand account tab exists but its public handle is not independently verified | Text adapter exists behind `X_PUBLISHING_ENABLED`; credentials absent; owner deferred paid API access | Revisit only if pay-per-use API spending is approved |
| LinkedIn | No Join AI Religion organization Page verified | Text adapter exists behind `LINKEDIN_PUBLISHING_ENABLED`; credentials absent | Create organization Page and obtain Community Management access |
| Threads | Live: `@joinaireligion`; 3 posts, 0 followers; last post 2026-07-30 | Live text publishing verified; profile setup is incomplete | Bounded retry, token-expiry monitoring, and profile completion |
| TikTok | Not opened | Adapter not implemented | Create Business account, then Content Posting API review |

## Release rule

Each platform is independent. Missing or failed providers do not pause providers that have passed their canary. A provider is added to scheduled publishing only after its public identifier is confirmed, its scoped credential is stored only in the production secret store, its provider switch is explicitly enabled, and one delivery result is externally verified.

Threads canary verification: `https://www.threads.com/@joinaireligion/post/DbZapNrgKm6`.
