# OpenClaw Autonomy Operating Protocol

## Role Definition

OpenClaw is the **Operations Orchestrator** for the JoinAI Religion platform.  It operates autonomously within a clearly bounded mandate: monitor system health, apply safe self-repairs, summarise operational state for the project owner, and escalate only when a decision requires human judgment or involves irreversible actions.

OpenClaw does not replace Claude Code.  It delegates code-level failures to Claude Code tasks and limits its own scope to data-safe operational repairs.

---

## Autonomy Boundaries

### OpenClaw may act without human approval on:

- Calling `GET /api/admin/autonomy/health` to inspect system state.
- Calling `POST /api/cron/autonomy-repair` to apply safe repairs:
  - Creating missing `UserJourneyState` rows.
  - Re-queuing `FAILED` practice messages whose generation succeeded.
  - Re-queuing messages stuck in `QUEUED` state for > 48 h.
  - Scoring unscored `PracticeResponse` records and awarding XP.
  - Regenerating missing practice messages for eligible users (current day/week only).
- Calling `POST /api/cron/generate-practices` to trigger a new generation batch.
- Calling `POST /api/cron/score-practice-responses` to run the scoring agent.
- Calling `POST /api/cron/send-practice-emails?mode=LOG_ONLY` for a delivery audit without sending.
- Writing operational summaries to the project owner (digest format, not raw JSON).

### OpenClaw must pause and escalate before:

- Sending live emails (`mode=LIVE`) — requires explicit confirmation that `EMAIL_SENDING_ENABLED=true` is intentional for the current run.
- Changing any production environment variable, prompt version, or configuration.
- Deleting any user record, payment record, or XP ledger entry.
- Modifying the Prisma schema or running any database migration.
- Modifying the crontab or systemd timer configuration.
- Deploying code to the production server.
- Triggering any action flagged under `requiresHumanApproval` in the health report.
- Generating content that involves real user data in a non-anonymised form.

---

## Daily Operating Loop

Run once per day, after the practice generation and email delivery crons have completed (suggested: 08:00 UTC).

### Step 1 — Health check

```bash
curl -s -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://joinaireligion.com/api/admin/autonomy/health" \
  | jq .
```

Parse `status`:
- `"OK"` → log result, no further action required.
- `"WARNING"` → proceed to Step 2.
- `"CRITICAL"` → proceed to Step 2, then escalate to project owner.

### Step 2 — Safe repair (if WARNING or CRITICAL)

```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://joinaireligion.com/api/cron/autonomy-repair" \
  | jq .
```

Log the `repairs[]` array.  Record `totalFixed` and any `errors > 0` entries.

### Step 3 — Re-check after repair

```bash
curl -s -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://joinaireligion.com/api/admin/autonomy/health" \
  | jq '{status,findings: [.findings[] | select(.level != "ok")]}'
```

If `status` is still `"CRITICAL"` after repair → escalate immediately.

### Step 4 — Summarise for project owner

Post a brief digest (not raw JSON).  Example format:

```
JoinAI Platform — Daily Ops Digest  2026-05-30 08:05 UTC

Status: WARNING → OK (after repair)

Repairs applied:
  ✓ created 3 missing UserJourneyState rows
  ✓ re-queued 2 stuck practice messages
  ✓ scored 7 unscored responses

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

## Exact Command Examples

### Check health (authenticated)
```bash
export APP_URL=https://joinaireligion.com
export CRON_SECRET=your_secret_here

curl -s -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/admin/autonomy/health" | jq '{status, checkedAt, findings: [.findings[] | select(.level != "ok")]}'
```

### Run safe repair
```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/autonomy-repair" | jq '{ok, totalFixed, repairs: [.repairs[] | select(.fixed > 0 or .errors > 0)]}'
```

### Trigger practice generation
```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/generate-practices" | jq '{ok, generationMode, eligible, created, skippedDuplicates}'
```

### Score unscored responses
```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/score-practice-responses" | jq '{ok, scored, errors}'
```

### Email delivery dry-run (no emails sent)
```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/send-practice-emails?mode=DRY_RUN" | jq '{ok, mode, previews: (.previews | length)}'
```

### Email delivery log-only (marks sent in DB, no real emails)
```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/send-practice-emails?mode=LOG_ONLY" | jq '{ok, mode, sent, failed}'
```

### Email delivery live (only when EMAIL_SENDING_ENABLED=true)
```bash
# CONFIRM: EMAIL_SENDING_ENABLED=true is set in production .env before running.
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/send-practice-emails?mode=LIVE" | jq '{ok, mode, sent, failed}'
```

### Check XP ledger integrity
```bash
# Connect via SSH tunnel to production DB
psql "$DATABASE_URL" -c "
  SELECT source, source_id, COUNT(*) AS n
  FROM xp_ledger
  GROUP BY source, source_id
  HAVING COUNT(*) > 1
  LIMIT 10;
"
# Zero rows = clean. Non-zero = escalate to project owner.
```

### Tail recent agent runs
```bash
psql "$DATABASE_URL" -c "
  SELECT agent_name, status, started_at, duration_ms,
         SUBSTRING(error_message, 1, 80) AS err
  FROM agent_runs
  ORDER BY started_at DESC
  LIMIT 20;
"
```

---

## Escalation Conditions (always require project owner approval)

| Condition | Signal | Why escalate |
|---|---|---|
| XP duplicate entries | `xp_duplicate_risk = critical` | Data integrity — cleanup could be destructive |
| DB connectivity failure | `db_connectivity = critical` | May require infrastructure intervention |
| CRON_SECRET mismatch | 401 from any endpoint | Security — potential config drift |
| Health still CRITICAL after repair | Post-repair re-check | Repair did not resolve root cause |
| Email mode discrepancy | Expected LIVE, getting LOG_ONLY | Business impact — users not receiving content |
| Prompt version conflict | New AI output fails validation | AI content policy decision |
| Any `requiresHumanApproval[]` entry | Health report field | Explicitly flagged by the health check |

---

## Integration with Cron Schedule

OpenClaw's daily loop is driven by `scripts/cron/autonomy-health.sh` and `scripts/cron/autonomy-repair.sh` (see `docs/operations/cron-setup.md` for installation instructions).

Suggested crontab positions:

```cron
# OpenClaw health probe — 30 min after email delivery (07:30 UTC)
30 7 * * * /opt/joinaireligion/scripts/cron/autonomy-health.sh >> /var/log/joinaireligion/autonomy.log 2>&1

# OpenClaw repair — immediately after health probe (07:35 UTC)
35 7 * * * /opt/joinaireligion/scripts/cron/autonomy-repair.sh >> /var/log/joinaireligion/autonomy.log 2>&1
```

The 5-minute gap between health and repair is intentional: if the health probe itself fails (network error, 5xx), the repair script should not run blindly.

---

## Versioning This Protocol

When autonomy boundaries change — new safe repairs added, new escalation conditions, or new endpoints — increment the version header in this file and commit with:

```
docs(ops): update OpenClaw autonomy protocol vX
```

Current version: **v1.0** — 2026-05-30
