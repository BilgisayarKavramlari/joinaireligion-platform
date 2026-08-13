# Join AI Religion Product Roadmap

Last reviewed: 2026-07-28  
Status: Planning baseline; target dates are not production commitments.

## Release policy

- Public release notes live at `/updates` and remain short, bilingual, and versioned.
- `planned` and `released` are different states. A release moves to `released` only after tests, review, deployment, health checks, and live verification pass.
- Public notes are append-only in `src/lib/public-updates.ts`; internal scope and dependencies stay in this roadmap.
- Database migrations, live payments, advertising spend, sensitive-data processing, and external publishing keep their existing approval and safety gates.

## v0.2.0 — Reliable access and transparent updates

Target window: 2026-08-03 through 2026-08-05

Scope:

- canonical client session state and correct navigation after email verification
- ownership-checked Stripe Checkout return status
- explicit USD/TRY presentation and fail-closed membership resolution
- additive credit wallet and ledger foundation kept disabled behind a feature flag
- public `/updates` page, landing-footer link, sitemap entry, and typed release notes

Exit criteria:

- all tests, type-check, production build, and security audit pass
- migration SQL is reviewed as additive and a verified production backup exists before migration
- credit purchases remain disabled until prices, legal copy, refund/dispute behavior, and live webhook fulfillment are verified
- live health, sign-in, verification, Checkout return, and `/updates` checks pass

## v0.3.0 — Meaning discovery and PWA MVP

Target window: 2026-08-17 through 2026-08-21

Accepted ideas:

- **Meaning Map:** a short, shareable self-reflection experience that recommends a next question rather than assigning a fixed identity
- **Seven-day reflection journey:** email and on-site prompts that lead from curiosity to one small personal practice
- installable PWA with reliable mobile navigation and an offline-safe static shell
- privacy-preserving share cards and deep links
- privacy-friendly funnel analytics for visit, completion, voluntary email opt-in, and return behavior

Exit criteria:

- no sensitive-trait profiling or religious/sexual-behavior targeting
- the PWA is installable on supported iOS and Android flows
- result pages are understandable without account creation
- share cards do not reveal private answers
- completion, opt-in, sharing, and seven-day return metrics are measurable

## v0.4.0 — Ethical growth loop

Target window: 2026-09-08 through 2026-09-18

Accepted ideas:

- **Three-minute mirror:** a short daily reflection without shame-based streaks
- **Reflection Quest:** a bounded, ethical task flow that rewards completion rather than screen time
- **One question, many traditions:** sourced, respectful perspectives with clear fictional/educational boundaries
- consent-based referral measurement
- opt-in WhatsApp/Telegram update channel with one-step unsubscribe
- YouTube and short-video packages derived only from approved public content
- an agent-drafted release-note workflow that still requires deployment verification before publication

Exit criteria:

- no infinite scroll, shame-based streaks, dark patterns, or sensitive retargeting
- notifications and messaging are opt-in and easy to disable
- public release notes match the deployed version and production verification record
- acquisition reporting uses aggregate data and measures meaningful reflection rather than screen time

## Native mobile decision gate

Native iOS/Android work is deferred until at least 90 days of product evidence exists. Reconsider only when the PWA is stable and the agreed demand, retention, referral, and native-feature request thresholds are met. Until then, native mobile is not a dated release commitment.

`Circle of Six` is also deferred until a named moderation owner and escalation process exist. `Private Pause` remains a separate 18+ privacy and legal review track, not a growth release item.

## Paid acquisition decision gate

Paid advertising remains disabled. Phase 0 is a no-spend planning and readiness track covering privacy-safe funnel measurement, a dedicated campaign landing page, mature-cohort economics, an append-only spend ledger, an enforceable lifetime funding ceiling, and a tested pause/reconciliation circuit. A first pilot requires a separate owner decision covering the platform, budget, payment mode, country/language cell, creative, landing page, CAC/payback definition, and contextual-only targeting boundary.

The current research order is Google Search, then Meta Reels/Stories, then Pinterest contextual discovery. Sensitive-belief targeting, customer lists, remarketing, lookalikes/actalikes, private user data, and audience expansion remain outside the pilot. The working project is [Paid acquisition readiness and pilot decision project](./tasks/2026-08-13-paid-acquisition-readiness-project.md).

## Current release gates recorded on 2026-07-28

- the payment/session work passes 483 of 483 tests, the production type-check, Prisma validation/generation, and the optimized build
- the repository has no staging environment; a push to `main` follows the production workflow
- production migration requires backup, SQL review, manual application, and live verification
- live USD/TRY package values and credit-sale legal/refund behavior are not yet finalized
