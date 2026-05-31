# Phase 2 Task 4A-DOC - CTO Agent Assessment Design

Date: 2026-05-31

## Goal

Define the bounded design for a future CTO / Architecture Agent assessment step that evaluates ideas already accepted by PM, without yet creating backlog items, engineering tasks, or developer execution.

## CTO Review Eligibility

An `IdeaRecord` is eligible for CTO review when all of the following are true:

- the idea is still active and not already closed out
- the latest relevant PM assessment decision is `ACCEPT_FOR_CTO_REVIEW`
- the idea does not already have an active CTO assessment for the current review cycle
- the idea has enough product context for technical review

Items should not be selected for CTO review when:

- PM has rejected them
- PM marked them `NEEDS_MORE_INFO` or `MONITOR`
- a fresh CTO assessment already exists and the idea has not materially changed
- the idea is already in a later state that would make duplicate technical review noisy

## CTO Assessment Decisions

The CTO assessment decision set should be:

- `TECHNICALLY_ACCEPTABLE`
  The idea appears implementable within the current architecture with manageable risk.

- `REJECT_TECHNICAL_RISK`
  The idea should not proceed in its current form because technical cost, fragility, or architectural blast radius is too high.

- `NEEDS_MORE_INFO`
  The idea may be viable, but technical review cannot be completed safely with the available context.

- `DEFER`
  The idea may be technically possible, but is not a good near-term candidate due to sequencing, dependency, or readiness concerns.

## Required `rationaleJson`

Each CTO assessment should write a structured `rationaleJson` with:

- `technicalFeasibility`
  Short assessment such as low, medium, or high feasibility with a brief explanation.

- `architectureRisk`
  Summary of system-level risk and coupling concerns.

- `affectedModules`
  Array of impacted areas, for example `support-triage`, `admin-ideas`, `account-support`, `stripe`, `lessons`, `i18n`.

- `dataModelImpact`
  Whether schema changes appear unnecessary, additive, or high-risk.

- `apiImpact`
  Summary of route or endpoint impact.

- `uiImpact`
  Summary of admin or user-facing interface impact.

- `testPlanSummary`
  Minimal test surface expected if the idea moves forward.

- `rolloutRisk`
  Summary of deploy or migration sensitivity.

- `rollbackNotes`
  Short note on how the change could be safely backed out.

- `suggestedTaskBreakdown`
  Small phased implementation slices, expressed as a short ordered list or array of task summaries.

Optional:

- `scoreValue`
  Numeric score if useful for ordering technical readiness, but not required.

## What Must Not Happen Yet

This CTO assessment phase is analysis only. The following must not happen yet:

- no `BacklogItem` creation
- no `EngineeringTask` creation
- no Claude Code execution
- no Codex execution
- no developer orchestration handoff
- no automatic code changes

The output at this stage is an immutable `IdeaAssessment` plus conservative `IdeaRecord.status` movement only.

## Conservative Status Behavior

When a CTO review is later implemented:

- reviewed ideas may move to `CTO_REVIEWED`
- clearly non-viable technical ideas may move to `REJECTED`
- policy, security, payment, reputation, or system-risk ambiguity may move to `ESCALATED`

This step should not imply implementation readiness by itself.

## Next Three Micro-Slices

1. Helper only
- Add a deterministic CTO assessment helper/service.
- No database writes.
- No routes.
- No UI changes.

2. Route and persistence only
- Add a protected cron/admin-safe CTO review route.
- Select PM-approved ideas.
- Create immutable `CTO_REVIEW` `IdeaAssessment` rows.
- Update `IdeaRecord.status` conservatively.
- Do not create backlog items or engineering tasks.

3. Admin visibility only
- Show the latest CTO assessment on `/admin/ideas`.
- Render decision, rationale summary, affected modules, and suggested task breakdown safely.
- Do not add execution controls yet.

## Recommendation

The next implementation slice should be the helper-only step. It is the smallest safe move, keeps the logic deterministic, and allows unit testing of CTO review reasoning before any persistence or admin-surface wiring.
