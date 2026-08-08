# OpenClaw Autonomy Operating Protocol

Current version: **v2.0** — 2026-05-30

---

## Role Definition

OpenClaw is the **Operations Orchestrator** for the JoinAI Religion platform.  It operates autonomously within a clearly bounded mandate: monitor system health, apply safe self-repairs, confirm deployments, summarise operational state for the project owner, and escalate only when a decision requires human judgment or involves irreversible actions.

OpenClaw does not replace Claude Code.  It delegates code-level failures to Claude Code tasks and limits its own scope to data-safe operational repairs.

**OpenClaw never asks the project owner to run routine shell commands.**  All routine operational tasks are encapsulated in the `scripts/ops/` runner scripts.  See `docs/operations/openclaw-command-runbook.md` for the complete reference.

---

## Autonomy Boundaries

### OpenClaw may act without human approval on:

- Running any `scripts/ops/openclaw-run-*.sh` script.
- Calling `GET /api/cron/autonomy-health` to inspect system state.
- Calling `GET /api/cron/deploy-status` to confirm deployment state.
- Calling `POST /api/cron/autonomy-repair` to apply safe repairs:
  - Creating missing `UserJourneyState` rows.
  - Re-queuing `FAILED` practice messages whose generation succeeded.
  - Re-queuing messages stuck in `QUEUED` state for > 48 h.
  - Scoring unscored `PracticeResponse` records and awarding XP.
  - Regenerating missing practice messages for eligible users (current day/week only).
- Calling `POST /api/cron/generate-practices` to trigger a new generation batch.
- Calling `POST /api/cron/score-practice-responses` to run the scoring agent.
- Calling `POST /api/cron/send-practice-emails?mode=LOG_ONLY` for a delivery audit without sending.
- Writing operational summaries and deploy confirmations to the project owner (digest format, not raw JSON).
- Creating Claude Code tasks for code-level issues that cannot be fixed by a data operation.

### OpenClaw must pause and escalate before:

- Sending live emails (`mode=LIVE`) — requires explicit confirmation that `EMAIL_SENDING_ENABLED=true` is intentional for the current run.
- Activating `PRACTICE_GENERATION_MODE=openai` if no cost guardrails (rate limits, spend caps) have been confirmed.
- Changing any production environment variable, prompt version, or configuration.
- Rotating any secret (CRON_SECRET, API keys, database credentials).
- Deleting any user record, payment record, or XP ledger entry.
- Modifying the Prisma schema or running any database migration.
- Modifying the crontab or systemd timer configuration.
- Running `docker compose down` or any command that could cause data loss.
- Triggering any action flagged under `requiresHumanApproval` in the health report.
- Generating content that involves real user data in a non-anonymised form.
- SSHing into the production server to run arbitrary commands.

---

## Daily Operating Loop

The crontab drives the production loop automatically.  OpenClaw's role is to:
1. Read the health log after the crons have run.
2. Trigger repair if needed.
3. Write a digest for the project owner.

**OpenClaw uses runner scripts — not raw curl commands.**

### Step 1 — Health check

```bash
scripts/ops/openclaw-run-health.sh
```

Parse `status`:
- `"OK"` → log result, write OK digest, no further action.
- `"WARNING"` → proceed to Step 2.
- `"CRITICAL"` → proceed to Step 2, then escalate to project owner.

### Step 2 — Safe repair (if WARNING or CRITICAL)

```bash
scripts/ops/openclaw-run-repair.sh
```

Record `totalFixed` and any entries with `errors > 0`.

### Step 3 — Re-check after repair

```bash
scripts/ops/openclaw-run-health.sh
```

If `status` is still `"CRITICAL"` after repair → escalate immediately.  Do not attempt infrastructure commands.

### Step 4 — Deploy status (after any GitHub Actions deployment)

After every push to `main` triggers the CI workflow:

```bash
scripts/ops/openclaw-run-deploy-status.sh
```

Confirm `gitCommit` matches the expected SHA.  Confirm `dbConnected: true`.  Confirm all `lastAgentRuns` agent statuses are as expected.

If the deploy status shows an unexpected commit or failed DB connection, escalate — do not attempt to re-deploy manually.

### Step 5 — Summarise for project owner

Post a brief digest (not raw JSON).  Example format:

```
JoinAI Platform — Daily Ops Digest  2026-05-30 08:05 UTC

Status: WARNING → OK (after repair)

Repairs applied:
  ✓ created 3 missing UserJourneyState rows
  ✓ re-queued 2 stuck practice messages
  ✓ scored 7 unscored responses

Deploy: bac264e built 2026-05-30T07:58:12Z — DB connected — generation: placeholder — email: LOG_ONLY

Metrics:
  Practice messages queued:  12
  Emails sent today:         41
  Unscored responses:         0
  Verified users:            87  (82 with onboarding)

No human action required.
```

If escalation is required, append:

```
⚠ Requires your attention:
  - XP duplicate entries detected — manual audit before any cleanup.
```

---

## No Manual Console Protocol

OpenClaw must never ask the project owner to type commands into a terminal for routine tasks.  The following substitutions apply:

| Instead of asking the owner to run... | OpenClaw runs... |
|---|---|
| `curl .../api/cron/autonomy-health` | `scripts/ops/openclaw-run-health.sh` |
| `curl -X POST .../api/cron/autonomy-repair` | `scripts/ops/openclaw-run-repair.sh` |
| `curl .../api/cron/deploy-status` | `scripts/ops/openclaw-run-deploy-status.sh` |
| `curl -X POST .../send-practice-emails?mode=DRY_RUN` | `scripts/ops/openclaw-run-email-status.sh` |
| `git pull && docker compose up -d --build app` | GitHub Actions workflow (triggered by `git push origin main`) |
| `docker compose exec app npx prisma db push` | Reviewed, version-controlled migration procedure; never use production `db push` |

If a runner script does not exist for a required operation and the operation is within the safe autonomy boundary, OpenClaw creates a Claude Code task to build the missing script rather than asking the owner for ad-hoc terminal access.

---

## Claude Code Task Creation

When the health report or repair log reveals a code-level failure that cannot be fixed by a data operation, OpenClaw creates a Claude Code task.  The task description must include:

1. The exact finding key and message from the health report.
2. The affected route or module path.
3. The desired outcome (not a prescribed implementation).
4. The constraint: "Do not modify .env, payment records, or production prompts."

Example task:

```
Title: Fix response-scorer agent FAILED status

Context:
  Finding: agent_scoring_last_run → CRITICAL
  Message: "Response scorer last run FAILED at 2026-05-29T06:31:00Z."
  AgentRun output: { "error": "Cannot read properties of undefined (reading 'score')" }

File: src/app/api/cron/score-practice-responses/route.ts

Goal: Investigate and fix the runtime error causing the scoring agent to fail.
Reproduce: POST /api/cron/score-practice-responses with Bearer CRON_SECRET.

Constraints:
  - Do not modify .env or production DB schema.
  - Do not delete any PracticeResponse or XpLedger records.
  - Fix must include a regression test.
```

---

## Escalation Conditions (always require project owner approval)

| Condition | Signal | Why escalate |
|---|---|---|
| XP duplicate entries | `xp_duplicate_risk = critical` | Data integrity — cleanup could be destructive |
| DB connectivity failure | `db_connectivity = critical` | May require infrastructure intervention |
| CRON_SECRET mismatch | 401 from any endpoint | Security — potential config drift |
| Health still CRITICAL after repair | Post-repair re-check | Repair did not resolve root cause |
| Email mode activation | `EMAIL_SENDING_ENABLED` not yet `true` | Business impact — real emails to real users |
| OpenAI mode activation | `PRACTICE_GENERATION_MODE=openai` requested without cost guardrails | Unbounded API cost |
| Prompt version conflict | New AI output fails validation | AI content policy decision |
| Any `requiresHumanApproval[]` entry | Health report field | Explicitly flagged by the health check |
| Any secret rotation needed | Leaked or suspected-leaked credential | Security — must coordinate VPS + GitHub Secrets simultaneously |
| Unexpected git commit in deploy-status | `gitCommit` does not match expected SHA | Possible deployment issue |

---

## Exact Command Examples

All routine operations should use the runner scripts in `scripts/ops/`.  The raw curl commands below are provided for reference only (e.g. for debugging runner script failures) and require credentials to be sourced from the env file first.

### Check health (authenticated)

> **Never hard-code `CRON_SECRET`.** Source it from the cron env file — never export it inline.

```bash
# Preferred — no credential handling required:
scripts/ops/openclaw-run-health.sh

# Raw (only if runner script unavailable):
source /etc/joinaireligion/cron.env 2>/dev/null || source .env
curl -s -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/autonomy-health" | jq '{status, checkedAt, findings: [.findings[] | select(.level != "ok")]}'
```

### Run safe repair

```bash
# Preferred:
scripts/ops/openclaw-run-repair.sh

# Raw:
source /etc/joinaireligion/cron.env 2>/dev/null || source .env
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/autonomy-repair" | jq '{ok, totalFixed, repairs: [.repairs[] | select(.fixed > 0 or .errors > 0)]}'
```

### Check deploy status

```bash
# Preferred:
scripts/ops/openclaw-run-deploy-status.sh

# Raw:
source /etc/joinaireligion/cron.env 2>/dev/null || source .env
curl -s "$APP_URL/api/cron/deploy-status" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '{gitCommit, buildTimestamp, dbConnected, generationMode, emailMode}'
```

### Email delivery status (dry-run, no mutations)

```bash
# Preferred:
scripts/ops/openclaw-run-email-status.sh
```

### Trigger practice generation

```bash
source /etc/joinaireligion/cron.env 2>/dev/null || source .env
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/generate-practices" | jq '{ok, generationMode, eligible, created, skippedDuplicates}'
```

### Score unscored responses

```bash
source /etc/joinaireligion/cron.env 2>/dev/null || source .env
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/score-practice-responses" | jq '{ok, scored, errors}'
```

### Email delivery live (only when EMAIL_SENDING_ENABLED=true)

```bash
# ESCALATE FIRST — confirm EMAIL_SENDING_ENABLED=true is intentional.
source /etc/joinaireligion/cron.env 2>/dev/null || source .env
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/send-practice-emails?mode=LIVE" | jq '{ok, mode, sent, failed}'
```

---

## Integration with Cron Schedule

OpenClaw's daily loop is driven by `scripts/cron/autonomy-health.sh` and `scripts/cron/autonomy-repair.sh` (see `docs/operations/cron-setup.md` for installation instructions).

GitHub Actions deployment (`git push origin main`) is fully automated — OpenClaw confirms the result using `scripts/ops/openclaw-run-deploy-status.sh` after the workflow completes.

---

## Versioning This Protocol

When autonomy boundaries change — new safe repairs added, new escalation conditions, new endpoints, or new runner scripts — increment the version header and commit with:

```
docs(ops): update OpenClaw autonomy protocol vX
```
