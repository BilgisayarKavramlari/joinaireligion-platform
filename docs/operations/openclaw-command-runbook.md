# OpenClaw Command Runbook

This runbook defines the exact shell scripts that OpenClaw must use for every routine operational task.  **OpenClaw should never ask the project owner to run terminal commands for routine checks and repairs.**  All safe operations are encapsulated in the `scripts/ops/` runner scripts.

---

## 1. The Principle

Every operational action OpenClaw performs falls into one of three categories:

| Category | Example | OpenClaw action |
|---|---|---|
| **Routine** | Health check, safe repair, email status | Run the runner script directly |
| **Diagnostic** | Deploy status, agent run history | Run the runner script directly |
| **Escalation required** | Live email activation, secret rotation, destructive DB changes | Pause and notify project owner |

OpenClaw must never ask the owner to run `curl`, `docker`, `psql`, or `git` commands for routine tasks.  The runner scripts exist precisely to eliminate that friction.

---

## 2. Runner Scripts Reference

All scripts live in `scripts/ops/`.  They:
- Source credentials from `/etc/joinaireligion/cron.env` automatically (or `.env` if the cron file is absent).
- Never print secret values to stdout or stderr.
- Return machine-readable JSON to stdout.
- Accept `DRY_RUN=1` to verify configuration without making HTTP calls.
- Exit 0 on success, 1 on config error, 2 on HTTP/CRITICAL error.

### 2.1 Health Check

```bash
scripts/ops/openclaw-run-health.sh
```

Calls `GET /api/admin/autonomy/health`.  Returns the full structured health report as JSON.  Run this first in every daily loop.

**Interpreting output:**
- `"status": "OK"` → log result, no further action.
- `"status": "WARNING"` → run safe repair (§2.2).
- `"status": "CRITICAL"` → run safe repair (§2.2), then escalate to project owner.

**Example output:**
```json
{
  "status": "WARNING",
  "checkedAt": "2026-05-30T08:05:00.000Z",
  "findings": [
    { "key": "users_missing_journey_state", "level": "warning", "value": 3,
      "message": "3 verified user(s) have no UserJourneyState record." }
  ],
  "safeAutoFixActions": ["autonomy-repair: create missing UserJourneyState rows for verified users"],
  "recommendedActions": [],
  "requiresHumanApproval": []
}
```

### 2.2 Safe Repair

```bash
scripts/ops/openclaw-run-repair.sh
```

Calls `POST /api/cron/autonomy-repair`.  Applies all safe, idempotent data corrections.  Run after any WARNING or CRITICAL health status.

**What the repair does (all safe):**
- Creates missing `UserJourneyState` rows for verified users.
- Requeues `FAILED` practice messages whose generation succeeded.
- Requeues messages stuck in `QUEUED` state for > 48 h.
- Scores unscored `PracticeResponse` records and awards XP.
- Regenerates missing practice messages for eligible users (current period only).

**Example output:**
```json
{
  "ok": true,
  "totalFixed": 5,
  "repairs": [
    { "action": "create_journey_state", "fixed": 3, "errors": 0 },
    { "action": "requeue_stuck_messages", "fixed": 2, "errors": 0 }
  ]
}
```

### 2.3 Deploy Status

```bash
scripts/ops/openclaw-run-deploy-status.sh
```

Calls `GET /api/admin/autonomy/deploy-status`.  Returns the running git commit, build timestamp, DB connectivity, last agent runs, generation mode, and email mode.  Run after every GitHub Actions deployment to confirm the new version is live.

**Example output:**
```json
{
  "gitCommit": "bac264e",
  "buildTimestamp": "2026-05-30T07:58:12Z",
  "dbConnected": true,
  "generationMode": "placeholder",
  "emailMode": "LOG_ONLY",
  "emailSendingEnabled": false,
  "lastAgentRuns": {
    "practice-generator": { "status": "SUCCESS", "startedAt": "2026-05-30T06:00:05Z" },
    "practice-email-sender": { "status": "SUCCESS", "startedAt": "2026-05-30T07:00:08Z" },
    "response-scorer": { "status": "SUCCESS", "startedAt": "2026-05-30T07:30:02Z" }
  }
}
```

### 2.4 Email Status

```bash
scripts/ops/openclaw-run-email-status.sh
```

Calls `GET /api/admin/autonomy/health` (for last-run finding) and `POST /api/cron/send-practice-emails?mode=DRY_RUN` (for queue depth preview).  **Makes no mutations.**  Run to diagnose email delivery issues without triggering any real sends.

**Example output:**
```json
{
  "lastRun": {
    "key": "agent_email_last_run",
    "level": "ok",
    "message": "Email delivery last ran at 2026-05-30T07:00:08.000Z."
  },
  "preview": {
    "ok": true,
    "mode": "DRY_RUN",
    "queued": 12,
    "previews": [
      { "messageId": "...", "userId": "...", "to": "user@example.com",
        "subject": "Your daily practice — Compassion", "htmlLength": 4208 }
    ]
  }
}
```

---

## 3. Daily Operating Loop (automated)

The crontab drives this loop automatically.  OpenClaw reads the results from the log files.

| Time (UTC) | Script | What it does |
|---|---|---|
| 06:00 | `cron/generate-practices.sh` | Generates practice messages for eligible users |
| 07:00 | `cron/send-practice-emails.sh` | Sends queued messages |
| 07:30 | `cron/autonomy-health.sh` | Health probe → logs to `/var/log/joinaireligion/autonomy.log` |
| 07:35 | `cron/autonomy-repair.sh` | Safe repair if needed → same log |
| :30 (hourly) | `cron/score-practice-responses.sh` | Scores unscored responses |
| Every 5 min | `cron/system-health.sh` | Basic connectivity check |

When GitHub Actions deploys a new version, run:
```bash
scripts/ops/openclaw-run-deploy-status.sh
```
to confirm the new commit is live, then immediately run:
```bash
scripts/ops/openclaw-run-health.sh
```
to verify post-deploy system state.

---

## 4. Decision Tree for Common Situations

### Situation: "The health check reports WARNING"

```
1. scripts/ops/openclaw-run-health.sh   → read findings[]
2. scripts/ops/openclaw-run-repair.sh   → apply safe fixes
3. scripts/ops/openclaw-run-health.sh   → confirm status now OK
4. Write ops digest to project owner    → include totalFixed count
```

### Situation: "The health check reports CRITICAL"

```
1. scripts/ops/openclaw-run-health.sh   → identify critical finding(s)
2. scripts/ops/openclaw-run-repair.sh   → apply safe fixes (even for CRITICAL)
3. scripts/ops/openclaw-run-health.sh   → re-check
4. If still CRITICAL → ESCALATE to project owner with finding details
   (OpenClaw does NOT attempt infrastructure commands)
```

### Situation: "Email delivery showing 'never run' or WARNING"

```
1. scripts/ops/openclaw-run-email-status.sh  → diagnose queue depth + last-run
2. If queue > 0 and last-run is stale:
     scripts/ops/openclaw-run-repair.sh      → repair will requeue stuck messages
3. If EMAIL_SENDING_ENABLED is false:
     ESCALATE — live email activation requires human approval
```

### Situation: "A new version was just deployed via GitHub Actions"

```
1. scripts/ops/openclaw-run-deploy-status.sh → confirm gitCommit matches expected SHA
2. scripts/ops/openclaw-run-health.sh        → verify post-deploy system state
3. If status OK: write brief deploy confirmation to project owner
4. If status WARNING/CRITICAL: follow the CRITICAL/WARNING tree above
```

### Situation: "Practice generation not running"

```
1. scripts/ops/openclaw-run-health.sh    → check agent_generate_last_run finding
2. If FAILED: create a Claude Code task (see openclaw-autonomy.md §Claude Code Task Creation)
3. If > 24h stale: scripts/ops/openclaw-run-repair.sh (repair includes regeneration)
```

---

## 5. What OpenClaw Must NOT Do Without Human Approval

| Action | Why |
|---|---|
| Enable `EMAIL_SENDING_ENABLED=true` | Business impact — sends real emails to real users |
| Change `PRACTICE_GENERATION_MODE=openai` without cost guardrails | Unbounded API cost |
| Rotate any secret (CRON_SECRET, API keys, DB password) | Security — requires coordinated update across VPS + GitHub Secrets |
| Run `docker compose down` or `docker compose down -v` | Potential data loss |
| Run any `prisma migrate` command | Potentially destructive schema change |
| Delete any user, payment, XP ledger, or AgentRun record | Destructive |
| SSH into the VPS to run arbitrary commands | Infrastructure risk |
| Modify production `.env` directly | Config drift risk |
| Modify the crontab | Scheduling risk |

---

## 6. Environment Setup for Runner Scripts

The scripts load from `/etc/joinaireligion/cron.env` by default.  For local development, place a `.env` in the project root with:

```
APP_URL=https://joinaireligion.com
CRON_SECRET=<your-cron-secret>
```

Override the env file path:
```bash
JOINAI_ENV_FILE=/path/to/custom.env scripts/ops/openclaw-run-health.sh
```

Test configuration without making HTTP calls:
```bash
DRY_RUN=1 scripts/ops/openclaw-run-health.sh
DRY_RUN=1 scripts/ops/openclaw-run-repair.sh
DRY_RUN=1 scripts/ops/openclaw-run-deploy-status.sh
DRY_RUN=1 scripts/ops/openclaw-run-email-status.sh
```
