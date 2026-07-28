# Planned Growth Agents Production Implementation

Status: Approved for implementation and production deployment.
Date: 2026-07-28

## Goal

Implement and schedule the five registry entries that were previously marked as planned:

- `seo-kulliyat-draft`
- `social-listener-draft`
- `ads-reporting`
- `cfo-reporting`
- `revenue-orchestrator`

The first production slice is bounded: content and social output remain draft-only, advertising remains report-only with no spend mutation, CFO output remains report-only with no financial mutation, and revenue orchestration creates internal recommendations only.

## Prisma schema change approval

The project owner approved the following in writing in the Codex Desktop task on 2026-07-28:

> Mevcut verileri silmeyen ekleyici Prisma schema değişikliğini, migration öncesi üretim yedeğini ve güvenli production deploymentını onaylıyorum.

Approved schema scope:

- additive enum types and tables only
- multilingual content candidates, variants, source signals, engagement snapshots, and moderation decisions
- generic persisted artifacts for draft/report-only agents
- indexes and foreign keys for the new records
- no dropped table, column, index, or existing data

## Production migration safety

1. Merge and deploy the additive migration file before deploying code that queries the new tables.
2. Run the root-owned production backup and verify its compressed database artifact.
3. Review migration SQL for destructive statements; it must contain no `DROP`, `TRUNCATE`, or data mutation.
4. Run `prisma migrate deploy` through the production migrator container.
5. Verify migration status and table availability before the agent implementation deployment.

## Acceptance criteria

- all five agents are implemented and visible as implemented in `/admin/agents`
- every run creates an auditable `AgentRun`
- agent outputs are idempotent and persisted
- SEO/Kulliyat output covers `en`, `tr`, `es`, `de`, and `fr` and passes a deterministic safety gate
- social output is draft-only and uses approved internal signals only
- ads and CFO agents cannot spend or mutate financial records
- revenue orchestration creates internal recommendations only
- systemd timers invoke the five endpoints with existing bounded cron credentials
- full tests, type-check, security audit, build, backup, migration, deployment, and live run checks pass
