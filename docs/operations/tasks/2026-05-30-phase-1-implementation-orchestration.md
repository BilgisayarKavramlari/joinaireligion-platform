# Phase 1 Implementation Orchestration

Status: Active orchestration plan. Implementation not yet started from this document.

## Goal

Implement Phase 1 of the autonomous agent foundation for `joinaireligion-platform` in small, verifiable tasks without enabling real email sending, ad spend, public posting, Reddit posting, or CFO financial mutations.

## Phase 1 Task Sequence

### Task 1 — Agent Registry And Policy Foundation

Scope:

- create `/admin/agents`
- create `GET /api/admin/agents`
- define canonical agent registry entries for implemented, planned, idle, failed, and blocked agents
- add autonomy level, mode, backlog, next scheduled run, latest `AgentRun`, and boundary summary fields
- create the policy/boundary config layer with autonomy levels 0-4, allowed actions, forbidden actions, escalation conditions, and default safe boundaries
- define structured audit logging requirements for autonomous decisions

Verification:

- registry route returns all expected implemented and planned agents
- support-triage, seo-kulliyat-draft, social-listener-draft, ads-reporting, and cfo-reporting appear as planned/inactive
- admin page renders the new registry fields correctly
- policy defaults resolve without requiring per-action approvals

Short report:

- record what registry and policy structures were added
- record whether implemented and planned agents appear correctly
- record any blocking gaps discovered for later tasks

### Task 2 — Feedback Ownership And Data Integrity

Scope:

- fix logged-in feedback ownership so submissions link to the authenticated user
- store `userId`, `email`, `locale`, `pageUrl`, and `userAgent` when available
- preserve anonymity only when no valid session exists
- update admin feedback surfaces to show whether feedback is linked to a user
- add onboarding access guard so verified/login users with `onboardingDone=false` are redirected to `/onboarding` before lessons, practice, journey, or personalized dashboard content
- keep public landing pages, login, register, email verification, logout, support/feedback submission, and onboarding itself accessible without the onboarding guard
- allow admin bypass only when explicitly role-based and documented
- add health/admin visibility when verified but not-onboarded users still accumulate lesson or practice activity

Verification:

- authenticated feedback persists with user linkage
- anonymous feedback persists without false user linkage
- admin feedback view shows linked vs anonymous state correctly
- users with `onboardingDone=false` are redirected away from lessons, practice, journey, and personalized dashboard content
- health/admin checks warn if verified non-onboarded users still have lesson or practice activity

Short report:

- summarize ownership bug fix result
- summarize stored metadata coverage
- summarize onboarding guard behavior and any admin bypass
- note any migration or backfill needed

P0 data/access integrity issue:

- some verified users can enter the system and access lessons even when `onboardingDone=false`
- this must be treated as a Phase 1 data/access integrity issue and fixed before support automation

### Task 3 — Support Triage Agent And Audit Trail

Scope:

- add `POST /api/cron/support-triage` protected by `CRON_SECRET`
- add `scripts/cron/support-triage.sh`
- write `AgentRun` for each support triage execution
- classify open tickets by category, severity, language, duplicate group, owner, and recommended action
- use OpenAI when available and deterministic fallback otherwise
- log each classification, response draft, escalation, and handoff
- create project task files under `docs/operations/tasks/` for detected code-level bugs without requiring the owner to draft prompts

Verification:

- route authorization works
- `AgentRun` opens and closes correctly
- ticket classification works with and without OpenAI
- code-level bug detection produces task files

Short report:

- summarize number of tickets classified
- summarize fallback usage
- summarize escalations and task handoffs

### Task 4 — User Reply Visibility And Notification Flow

Scope:

- add a support reply model or safe extension to the feedback model
- expose user-visible support/ticket replies for logged-in users
- if email is enabled, notify by email
- if email is disabled, log intended email notification in `EmailLog` or equivalent logging surface
- do not enable real email sending automatically

Verification:

- logged-in user can view support replies
- disabled-email mode records intended notifications without sending
- audit logs show reply visibility and notification decision

Short report:

- summarize user-visible reply flow
- summarize email-disabled behavior
- note any UX gaps remaining

### Task 5 — Autonomy And Health Integration

Scope:

- show support-triage activity in `/admin/autonomy` and `/admin/agents`
- extend health checks to detect open ticket backlog, stale support triage, failed support triage, and anonymous-rate warning
- allow autonomy repair to safely trigger support triage when stale or backlog exists

Verification:

- health route emits the new support findings
- autonomy screens render support-triage status
- safe repair behavior respects policy boundaries and logs decisions

Short report:

- summarize new health findings
- summarize visibility improvements
- summarize any repair-trigger decisions

### Task 6 — Test Coverage And Final Phase 1 Validation

Scope:

- add tests for logged-in feedback ownership
- add tests for anonymous feedback
- add tests for support triage `AgentRun`
- add tests for low-risk automatic reply behavior
- add tests for escalation categories
- add tests for `/admin/agents` registry visibility

Verification:

- targeted tests pass
- no unexpected regressions in adjacent cron/admin flows

Short report:

- summarize passing coverage
- summarize any residual risks or deferred items

## Execution Rule

After each task:

1. run targeted verification
2. record a short report in `docs/operations/reports/`
3. stop if the result reveals a schema, safety, or policy blocker that affects downstream tasks

## First Executed Task

Task 1 — Agent Registry And Policy Foundation

Reason:

- it creates the registry, autonomy metadata, and policy boundary layer that the support triage and future agents depend on
- it establishes the canonical admin surface for implemented, planned, blocked, and failed agents before support automation is added

## Code Execution Requirement

Yes. Phase 1 implementation requires code execution and tests during the implementation tasks.

Current orchestration step:

- documentation and task sequencing only
- no broad implementation run started yet
