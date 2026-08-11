# Social account inventory

Last updated: 2026-08-11

This file stores public, non-secret account identifiers and connection state only. Passwords, tokens, recovery data, personal identity fields, and OAuth codes must never be written here.

| Platform | Public account state | Agent connection state | Next gate |
| --- | --- | --- | --- |
| Mastodon / MastoTurk | Live: `@joinaireligion@mastoturk.org` | Live publishing verified | Bounded retry and delivery-health monitoring |
| Bluesky | Live: `joinaireligion.bsky.social` | Live publishing verified | Bounded retry and app-password health |
| Pinterest | Public profile `joinaireligion` has no public Pins; Trial Access was recorded on 2026-07-29, but the current developer-portal session is the owner's personal account rather than the brand account | Image Pin adapter is implemented behind `PINTEREST_PUBLISHING_ENABLED`; public Standard-access activation is not verified | Sign in or switch to the brand account first, reverify the recorded app/access state, then obtain any required Standard access and production token/board before one public canary Pin |
| YouTube | `@JoinAIReligion`; channel ID `UCumLEY1yAl6SHoEISqVCO9Q`; no public videos | Internal site video pipeline is live; YouTube OAuth/upload adapter is not implemented | Google Cloud project, one-time OAuth, private canary upload, then public verification |
| Facebook | Live Page: `joinaireligion` | Live publishing verified | Bounded retry, stale-backlog suppression, and Page-token health |
| Instagram | Live Professional account: `joinaireligion` | Live image publishing verified; language policy v4 uses one multilingual account and a 4:5 code-generated visual preset | Bounded retry, profile link/bio completion, and 90-day aggregate format/language measurement |
| X | Brand account tab exists but its public handle is not independently verified | Text adapter and secret-safe readiness preflight exist behind `X_PUBLISHING_ENABLED`; credentials absent; no live Post or billing action was performed | Verify the brand handle, then approve pay-per-use credits/spend limit, owner-context credentials, and one URL-free text canary |
| LinkedIn | Live organization Page: `joinaireligion`; organization ID `143125933`; the personal account is retained only as the non-public administrator; one public Page-authored UI post is verified | Text adapter exists behind `LINKEDIN_PUBLISHING_ENABLED`; organization author URN is known, but the provider remains disabled and OAuth credentials are absent; the developer-app form is prepared but not submitted because its logo upload and legal acceptance require the owner | Upload the brand logo, review and accept LinkedIn's API terms, create and Page-verify the app, obtain Community Management access, complete organization-scoped OAuth, then verify one API-authored canary post |
| Threads | Live: `@joinaireligion`; public profile, avatar, bio, and current article activity are verified | Live text publishing verified; the remaining onboarding suggestion is only to follow additional accounts and is intentionally not automated | Bounded retry and token-expiry monitoring |
| TikTok | Not opened | Standalone Direct Post safety module and tests exist, but it is not connected to the scheduled text publisher or production secrets | Decide whether a broad-audience TikTok product is justified; if so, create the brand account/app, approve OAuth and URL ownership, test `SELF_ONLY`, and retain required per-post human consent |
| DEV Community | Google-linked brand account `joinaireligionofficial` is signed in; brand image, website, and technical profile copy are configured, while the earlier `joinaireligion` account remains untouched | The new account is currently hidden by DEV's spam/suspension gate: its public profile returns 404 and API-key creation is rejected by the server; no key or article has been created | Ask DEV support to review and restore the account, then generate a narrowly named API key, store it directly in the production secret store, and verify one reviewed English technical canary |
| Tumblr | Live primary blog: `joinaireligion`; one English public canary with source card, tags, and AI-assistance disclosure is externally verified; the private connection-test draft remains unpublished | OAuth1 owner authorization and API identity are verified; credentials are held only in macOS Keychain and production publishing remains disabled | Move credentials directly to the VPS secret store, run the updated adapter against a separate reviewed draft, then enable scheduled publishing only after API-delivery verification |
| Blogger | Live public blog: `joinaireligion.blogspot.com`; blog ID `1588035709250383097`; one English public canary with source link and AI-assistance disclosure is externally verified | The Blogger v3 adapter exists, but runtime dispatch, Google OAuth client/consent, offline refresh token, and production secrets are not connected | Complete owner-authorized Google OAuth, store the refresh token directly in the production secret store, connect the provider to the runtime dispatcher, and verify one API-created draft before enabling scheduled publication |
| Flipboard | No brand profile or public Flipboard item is verified; the public Publisher signup page currently states that new Publisher applications are not being accepted | The live RSS package satisfies the implemented feed metadata checks, but feed submission cannot proceed while Publisher intake is closed | Recheck Publisher intake later; a standard profile plus manual bookmarklet publication remains a separate fallback requiring brand-account authentication and cannot be reported as automated RSS distribution |
| Hashnode | No verified brand profile or public article | The adapter remains default-off because Hashnode moved GraphQL read/write access to Pro; the paid upgrade is intentionally deferred | Keep API automation disabled under the free-only rule; revisit only if the pricing policy changes or a deliberately manual free-profile pilot is approved |
| Open distribution remainder (7 channels) | No verified external accounts, approvals, credentials, or live publications | Apple News, Ghost, LINE, Lemmy, MediaWiki, Fandom, and Nostr adapters are implemented behind independent default-off gates | Follow [open distribution onboarding](./open-distribution-onboarding.md), complete one provider gate at a time, then externally verify a single canary |

## Release rule

Each platform is independent. Missing or failed providers do not pause providers that have passed their canary. A provider is added to scheduled publishing only after its public identifier is confirmed, its scoped credential is stored only in the production secret store, its provider switch is explicitly enabled, and one delivery result is externally verified.

Threads canary verification: `https://www.threads.com/@joinaireligion/post/DbZapNrgKm6`.

LinkedIn Page-authorship verification (manual UI post; not an API canary): `https://www.linkedin.com/feed/update/urn:li:share:7492772987650134016/`.

Blogger public canary verification: `https://joinaireligion.blogspot.com/2026/08/boundaries-for-responsible-ai-guided.html`.

Tumblr public canary verification: `https://www.tumblr.com/joinaireligion/824627854353580032/boundaries-for-responsible-ai-guided-reflection`.

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
| 1 | LinkedIn organization | Organization Page and public identifier, text-post adapter, locale copy, provider gating, idempotency, delivery logs; developer-app name, Page, and privacy-policy fields are prepared | Owner uploads the brand logo and accepts LinkedIn's API terms; then Page-verify the app, approve Community Management access and organization OAuth |
| 2 | Pinterest | Image Pin adapter, locale copy, generated media, provider gating, delivery logs | Switch the developer portal from the owner's personal account to the brand account, reverify prior Trial Access, then obtain Standard access and production board/token before one public canary |
| 3 | YouTube | Internal reviewed MP4 pipeline, Media RSS, video sitemap | Create/verify Cloud project and OAuth consent; upload adapter remains to be implemented before private canary |
| Parallel 4+ | X | Text adapter, provider gate, owner-context OAuth 1.0a support, secret-safe readiness preflight, and boundary tests | Verify the brand handle/recovery/2FA, accept the developer terms, approve prepaid credits plus a hard spend limit, store credentials, and approve one URL-free text canary |
| Parallel 4+ | TikTok | Standalone creator-info, Direct Post init/status, consent/compliance, error classification, and idempotency safety module | A private `SELF_ONLY` canary still needs an eligible product, app, `video.publish` OAuth, verified URL ownership, and per-post user consent; public posting additionally needs TikTok audit approval |
| Parallel open | Flipboard + DEV + Apple News + Blogger + Tumblr + Hashnode + Ghost + LINE + Lemmy + MediaWiki/Fandom + Nostr | Secret-free adapters, independent gates, canonical-source handling, AI disclosure, community locks, Nostr external signer boundary, and readiness preflight | Provider-specific account/approval/OAuth/payment/key-custody gates and one externally verified canary per provider |
