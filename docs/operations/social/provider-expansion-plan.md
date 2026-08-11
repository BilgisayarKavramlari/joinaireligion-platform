# Social provider expansion plan

Status: active provider rollout; live state re-audited
Audit date: 2026-08-11
Production release observed: `90f2af2`

## Verified current state

| Component/provider | State | Evidence and boundary |
| --- | --- | --- |
| Public social listener | `LIVE` | Registry schedule is every six hours; production timer is enabled and active. It stores aggregate counts/hashtags only. |
| Social composer | `DRAFT_ONLY` | Produces reviewed multilingual packages from published site content; production timer is enabled and active. |
| Bounded social publisher | `LIVE` | Production timer is enabled and active. A successful systemd result may also mean a safe skip, so provider delivery records/public posts are the publication evidence. |
| Mastodon / Mastoturk | Live publication verified | Public profile `https://mastoturk.org/@joinaireligion` existed with one post at the audit time. The adapter requires `MASTODON_BASE_URL` and `MASTODON_ACCESS_TOKEN`. |
| Bluesky | Live publication verified | Public profile `https://bsky.app/profile/joinaireligion.bsky.social` existed with English, French, and Chinese posts. The adapter requires `BLUESKY_SERVICE_URL`, `BLUESKY_IDENTIFIER`, and `BLUESKY_APP_PASSWORD`. |
| X | Adapter only; account not verified | The provider supports OAuth 1.0a owner tokens or `X_USER_ACCESS_TOKEN`; paid API access was deferred by the owner on 2026-07-29. |
| LinkedIn | Adapter only; live configuration not verified | The provider supports `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`, and `LINKEDIN_VERSION`. No production account/delivery evidence was available to the restricted deployment operator. |
| Pinterest | Public account exists; public profile has no Pins | Image Pin creation, locale-specific copy, social-card media, delivery records, and provider gating are implemented. Trial access is insufficient for public distribution; Standard access and production credentials remain the gate. |
| YouTube | Channel exists; external upload is not implemented | The internal video agent creates site-hosted MP4 editions, but no YouTube OAuth/upload adapter or verified public upload exists. |
| Facebook | Live publication verified; last visible activity was 2026-07-29 | Page link publishing is implemented through the Meta Graph API. Queue retry and backlog protection apply independently to Facebook. |
| Instagram | Live image publication verified; two posts, both dated 2026-07-29 | Professional-account image publishing, 4:5 social cards, container polling, permalink capture, and multilingual policy are implemented. |
| Threads | Live publication verified; three posts, last dated 2026-07-30 | Text-container publishing, status polling, permalink capture, and multilingual policy are implemented. |

Production secret values were deliberately not read. The deployment account is restricted to allowlisted status/deploy operations.

## Publication reliability correction

The 2026-08-08 audit found a queue head-of-line failure: a failed non-Mastodon delivery was never retried, the artifact remained `READY`, and the publisher selected that same oldest artifact on every hourly run. Daily composition also created repeated packages for the same latest article. The correction is intentionally provider-independent and backlog-safe.

Required behavior:

1. Retry every provider with a bounded 1h/6h schedule and a three-attempt budget.
2. Keep only the newest fresh package and archive older/superseded packages; packages older than 72 hours are explicitly marked stale.
3. Suppress publication when the same source item was already delivered to that provider from an earlier package.
4. Create at most one social package per published content item and order candidates by `publishedAt`.
5. Store provider, locale, policy version, attempt count, next retry, source item, and external delivery evidence.
6. Surface stuck-package age and configured-provider names in the authenticated autonomy health report.

Initial weights, subject to aggregate engagement review:

| Provider | Primary language policy |
| --- | --- |
| Mastoturk | Turkish-only while the account remains a Turkish community destination |
| Bluesky | Relative weights: English 75, Turkish 10, each remaining supported locale 3 |
| X | Relative weights: English 80, Turkish 10, each remaining supported locale 2 |
| LinkedIn | Relative weights: English 85, Turkish 5, each remaining supported locale 2 |
| Pinterest | English 80%, Turkish 8%, each remaining supported locale 2%; split into locale boards only after Standard access and measured volume |
| YouTube | English primary audio; localized captions, titles, descriptions, and playlists before separate-language channels |
| Facebook | Relative weights: English 70, Turkish 20, each remaining supported locale 2 |
| Instagram | English 70%, Turkish 18%, each remaining supported locale 2%; keep one account until a 90-day language cohort has enough volume to justify a split |
| Threads | Relative weights: English 75, Turkish 15, each remaining supported locale 2 |

## Minimum-interaction implementation order

### 1. LinkedIn organization publishing

Why first now: the text-post adapter, language-specific copy, idempotency, provider gate, and delivery records already exist. The remaining work is account ownership, product access, and one OAuth grant.

Single human gates: create/claim the organization Page, remain its verified super admin, create and associate the developer app, receive Community Management access, pass 2FA, and approve OAuth once.

Official reference: [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api).

### 2. Pinterest

Why second: the public profile and complete image Pin adapter already exist. Trial Access cannot support the public autonomous rollout; Standard Access, a production board/token, and one verified public canary are the remaining gates.

Single human gates: finish the provider access review, pass 2FA/OAuth, select the public board, and approve one canary Pin.

Official reference: [Pinterest API](https://developers.pinterest.com/docs/api/v5/).

### 3. YouTube

Why first: a dedicated brand Google identity can own the channel and the Cloud project, and one OAuth grant can support long-running uploads. It does not require the Facebook/Instagram asset linkage or LinkedIn organization API approval.

Minimum code slice:

- add a `youtube` provider and video delivery type rather than forcing video into the text-post interface;
- add resumable upload, metadata, thumbnail, playlist, caption, and idempotency support;
- keep uploads private during the canary gate, then make public only after the returned video and metadata pass validation;
- add `YOUTUBE_PUBLISHING_ENABLED`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, and `YOUTUBE_CHANNEL_ID` to the environment contract;
- store refresh-token expiry/revocation health without logging token values.

Single human gates: create/claim the brand channel, enable YouTube Data API, configure OAuth consent, complete any Google verification required for public uploads, pass CAPTCHA/2FA, and approve OAuth once.

Official references: [upload guide](https://developers.google.com/youtube/v3/guides/uploading_a_video), [`videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert).

### Completed: Meta — Facebook, Instagram, and Threads

Minimum code slice:

- add separate `facebook` and `instagram` providers behind `META_PUBLISHING_ENABLED` plus provider-specific switches;
- add Page post creation and Instagram media-container creation/status polling/publishing;
- add `META_GRAPH_VERSION`, `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, and `INSTAGRAM_USER_ID` to the environment contract;
- verify image/video dimensions before upload and record the creation container and final media IDs;
- never automate comments, direct messages, follows, or likes in this phase.

Single human gates: create/claim the Facebook Page, convert/create the Instagram Professional account, connect the assets, create the Meta app/business portfolio, complete business/app review when required, pass CAPTCHA/2FA, and grant the required Page/Instagram permissions once.

Official references: [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/), [Pages posts](https://developers.facebook.com/docs/pages-api/posts/).

All three provider adapters and production deliveries are verified. Future work is token health, delivery reliability, profile completion, and aggregate performance review—not new account creation.

## Safe ownership model

| Owner | Allowed responsibility | Never owns |
| --- | --- | --- |
| Human account owner | Terms acceptance, identity/business verification, CAPTCHA, 2FA, account recovery, developer-plan purchase, app review, one-time OAuth consent | Routine drafting, scheduling, retries, analytics collection |
| Account bootstrap task | Produces exact profile copy/assets/checklists and detects the next human gate | Password entry, CAPTCHA, identity claims, final account submission without action-time confirmation |
| Credential custodian | Places approved tokens only in the production secret store, rotates/revokes them, reports set/missing/expiry state | Printing tokens, committing `.env`, sharing a Google master password |
| Provider adapter agent | Implements secrets-free adapter code, mocks, validation, idempotency, error classification | Account creation, app-review assertions, production publishing switch |
| Social strategy agent | Maintains provider language weights and aggregate-performance rules | User profiling, private-message access, political/religious targeting |
| Safety/compliance reviewer | Rechecks public source, claims, AI disclosure, language, media rights, and provider policy | Editing provider credentials or bypassing a failed gate |
| Bounded publisher | Publishes approved packages to enabled providers and records delivery IDs | Replies, DMs, follows, likes, ad spend, unpublished source content |

## Google identity decision

Use one dedicated brand Google account as the ownership and recovery anchor where a provider offers Google sign-in, with a second human recovery administrator and hardware-backed 2FA. This reduces repeated signup work but does not replace each provider's API OAuth token, app review, scopes, or recovery process. Never store the Google master password or a reusable 2FA secret on the VPS; production receives only provider-scoped, revocable tokens.

## Release gates per provider

1. Adapter tests and provider sandbox/private-mode validation pass without real secret values in logs.
2. Human account/OAuth gate is completed once.
3. Credential custodian reports required names as set, never their values.
4. Provider switch is enabled for one private or low-risk canary item.
5. A separate reviewer checks the external result, locale tag, link, media, and delivery record.
6. Scheduled publication is enabled for that provider only; other providers remain unchanged.
7. Authorization failure, unexpected volume, language-policy drift, or missing delivery ID disables only the affected provider and creates an escalation.
