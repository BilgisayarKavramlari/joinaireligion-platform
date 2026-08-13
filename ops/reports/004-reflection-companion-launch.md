# Report 004 — Reflection Companion product and campaign launch

## Result before production deployment

Reflection Companion is implemented as a member-only product with lesson-grounded access for Free/Seeker and an additional life-reflection mode for Initiate. The release requires no database migration. Product, package, navigation, landing, account, pricing, privacy/EULA, agent registry, aggregate reporting, campaign, and social-card surfaces now use one consistent contract.

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

Pending the normal GitHub pull request, merge, CI/deploy workflow, health/SHA check, authenticated admin launch, live member flow, and public provider verification. These steps do not require a migration or secret change.
