# Agent and Bot Architecture Audit

Date: 2026-08-07
Scope: repository, GitHub state, project architecture report, runtime permissions, schedules, logging, safety, and approval boundaries.

## Verified repository and runtime state

- Repository: `BilgisayarKavramlari/joinaireligion-platform`, default branch `main`.
- Latest remote commit: `2d1a7bc240bcffe13e6dcac3aca064d81c502db0`.
- Latest `CI → Deploy` workflow for that commit completed successfully on 2026-07-31; verify and production deploy jobs both passed.
- Public production health returned `{ "ok": true }` on 2026-08-07.
- The authenticated production AgentRun snapshot could not be read in this audit because no admin session was available. The admin endpoints correctly returned HTTP 401 to anonymous requests.
- GitHub had no open issues. PR #2 remains open but is an obsolete, non-mergeable scaffold branch that predates the current implementation.

## Architecture compared with the original project report

### Content agent line

The original report proposed scheduled, language-aware draft generation, safety filtering, fact/source logging, an admin review queue, and no automatic sending in the first slice.

The current implementation exceeds the original first slice:

- `seo-kulliyat-draft` produces multilingual staged content.
- `content-publisher` independently reruns deterministic safety, quality, completeness, locale, and duplicate gates.
- `content-performance` uses aggregate-only engagement and can reversibly unpublish after strong negative signals.
- source signals, moderation decisions, AgentRun records, daily caps, quarantine, rejection, and no-deletion boundaries exist.

The automatic site-publication behavior differs from the earliest report, but a later owner-approved 2026-07-28 operating decision explicitly supersedes that initial admin-approval requirement with a two-agent publication gate. This audit does not reverse that product decision.

### Image/media agent line

The dedicated image-agent target is not implemented. There is no registered `image-agent`, no `MediaAsset` model matching the original metadata contract, and no object-storage-backed image generation queue. The repository does implement downstream podcast/video generation and deterministic social-card rendering from already reviewed public content, but these are not substitutes for the proposed localized image asset agent.

### Maintenance agent line

Maintenance responsibilities are split across `autonomy-repair`, public system health, authenticated autonomy health, backup timers, deploy verification, and hardened systemd units. This is operationally useful but not a single explicit `maintenance-agent` module.

`private-note-retention` has an authenticated route and script that deletes only records past an explicit `expiresAt`, without reading note content. It is not registered and has no systemd timer. The global timer remains intentionally disabled because the account notes route already enforces the user's selected retention period on the user's next visit.

### FLA and EMA

The owner clarified the governance roles after the initial audit. EMA is the highest project-level performance orchestrator and may take initiative without routine human approval inside configured safety, privacy, provider, and budget boundaries. FLA owns communication from the project owner, records explicit owner overrides, and routes them to EMA without inferring or widening their scope. Direct owner commands have the highest project-policy precedence for their stated target and scope. These governance roles are exposed separately from executable scheduled agents.

## Findings fixed in this audit

1. Scheduled health and deploy-status scripts were calling admin-session-only endpoints with `CRON_SECRET`. New read-only `/api/cron/autonomy-health` and `/api/cron/deploy-status` endpoints preserve session-only admin routes while supporting the bounded operations account.
2. Curl probes now fail on HTTP errors instead of treating a 401 JSON body as an unknown-but-successful health response, and consistently map curl failures to the documented operations exit code.
3. Deploy status now includes the latest run for all registered agents instead of only four legacy entries.
4. `content-locale-backfill` registry metadata now matches its actual hourly `:10` systemd timer instead of reporting a manual schedule.
5. Growth-agent AgentRun output now persists the required decision-log contract: action, autonomy level, policy authorization, policy rule, risk, escalation flag, redacted summaries, and timestamp.
6. Production health guidance no longer recommends `prisma db push`; it points to reviewed, version-controlled migration handling.
7. Operations documentation now uses the local loopback application URL expected by the hardened systemd network boundary.
8. FLA, EMA, and explicit owner-command precedence are now represented as typed governance contracts in the admin agent registry and documented in `docs/operations/agent-governance.md`.

## Validation

- 76 test suites and 584 tests passed.
- Prisma validation and client generation passed with a non-production placeholder database URL.
- TypeScript verification passed.
- Next.js production build passed and included both new cron observability routes.
- Production and development dependency audits reported zero vulnerabilities after pinning patched transitive versions for `nanoid`, `brace-expansion`, and `js-yaml`.
- Shell syntax and dry-run checks passed for the operations scripts.

## Decisions still requiring the owner

1. Choose the image-agent storage/provider model and whether image use remains admin-approved or may later use an independent automatic gate.

Private-note retention does not currently need a production timer. Users choose "keep until I delete it", 30 days, 90 days, or one year; expired notes are already deleted when that user next opens the private-notes page. Leaving the background timer disabled avoids an additional irreversible deletion path while preserving the user's selected retention behavior on access.

No production deploy, live timer change, database migration, content publication, email send, or social post was performed during this audit.
