# Mainstream social onboarding

Scope: YouTube, Meta Facebook Page plus Instagram Professional, and LinkedIn organization publishing. This runbook contains no secret values and does not authorize account creation or external publication by itself.

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

## Per-provider release gate

1. Required secret names are reported as set without showing values.
2. Adapter tests and private/sandbox validation pass.
3. Only the target provider switch is enabled for one canary.
4. A separate reviewer verifies the external ID, URL, language, source link, media, and disclosure.
5. Scheduled publishing is enabled only for that provider.
6. Authorization failure, missing delivery ID, unexpected volume, or language drift disables only the affected provider and opens an escalation.
