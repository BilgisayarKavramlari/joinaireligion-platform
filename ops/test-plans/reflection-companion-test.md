# Reflection Companion test plan

## Objective

Verify that Reflection Companion is member-only, plan-bounded, lesson-grounded, privacy-minimized, fail-closed, cost-bounded, injection-resistant, measurable without conversation text, and released through the audited multilingual campaign pipeline.

## Automated release gates

1. Validate and generate the existing Prisma schema; no migration is expected.
2. Run focused request-parser, prompt-boundary, abuse-budget, entitlement, route, and launch-gate tests.
3. Run the full Jest suite, TypeScript verification, production build with a non-secret placeholder database URL, and repository verification script.
4. Inspect the final diff for secrets, raw prompts/answers, accidental schema/workflow changes, and the unrelated `.DS_Store`.

## Security scenarios

| Scenario | Expected result |
| --- | --- |
| Guest request | `401`, no quota or provider call |
| Unverified or incomplete account | `403`, no provider call |
| Cross-origin or non-JSON POST | `403` or `415` |
| Bot-like user agent or burst | blocked before provider |
| Role override / prompt extraction / encoded policy request | deterministic block before quota and provider |
| Lesson not owned by user | `403` before model call |
| Free user requests Life Reflection | `403` with upgrade signal |
| Account, session, turn, keyed-network, or global budget exhausted | durable `429` before provider |
| Concurrent reservations | serialized by transaction advisory lock; quota increments once per accepted turn |
| Input/output moderation unavailable | fail closed; no unsafe answer returned |
| Malformed or prohibited output | fixed safe fallback |
| Crisis language | localized immediate-safety handoff; no quota consumed |
| Provider request inspection | no tools, no conversation object, `store:false`, strict JSON schema, bounded output, hashed safety identifier |
| Database/log inspection | no submitted prompt or generated answer; only `[not retained]` and text-free metadata |

## Product and campaign scenarios

- Guest examples render without making a model call.
- Verified members can select only their available lesson; conversation state survives only the browser tab/session.
- Free/Seeker show one session, three daily turns; Initiate shows three sessions, twenty-four turns, and Life Reflection.
- Pricing, billing, account, landing, navigation, privacy, EULA, sitemap, and admin growth surfaces state the same contract.
- All eight deterministic launch variants pass the content gate and link to the attributed Companion URL.
- Repeated launch calls reuse the same content item and social package.
- Social publication touches only configured providers and produces delivery evidence without engagement or spend actions.

## Production verification

1. Confirm GitHub merge SHA and successful deployment workflow.
2. Confirm `/api/health` is healthy and reports the expected SHA/database state.
3. Confirm `/companion`, pricing, privacy, EULA, sitemap, and one localized launch article are public.
4. With the existing signed admin session, call the idempotent launch endpoint and record the content item, social package, and provider outcomes.
5. With a verified member session, inspect quota GET and complete one safe lesson-grounded request; confirm no text exists in the aggregate admin dialogue view.
6. Recheck health after the campaign call and record public provider URLs only when independently verified.

## Stop conditions

Do not describe a provider post as live without a provider delivery record and public URL. Stop only for a real credential/OAuth/terms/payment gate, production health regression, migration requirement, or evidence of private-text retention.
