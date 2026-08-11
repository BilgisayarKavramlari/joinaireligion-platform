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
| X | Brand account tab exists but its public handle is not independently verified | Text adapter and secret-safe readiness preflight exist behind `X_PUBLISHING_ENABLED`; credentials absent; no live Post or billing action was performed | Verify the brand handle, then approve pay-per-use credits/spend limit, owner-context credentials, and one URL-free text canary |
| LinkedIn | Live organization Page: `joinaireligion`; organization ID `143125933`; the personal account is retained only as the non-public administrator; one public Page-authored UI post is verified | Text adapter exists behind `LINKEDIN_PUBLISHING_ENABLED`; organization author URN is known, but the provider remains disabled and OAuth credentials are absent; the UI post is not API-delivery evidence | Create and Page-verify the developer app, obtain Community Management access, complete organization-scoped OAuth, then verify one API-authored canary post |
| Threads | Live: `@joinaireligion` | Live text publishing verified; profile setup is incomplete | Bounded retry, token-expiry monitoring, and profile completion |
| TikTok | Not opened | Standalone Direct Post safety module and tests exist, but it is not connected to the scheduled text publisher or production secrets | Decide whether a broad-audience TikTok product is justified; if so, create the brand account/app, approve OAuth and URL ownership, test `SELF_ONLY`, and retain required per-post human consent |
| Open distribution (12 channels) | No verified external accounts, approvals, credentials, or live publications | Flipboard feed metadata plus DEV, Apple News, Blogger, Tumblr, Hashnode, Ghost, LINE, Lemmy, MediaWiki, Fandom, and Nostr adapters are implemented behind independent default-off gates | Follow [open distribution onboarding](./open-distribution-onboarding.md), complete one provider gate at a time, then externally verify a single canary |

## Release rule

Each platform is independent. Missing or failed providers do not pause providers that have passed their canary. A provider is added to scheduled publishing only after its public identifier is confirmed, its scoped credential is stored only in the production secret store, its provider switch is explicitly enabled, and one delivery result is externally verified.

Threads canary verification: `https://www.threads.com/@joinaireligion/post/DbZapNrgKm6`.

LinkedIn Page-authorship verification (manual UI post; not an API canary): `https://www.linkedin.com/feed/update/urn:li:share:7492772987650134016/`.

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
| 1 | LinkedIn organization | Organization Page and public identifier, text-post adapter, locale copy, provider gating, idempotency, delivery logs | Resolve the LinkedIn developer-portal app-name validation failure observed in two signed-in browser surfaces on 2026-08-10; then Page-verify the app, approve Community Management access and organization OAuth |
| 2 | Pinterest | Image Pin adapter, locale copy, generated media, provider gating, delivery logs | Obtain Standard access, production board/token, approve one public canary |
| 3 | YouTube | Internal reviewed MP4 pipeline, Media RSS, video sitemap | Create/verify Cloud project and OAuth consent; upload adapter remains to be implemented before private canary |
| Parallel 4+ | X | Text adapter, provider gate, owner-context OAuth 1.0a support, secret-safe readiness preflight, and boundary tests | Verify the brand handle/recovery/2FA, accept the developer terms, approve prepaid credits plus a hard spend limit, store credentials, and approve one URL-free text canary |
| Parallel 4+ | TikTok | Standalone creator-info, Direct Post init/status, consent/compliance, error classification, and idempotency safety module | A private `SELF_ONLY` canary still needs an eligible product, app, `video.publish` OAuth, verified URL ownership, and per-post user consent; public posting additionally needs TikTok audit approval |
| Parallel open | Flipboard + DEV + Apple News + Blogger + Tumblr + Hashnode + Ghost + LINE + Lemmy + MediaWiki/Fandom + Nostr | Secret-free adapters, independent gates, canonical-source handling, AI disclosure, community locks, Nostr external signer boundary, and readiness preflight | Provider-specific account/approval/OAuth/payment/key-custody gates and one externally verified canary per provider |
