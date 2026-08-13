# Task 004 — Reflection Companion product and campaign launch

> **Status:** `completed — released to production`
> **Assigned to:** Coding Agent
> **Requested by:** Project owner
> **Date opened:** 2026-08-13
> **Date closed:** 2026-08-13

## Objective

Turn the existing single-turn AI query skeleton into a production-safe, member-only Reflection Companion. Launch a lesson-grounded free experience and an Initiate-only life-reflection mode, align membership promises, add privacy-preserving measurement, and publish one bounded multilingual launch campaign through the existing content/social pipeline.

## Owner command and scope

The owner explicitly instructed: “bu analizin doğrultusunda gerekli tasarımları hem ürün hem kampanya hem paketler hem sosyal medya ve ilgili ne kadar yer varsa güncelle ve bu fikri canlıya alalım ... bütün kriterleri değerlendirip ona göre tasarla ... bana tekrar sormadan aksiyon alıp fikri gerçekleştir.”

This is a scope-bound owner override authorizing the application, package, campaign, social-distribution, security, production-deployment, and any necessary additive schema work for Reflection Companion. It does not authorize secret disclosure, uncapped spend, private-text targeting, unrelated changes, or destructive data operations.

## Context

- `/api/ai/query` currently authenticates users but stores raw prompts/responses and increments quota after the provider call.
- `resolveEntitlements` currently grants 3 or 50 prompts per day, while public pricing copy states different limits.
- `AiDialogue` and `UserActivityLog` can hold privacy-minimized operational metrics without retaining submitted text.
- Production deploys only through GitHub Actions and the allowlisted `joinai-deploy` wrapper.
- The existing content/social pipeline can publish a deterministic, independently gated multilingual launch article and configured-provider package.

## Allowed files

- `ops/tasks/004-reflection-companion-launch.md`
- `ops/reports/004-reflection-companion-launch.md`
- `ops/test-plans/reflection-companion-test.md`
- `src/app/api/ai/query/route.ts`
- `src/app/api/ai/feedback/route.ts`
- `src/app/api/ai/history/route.ts`
- `src/app/api/admin/reflection-companion/launch/route.ts`
- `src/app/api/admin/reflection-companion/preflight/route.ts`
- `src/app/companion/page.tsx`
- `src/app/account/page.tsx`
- `src/app/account/billing/page.tsx`
- `src/app/admin/dialogues/page.tsx`
- `src/app/admin/growth/page.tsx`
- `src/app/legal/eula/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/sitemap.ts`
- `src/app/social-card/[locale]/[slug]/route.tsx`
- `src/components/PublicHeader.tsx`
- `src/components/landing/LandingPage.tsx`
- `src/components/landing/PremiumHeader.tsx`
- `src/components/landing/SiteFooter.tsx`
- `src/lib/agents.ts`
- `src/lib/env.ts`
- `src/lib/growth-agents/runners.ts`
- `src/lib/growth-agents/content.ts`
- `src/lib/membership.ts`
- `src/lib/reflection-abuse.ts`
- `src/lib/reflection-companion.ts`
- `src/lib/reflection-copy.ts`
- `src/lib/reflection-launch.ts`
- `src/lib/reflection-provider.ts`
- `docs/architecture.md`
- `docs/content-policy.md`
- `docs/operations/social/account-inventory.md`
- `docs/operations/social/reflection-companion-launch-pack.md`
- `docs/privacy-logging.md`
- `docs/security-runbook.md`
- `__tests__/api/reflection-companion-route.test.ts`
- `__tests__/api/reflection-launch-route.test.ts`
- `__tests__/api/admin-agents.test.ts`
- `__tests__/app/social-card-route.test.ts`
- `__tests__/lib/membership.test.ts`
- `__tests__/lib/reflection-abuse.test.ts`
- `__tests__/lib/reflection-companion.test.ts`
- `__tests__/lib/reflection-launch.test.ts`

## Forbidden files

- `.env`
- `.env.local`
- `.env.production`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`
- existing files under `prisma/migrations/`
- `docs/operations/social/.DS_Store`

## Prisma schema change approval

- **Approved:** `yes`
- **Approved change:** Additive schema changes needed solely for encrypted/ephemeral Reflection Companion conversations, durable abuse budgets, retention, and privacy-safe feedback are authorized. Prefer the existing schema when it can satisfy the safety contract without weakening guarantees.
- **Approved by:** Project owner, 2026-08-13, in the quoted command above
- **Migration required:** `manual on VPS` if an additive migration is ultimately necessary

## Acceptance criteria

1. Guests cannot submit live questions; verified, onboarded members can use the bounded lesson mode.
2. Free/Seeker accounts receive one session and three turns per UTC day; Initiate receives three sessions and twenty-four turns per UTC day, with no reduction in correctness or safety for free users.
3. Life-reflection mode is Initiate-only; lesson mode only uses a lesson belonging to the signed-in user.
4. Prompt injection, role override, hidden-prompt extraction, abusive concurrency, account-farm IP volume, per-account volume, session-turn volume, and global daily spend are blocked before the paid model call.
5. Provider calls use no tools, no stored provider state, bounded input/output, a hashed safety identifier, input/output moderation, structured output, timeouts, and post-generation policy validation.
6. No submitted question or generated answer is written to application logs, analytics, routine admin views, content agents, growth agents, or social agents. Operational dialogue records contain only placeholders and aggregate metadata.
7. The user sees clear AI/consent/privacy/non-authority/crisis disclosures and can delete legacy AI history.
8. Pricing, billing, account navigation, landing surfaces, privacy/EULA, sitemap, admin growth reporting, and agent governance match the live entitlement contract.
9. A deterministic eight-language launch article passes the content gate, is published once, and creates one idempotent social package for configured providers only.
10. Relevant tests, type-check, build, CI, production health/SHA, live page, authenticated quota flow, campaign record, and provider delivery evidence are verified.

## Test commands

```bash
npx prisma validate
npx prisma generate
npm test -- --runInBand __tests__/lib/reflection-abuse.test.ts __tests__/lib/reflection-companion.test.ts __tests__/api/reflection-companion-route.test.ts __tests__/lib/reflection-launch.test.ts __tests__/lib/membership.test.ts
npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json
DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_placeholder npm run build
npm run verify
curl -sS https://joinaireligion.com/api/health
```

## Test plan reference

- [x] `ops/test-plans/reflection-companion-test.md`
- [x] `ops/test-plans/deployment-test.md`
- [x] `ops/test-plans/smoke-test.md`

## Rollback notes

Revert the feature commit on GitHub and let the normal deployment workflow restore the prior application revision. The implementation should avoid a migration if the existing privacy-minimized tables can enforce the contract. The launch content and social deliveries are idempotent; already-public external posts are recorded rather than duplicated during rollback/redeploy.

## Implementation notes

### Files changed

The allowed product, API, agent, growth, legal/privacy, campaign, social-card, test, and operating-document files listed above. No Prisma schema, migration, workflow, secret, package, Docker, or unrelated `.DS_Store` file changed.

### TypeScript result

Passed with `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json`.

### Summary of changes

Implemented the member-only Reflection Companion, consistent plan entitlements, durable abuse and cost controls, tool-free structured AI generation, privacy-minimized measurement, eight-locale release content, idempotent configured-provider social handoff, product-specific social visuals, and aggregate-only admin reporting.

## Review

- **Reviewer:** Coding Agent automated release gates
- **Date:** 2026-08-13
- **Decision:** `approved, deployed, and live-verified`
- **Notes:** Focused suite 38/38 and full serial suite 679/679 passed for the main release; subsequent provider and language fixes passed their focused suites and every main-branch CI gate. Production SHA `5a9434992153` is healthy with the database connected. Two real member canaries completed through the active safe provider fallback, including a Turkish-language response; aggregate admin evidence shows zero privacy violations. The eight-locale campaign and configured-provider social package were published without a migration or secret change.
