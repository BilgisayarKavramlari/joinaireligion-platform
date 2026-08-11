# Social account inventory

Last updated: 2026-08-11

This file stores public, non-secret account identifiers and connection state only. Passwords, tokens, recovery data, personal identity fields, and OAuth codes must never be written here.

| Platform | Public account state | Agent connection state | Next gate |
| --- | --- | --- | --- |
| Mastodon / MastoTurk | Live: `@joinaireligion@mastoturk.org` | Live publishing verified | Bounded retry and delivery-health monitoring |
| Bluesky | Live: `joinaireligion.bsky.social` | Live publishing verified | Bounded retry and app-password health |
| Pinterest | Public profile `joinaireligion` has no public Pins; Trial Access approved on 2026-07-29 | Image Pin adapter is implemented behind `PINTEREST_PUBLISHING_ENABLED`; public Standard-access activation is not verified | Obtain Standard access and production token/board, then run one public canary Pin |
| YouTube | `@JoinAIReligion`; channel ID `UCumLEY1yAl6SHoEISqVCO9Q`; no public videos | Internal site video pipeline is live; YouTube OAuth/upload adapter is not implemented | Google Cloud project, one-time OAuth, private canary upload, then public verification |
| Facebook | Live Page: `joinaireligion` | Live publishing verified | Bounded retry, stale-backlog suppression, and Page-token health |
| Instagram | Live Professional account: `joinaireligion` | Live image publishing verified; language policy v4 uses one multilingual account and a 4:5 code-generated visual preset | Bounded retry, profile link/bio completion, and 90-day aggregate format/language measurement |
| X | Brand account tab exists but its public handle is not independently verified | Text adapter exists behind `X_PUBLISHING_ENABLED`; credentials absent; owner deferred paid API access | Revisit only if pay-per-use API spending is approved |
| LinkedIn | No Join AI Religion organization Page verified | Text adapter exists behind `LINKEDIN_PUBLISHING_ENABLED`; credentials absent | Create organization Page and obtain Community Management access |
| Threads | Live: `@joinaireligion` | Live text publishing verified; profile setup is incomplete | Bounded retry, token-expiry monitoring, and profile completion |
| TikTok | Not opened | Adapter not implemented | Create Business account, then Content Posting API review |

## Release rule

Each platform is independent. Missing or failed providers do not pause providers that have passed their canary. A provider is added to scheduled publishing only after its public identifier is confirmed, its scoped credential is stored only in the production secret store, its provider switch is explicitly enabled, and one delivery result is externally verified.

Threads canary verification: `https://www.threads.com/@joinaireligion/post/DbZapNrgKm6`.

## Active autonomous distribution list

| Destination | Content form | Language handling | Human intervention after setup |
| --- | --- | --- | --- |
| Join AI Religion Insights | Full article plus feed and IndexNow notification | Eight separate variants: `en`, `tr`, `es`, `de`, `fr`, `ar`, `ru`, `zh` | None for passing low-risk content |
| Mastodon / MastoTurk | Text post and article link | Locale-specific post selected from the eight-draft package | None unless authorization fails |
| Bluesky | Text post and article link | Locale-specific post selected from the eight-draft package | None unless app-password authorization fails |
| Facebook Page | Link post | Locale-specific post selected from the eight-draft package | None unless Page authorization fails |
| Instagram | 4:5 generated card and caption | Locale-specific caption/card selected from the eight-draft package | None unless container or authorization fails |
| Threads | Text post and article link | Locale-specific post selected from the eight-draft package | None unless authorization fails |

All providers use one verified brand account. Separate language accounts are not created automatically; they require a real owner-controlled account and 90 days of aggregate evidence showing enough language-specific volume to justify the operational cost.

## Setup-required queue

| Priority | Destination | Already implemented | Next owner gate |
| --- | --- | --- | --- |
| 1 | LinkedIn organization | Text-post adapter, locale copy, provider gating, idempotency, delivery logs | Create/verify organization Page, approve Community Management access and OAuth |
| 2 | Pinterest | Image Pin adapter, locale copy, generated media, provider gating, delivery logs | Obtain Standard access, production board/token, approve one public canary |
| 3 | YouTube | Internal reviewed MP4 pipeline, Media RSS, video sitemap | Create/verify Cloud project and OAuth consent; upload adapter remains to be implemented before private canary |
| Deferred | X | Text adapter and provider gate | Approve paid API access and OAuth credentials |
| Deferred | TikTok | None | Create Business account and complete Content Posting API review after an adapter is built |
