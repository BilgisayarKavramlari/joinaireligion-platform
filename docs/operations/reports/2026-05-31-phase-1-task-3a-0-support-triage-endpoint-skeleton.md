# Phase 1 Task 3A-0: Support Triage Endpoint Skeleton

Date: 2026-05-31

Scope completed:

- Added `POST /api/cron/support-triage`.
- Reused `CRON_SECRET` Bearer-token auth pattern used by existing cron routes.
- Created one `AgentRun` with `agentName="support-triage"` per authorized request.
- Counted `FeedbackItem` rows with `status=OPEN` only.
- Returned the requested skeleton JSON contract.
- Added `scripts/cron/support-triage.sh`.
- Added targeted Jest coverage for auth, `AgentRun` creation, and open feedback counting.

Deliberately not implemented:

- Ticket classification
- Reply drafting or sending
- OpenAI calls
- Feedback status mutation
- Coding task creation
- Task 3B or user-facing support reply visibility

Validation performed:

- Targeted Jest for `__tests__/api/support-triage-route.test.ts`
- Type-check via `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json`
