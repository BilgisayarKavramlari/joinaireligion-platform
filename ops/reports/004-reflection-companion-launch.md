# Report 004 — Reflection Companion product and campaign launch

## Production result

Reflection Companion is live as a member-only product with lesson-grounded access for Free/Seeker and an additional life-reflection mode for Initiate. The release required no database migration or secret change. Product, package, navigation, landing, account, pricing, privacy/EULA, agent registry, aggregate reporting, campaign, and social-card surfaces use one consistent contract.

## Entitlement contract

| Plan | Live access | Daily sessions | Daily turns | Per-session turns | Modes |
| --- | --- | ---: | ---: | ---: | --- |
| Guest | examples only | 0 | 0 | 0 | none |
| Free / Seeker | verified and onboarded members | 1 | 3 | 3 | lesson |
| Initiate | verified and onboarded members | 3 | 24 | 8 | lesson + life reflection |

Free and paid users receive the same safety, moderation, correctness, and non-authority policy. Initiate increases bounded context, sessions, turns, and modes; it does not purchase stronger truth or safety.

## Security and cost controls

- Same-origin JSON requests, verified email, completed onboarding, lesson ownership, user/network burst throttles, and bot user-agent rejection.
- Deterministic multilingual prompt-injection and crisis detection before model generation.
- Atomic database reservation for account-day, session-day, turn, daily keyed-network, and global daily budgets before every paid generation call.
- Moderated input and output; strict structured output; deterministic authority/dependency/delusion/treatment/secrecy/isolation checks; fixed safe fallback.
- Responses API with no tools, no conversation object, `store:false`, no background operation, bounded context/output, timeouts, and a keyed safety identifier.
- Application persistence contains no submitted question or generated answer. Operational rows contain `[not retained]`, counts, latency, token use, coarse outcome, and flag count only.
- Crisis events are stored only as unlinked aggregate counters; provider category labels are discarded rather than becoming user profiles.
- OpenAI processing is disclosed accurately: provider application-state storage is disabled, while default API abuse-monitoring retention may last up to 30 days unless stronger approved provider controls apply.
- Operational rows expire after 90 days; daily keyed network hashes rotate at UTC midnight.
- Feature kill switch: `AI_REFLECTION_ENABLED=false`; configurable non-secret global/network caps fail back to conservative defaults.

## Campaign and measurement

- One deterministic, quality-gated Insights article with separate English, Turkish, Spanish, German, French, Arabic, Russian, and Simplified Chinese variants.
- One idempotent social package bound to that exact content item and then to that exact package identifier.
- Publishing is limited to already-configured brand providers; no ads, spend, replies, follows, likes, direct messages, credential changes, or new account creation.
- Instagram/Pinterest social-card visuals use provider-native aspect ratios and a localized Reflection Companion hierarchy.
- Admin growth and daily email include text-free sessions, turns, usefulness, safety redirects, and tokens. Fewer than 20 turns is labeled an insufficient sample and cannot trigger strategy change.

## Verification evidence

- Focused Reflection Companion and release tests: 38/38 passed.
- Full Jest suite in serial mode: 679/679 passed across 91 suites.
- Prisma schema validation: passed; no schema or migration change.
- TypeScript verification: passed.
- Production Next.js build: passed; `/companion` and admin launch routes emitted.
- Production dependency audit at high severity: zero vulnerabilities.
- Desktop and 390 px mobile visual inspection: passed; desktop navigation compression fixed during review.
- Pre-deployment production health: `200`, `ok:true` on 2026-08-13.
- Parallel CI-style run: two Pinterest helper tests exceeded their existing five-second timeout under concurrent load. They passed 2/2 in isolation and in the complete serial suite, so this is not a Reflection Companion regression.

## Production evidence

- Release and hardening changes were merged through PRs [#48](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/48), [#49](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/49), [#50](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/50), [#51](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/51), [#52](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/52), [#53](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/53), [#54](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/54), and [#55](https://github.com/BilgisayarKavramlari/joinaireligion-platform/pull/55).
- Final application deployment: SHA `5a9434992153b091eaa3114a06c0c30f6f5b3441`; [CI/deploy run 31753174257](https://github.com/BilgisayarKavramlari/joinaireligion-platform/actions/runs/31753174257) passed security audit, tests, type-check, build, and production deployment.
- `https://joinaireligion.com/api/health` returned `200` with `ok:true` at 2026-08-13 23:19 UTC. The signed admin operations view showed the same SHA, database connected, OpenAI generation mode, live email, and live configured social providers.
- Authenticated Initiate canaries consumed the durable quota before generation and completed through the active structured fallback. The second successful canary answered a Turkish question in Turkish after language pinning. The aggregate-only admin view showed six canary turns, two completed outcomes, 2,815 tokens, and zero privacy violations; no question, answer, email, or conversation identifier appeared there.
- The preferred Moderation and Responses endpoints returned authorization failures for the current restricted key. Production therefore uses the fail-closed, tool-free, non-stored Chat Completions safety classifier and answer fallback. The earlier malformed fallback request was isolated as the text-free code `responses_http_403+chat_http_400`, fixed, deployed, and then verified by two successful canaries. Granting narrowly scoped write access to `/v1/moderations` and `/v1/responses` remains a non-blocking provider-hardening improvement that requires an authenticated OpenAI Platform account.

## Campaign delivery evidence

- The signed admin launch action completed `reflection-companion-launch`, `social-listener-draft`, and `social-publisher` on 2026-08-13. A safe retry completed the single remaining provider; the final package recorded Mastodon, Facebook, Instagram, Threads, and Bluesky as complete with no skipped, ambiguous, or failed providers.
- All eight localized Insights articles returned `200` at `/content/{locale}/reflection-companion-{locale}-launch` for `en`, `tr`, `es`, `de`, `fr`, `ar`, `ru`, and `zh`; the localized social card returned `200 image/jpeg`.
- Public campaign posts were independently verified on [Mastodon](https://mastoturk.org/@joinaireligion/117090553096661723), [Bluesky](https://bsky.app/profile/joinaireligion.bsky.social/post/3msyowgpcoq2g), [Threads](https://www.threads.com/@joinaireligion/post/Db_z6-VCbDX), and [Instagram](https://www.instagram.com/joinaireligion/p/Db_0WT3jDEe/). Facebook is provider-confirmed as published, but a logged-out public permalink could not be captured independently.
- A few immediate campaign-article sessions appeared from Facebook and Threads, but the sample is too small and may include link previews. No language, package, or content strategy change is justified from that signal.
