# Mainstream social onboarding

Scope: YouTube, Meta Facebook Page plus Instagram Professional and Threads, X, LinkedIn organization publishing, and TikTok. This runbook contains no secret values and does not authorize account creation or external publication by itself.

## Shared ownership

- **Human owner:** creates or claims organization assets, accepts terms, completes CAPTCHA, 2FA, identity/business verification, paid developer-plan decisions, app review, and one-time OAuth consent.
- **Account bootstrap agent:** prepares exact profile copy, approved brand assets, URLs, and the next-click checklist. It stops at terms, CAPTCHA, 2FA, identity, payment, and final account-submission gates.
- **Credential custodian:** stores provider-scoped tokens only in the production secret store, reports only set/missing/expiry state, and rotates or revokes tokens. It never prints values or stores a Google master password.
- **Provider adapter agent:** implements secrets-free API adapters, mocks, idempotency, validation, and safe error classification.
- **Safety reviewer:** verifies public source, language, media rights, AI disclosure, and provider policy before the canary.
- **Bounded publisher:** publishes approved packages to individually enabled providers. It cannot reply, DM, follow, like, delete, or spend money.

Use a dedicated brand Google account as an ownership/recovery anchor where Google sign-in is offered, plus a second human recovery administrator and hardware-backed 2FA. Google sign-in reduces signup repetition but does not replace provider OAuth tokens, scopes, app review, or recovery procedures.

## 1. YouTube

### Human gates

1. Create or claim the Join AI Religion brand channel.
2. Create/select its Google Cloud project and enable YouTube Data API v3.
3. Configure the OAuth consent screen and complete any verification required for public automated uploads.
4. Pass CAPTCHA/2FA and approve the requested YouTube OAuth scope once.
5. Approve one private/unlisted canary video before public scheduling is enabled.

### Secret names

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_CHANNEL_ID`
- `YOUTUBE_PUBLISHING_ENABLED` (starts `false`)

### Connection order after account creation

Cloud project and API → OAuth client/redirect URI → one-time owner consent → refresh token in production secret store → channel-ID verification → private resumable upload → metadata/caption/thumbnail validation → provider switch → scheduled public publishing.

## 2. Meta: Facebook Page and Instagram Professional

### Human gates

1. Create or claim the Facebook Page and create/convert the Instagram Professional account.
2. Connect the Page and Instagram account in the owner-controlled Meta business portfolio.
3. Create the Meta developer app, associate the business assets, and complete required business/app review.
4. Pass CAPTCHA/2FA and grant only the Page/Instagram publishing and read scopes required by the adapter.
5. Approve one Page draft and one Instagram container canary before scheduled publishing.

### Secret names

- `META_APP_ID`
- `META_APP_SECRET`
- `META_GRAPH_VERSION`
- `META_PAGE_ID`
- `META_PAGE_ACCESS_TOKEN`
- `INSTAGRAM_USER_ID`
- `FACEBOOK_PUBLISHING_ENABLED` (starts `false`)
- `INSTAGRAM_PUBLISHING_ENABLED` (starts `false`)

### Connection order after account creation

Business portfolio → Page/Instagram linkage → developer app → permissions/review → owner OAuth grant → Page token in production secret store → asset-ID verification → Page canary → Instagram media-container/status/publish canary → separate provider switches → scheduled publishing.

## 3. LinkedIn organization

### Human gates

1. Create or claim the Join AI Religion organization Page and retain a verified human super admin.
2. Create the developer app and associate it with the organization Page.
3. Request and receive the required Community Management access/scopes.
4. Pass 2FA and approve OAuth once as the organization administrator.
5. Approve one text-only canary before media and scheduled publication are enabled.

### Secret names

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_REFRESH_TOKEN`
- `LINKEDIN_AUTHOR_URN`
- `LINKEDIN_VERSION`
- `LINKEDIN_PUBLISHING_ENABLED` (starts `false`)

### Connection order after account creation

Organization Page/admin → developer app association → Community Management access → OAuth grant → tokens in production secret store → organization-URN discovery/verification → text canary → delivery-ID verification → provider switch → scheduled publishing; media support follows only after stable text delivery.

## 4. Threads

### Human gates

1. Activate the `joinaireligion` Threads profile from the linked Instagram Professional account.
2. Add the Threads use case to the Meta app.
3. Configure the exact OAuth redirect URI and grant only `threads_basic` and `threads_content_publish`.
4. Exchange the short-lived token for a long-lived Threads user token.
5. Approve one text-only canary before scheduled publishing is enabled.

### Secret names

- `THREADS_ACCESS_TOKEN`
- `THREADS_PUBLISHING_ENABLED` (starts `false`)

### Connection order

Threads profile activation → Meta Threads use case → OAuth grant → long-lived token in production secret store → `/me` profile verification → container/publish canary → permalink verification → provider switch → scheduled publishing.

Official references: [Meta Threads Postman collection](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api), [Threads authorization](https://www.postman.com/meta/threads/folder/34203612-e0373e84-de6b-46f1-b90d-3fea76ba6782).

## 5. X

### Human gates

1. Verify the public brand handle and its recovery/2FA settings.
2. Choose and accept the current X API pricing plan in the Developer Console.
3. For a single owner-operated account, generate the app's OAuth 1.0a API Key/Secret and owner Access Token/Secret; alternatively configure OAuth 2.0 with `tweet.read`, `tweet.write`, `users.read`, and `offline.access`.
5. Approve one text-only canary before scheduled publishing is enabled.

### Secret names

- `X_BEARER_TOKEN` (public aggregate listening only)
- `X_USER_ACCESS_TOKEN`
- `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` (lower-interaction owner-account option)
- `X_PUBLISHING_ENABLED` (starts `false`)

Official references: [OAuth 2.0 PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token), [Create a Post](https://docs.x.com/x-api/posts/create-post).

## 6. TikTok

TikTok is a separate media workflow, not a text-provider toggle. The Direct Post client must query creator information, display the creator's current privacy/comment/interaction options, obtain express consent for that upload, and poll the returned publication status. Unreviewed clients are restricted to private visibility; public autonomous posting stays disabled until TikTok completes its audit. Promotional watermarks, overlaid links, and promotional text in uploaded media are not permitted.

### Human gates

1. Create the brand account and retain owner-controlled 2FA/recovery.
2. Register the developer app, add Content Posting API, and verify the site domain or media URL prefix.
3. Complete OAuth for `video.publish`.
4. Test only with `SELF_ONLY` while the client is unaudited.
5. Submit the required product demonstration and app review, then explicitly approve the public-posting release gate.

Official references: [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started/), [Direct Post guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines/).

## Per-provider release gate

1. Required secret names are reported as set without showing values.
2. Adapter tests and private/sandbox validation pass.
3. Only the target provider switch is enabled for one canary.
4. A separate reviewer verifies the external ID, URL, language, source link, media, and disclosure.
5. Scheduled publishing is enabled only for that provider.
6. Authorization failure, missing delivery ID, unexpected volume, or language drift disables only the affected provider and opens an escalation.
