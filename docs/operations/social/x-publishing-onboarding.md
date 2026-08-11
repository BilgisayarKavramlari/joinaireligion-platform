# X publishing onboarding

Status date: 2026-08-11

Scope: standalone text Posts from the dedicated Join AI Religion brand account. Personal-account publishing, replies, reposts, likes, follows, and direct messages are outside scope. This document contains no credentials and does not authorize account creation, billing, OAuth consent, or a live Post.

## Verified current provider model

X API access is credit-based pay-per-use rather than a monthly self-serve subscription. Credits are purchased in advance in the Developer Console; a spending limit can be set. The official price table currently lists:

- Post create: USD 0.015 per request.
- Post create with URL: USD 0.200 per request.
- Prices can change; the Developer Console is the final source at purchase time.

`POST /2/tweets` requires user-context authentication. An app-only bearer token is not sufficient to publish. The supported choices are:

1. OAuth 1.0a with the app API key/secret plus the brand-account access token/secret.
2. OAuth 2.0 Authorization Code with PKCE and the minimal publishing scopes `tweet.read`, `tweet.write`, `users.read`, and `offline.access`.

`offline.access` is needed for an OAuth 2.0 refresh token. The current application accepts a static `X_USER_ACCESS_TOKEN` but does not implement refresh-token rotation, so OAuth 1.0a owner-account credentials are the lower-interaction route for the first text-only release. X states that OAuth 1.0a user access tokens do not expire, but they can be revoked or invalidated; provider failures must therefore remain bounded and observable.

The documented create-Post rate limits are 10,000 requests per app per 24 hours and 100 requests per user per 15 minutes. Join AI Religion should use a much smaller editorial and budget ceiling.

## Safe setup sequence

These are one-time owner gates and must be completed while signed in to the dedicated brand account, not a personal account.

1. Verify the public brand handle, recovery email, and two-factor authentication.
2. Open the X Developer Console, accept the current Developer Agreement, and create an app owned by that brand account.
3. Enable read-and-write permission only. Do not enable DM permissions or unrelated scopes.
4. Purchase the smallest practical credit amount and set a hard spending limit. Keep auto-recharge off for the canary phase.
5. Generate OAuth 1.0a API key/secret and owner access token/secret. Save them directly to the production secret store; never paste them into chat, tickets, source control, or documentation.
6. Leave `X_PUBLISHING_ENABLED=false`. Run the secret-safe preflight and confirm it reports `oauth1_owner_context` without exposing values:

   ```sh
   node scripts/ops/check-x-publishing-config.mjs
   ```

7. Keep both scheduled switches off and run `node scripts/ops/check-x-publishing-config.mjs --require-owner-canary-ready`. It deliberately fails until a separate owner-triggered, isolated canary path is implemented; the normal content runner is not the canary path because it requires a canonical source URL.
8. After that isolated path exists, approve one standalone text-only canary without a URL. Do not set `X_PUBLISHING_ENABLED=true` merely to make the canary possible; doing so would race the scheduler. Verify the public Post belongs to the brand account, record its URL/provider ID, reconcile any ambiguous write before another attempt, and only then decide whether scheduled publishing should be enabled.

## Production gates

- Global and X provider switches both remain fail-closed until owner approval.
- Only `POST https://api.x.com/2/tweets` is in scope.
- The text-only request body is exactly `{ "text": "..." }`; `made_with_ai` is reserved for a future media path where the Post actually contains AI-generated media.
- No personal-account token is accepted as a substitute for the dedicated brand account.
- No listening/search API is required for publishing; leaving `X_BEARER_TOKEN` unset avoids read costs.
- HTTP 401/403, HTTP 429, depleted credits, or an account mismatch is a failed canary. Do not enable scheduled publishing after any of these results.
- A network/5xx outcome or a success response without a provider ID is `AMBIGUOUS`, requires provider-side reconciliation, and is never retried automatically. For text-only Posts, omit `made_with_ai`; X defines that field for AI-generated media.
- Use a small provider budget and editorial frequency even though the platform rate limit is much higher.

## Official references

- [X API pricing](https://docs.x.com/x-api/getting-started/pricing)
- [Create Posts endpoint](https://docs.x.com/x-api/posts/create-post)
- [Manage Posts quickstart](https://docs.x.com/x-api/posts/manage-tweets/quickstart)
- [OAuth 2.0 Authorization Code with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [OAuth 2.0 user access and refresh flow](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token)
- [OAuth 1.0a owner-account context](https://docs.x.com/fundamentals/authentication/oauth-1-0a/overview)
- [OAuth 1.0a user access-token lifecycle](https://docs.x.com/fundamentals/authentication/oauth-1-0a/obtaining-user-access-tokens)
- [X API rate limits](https://docs.x.com/x-api/fundamentals/rate-limits)
