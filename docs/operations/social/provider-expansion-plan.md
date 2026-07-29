# Social provider expansion plan

Status: audit complete; no external account mutation performed
Audit date: 2026-07-29
Production release observed: `8676e57`

## Verified current state

| Component/provider | State | Evidence and boundary |
| --- | --- | --- |
| Public social listener | `LIVE` | Registry schedule is every six hours; production timer is enabled and active. It stores aggregate counts/hashtags only. |
| Social composer | `DRAFT_ONLY` | Produces reviewed multilingual packages from published site content; production timer is enabled and active. |
| Bounded social publisher | `LIVE` | Production timer is enabled and active. A successful systemd result may also mean a safe skip, so provider delivery records/public posts are the publication evidence. |
| Mastodon / Mastoturk | Live publication verified | Public profile `https://mastoturk.org/@joinaireligion` existed with one post at the audit time. The adapter requires `MASTODON_BASE_URL` and `MASTODON_ACCESS_TOKEN`. |
| Bluesky | Live publication verified | Public profile `https://bsky.app/profile/joinaireligion.bsky.social` existed with English, French, and Chinese posts. The adapter requires `BLUESKY_SERVICE_URL`, `BLUESKY_IDENTIFIER`, and `BLUESKY_APP_PASSWORD`. |
| X | Adapter only; account not verified | The provider supports `X_BEARER_TOKEN` for listening and `X_USER_ACCESS_TOKEN` for publishing. `https://x.com/joinaireligion` returned 404 at audit time. |
| LinkedIn | Adapter only; live configuration not verified | The provider supports `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`, and `LINKEDIN_VERSION`. No production account/delivery evidence was available to the restricted deployment operator. |
| Pinterest | Account exists; no adapter | `https://www.pinterest.com/joinaireligion/` resolved to a profile. Pinterest is absent from `SocialProviderName`, environment configuration, composer channels, and publisher delivery handling. |
| YouTube | Not implemented | No provider adapter, environment contract, media pipeline, OAuth flow, or delivery type exists. |
| Facebook and Instagram | Not implemented | No Meta Graph provider, environment contract, container/publish polling, or delivery type exists. |

Production secret values were deliberately not read. The deployment account is restricted to allowlisted status/deploy operations.

## Immediate correction before broader publication

The publisher currently chooses one daily locale and sends that same locale to every configured provider. Mastodon also labels every status as English even when its content is another language. This explains the Chinese Mastoturk post and must be corrected before scaling.

Required behavior:

1. Choose locale independently for each provider through an explicit, versioned language policy.
2. Pass the selected locale to each adapter and set the provider language metadata correctly.
3. Use deterministic weighted selection so retries preserve the same provider/locale decision.
4. Store `provider`, `locale`, policy version, source item, and external delivery ID in the delivery record.
5. Add a separate provider enable flag; the global publication switch alone is too broad for staged rollout.

Initial weights, subject to aggregate engagement review:

| Provider | Primary language policy |
| --- | --- |
| Mastoturk | Turkish 90%, English 5%, all other supported languages combined 5% |
| Bluesky | English 80%, other supported languages combined 20%; no single secondary locale above 5% until evidence supports it |
| X | English 85%, Turkish 10%, other supported languages combined 5% |
| LinkedIn | English 90%, Turkish 10% |
| Pinterest | English-first locale-specific boards; never mix unrelated languages on one board |
| YouTube | English primary audio; localized captions, titles, descriptions, and playlists before separate-language channels |
| Facebook/Instagram | English 70%, Turkish 20%, other supported languages combined 10%, adjusted only from aggregate audience data |

## Minimum-interaction implementation order

### 1. YouTube

Why first: a dedicated brand Google identity can own the channel and the Cloud project, and one OAuth grant can support long-running uploads. It does not require the Facebook/Instagram asset linkage or LinkedIn organization API approval.

Minimum code slice:

- add a `youtube` provider and video delivery type rather than forcing video into the text-post interface;
- add resumable upload, metadata, thumbnail, playlist, caption, and idempotency support;
- keep uploads private during the canary gate, then make public only after the returned video and metadata pass validation;
- add `YOUTUBE_PUBLISHING_ENABLED`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, and `YOUTUBE_CHANNEL_ID` to the environment contract;
- store refresh-token expiry/revocation health without logging token values.

Single human gates: create/claim the brand channel, enable YouTube Data API, configure OAuth consent, complete any Google verification required for public uploads, pass CAPTCHA/2FA, and approve OAuth once.

Official references: [upload guide](https://developers.google.com/youtube/v3/guides/uploading_a_video), [`videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert).

### 2. Meta: Facebook Page and Instagram Professional

Minimum code slice:

- add separate `facebook` and `instagram` providers behind `META_PUBLISHING_ENABLED` plus provider-specific switches;
- add Page post creation and Instagram media-container creation/status polling/publishing;
- add `META_GRAPH_VERSION`, `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, and `INSTAGRAM_USER_ID` to the environment contract;
- verify image/video dimensions before upload and record the creation container and final media IDs;
- never automate comments, direct messages, follows, or likes in this phase.

Single human gates: create/claim the Facebook Page, convert/create the Instagram Professional account, connect the assets, create the Meta app/business portfolio, complete business/app review when required, pass CAPTCHA/2FA, and grant the required Page/Instagram permissions once.

Official references: [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/), [Pages posts](https://developers.facebook.com/docs/pages-api/posts/).

### 3. LinkedIn organization publishing

The text-post adapter already exists, but production-grade organization ownership is incomplete.

Minimum code slice:

- add `LINKEDIN_PUBLISHING_ENABLED` and fail closed on token expiry;
- implement OAuth authorization-code/refresh handling without exposing tokens;
- discover and verify the organization URN instead of accepting an unverified free-form value;
- validate organization-admin authority and requested community-management scopes;
- add media upload support only after text canary delivery is stable.

Single human gates: create/claim the organization Page, remain its verified super admin, create the developer app, associate it with the Page, request/receive the required Community Management access, pass 2FA, and approve OAuth once.

Official reference: [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api).

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
