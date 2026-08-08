# Cron Setup — JoinAI Religion Platform

Operational reference for configuring and managing the scheduled job pipeline on the production VPS.  All cron scripts live in `scripts/cron/` and call HTTPS endpoints secured with `CRON_SECRET`.

---

## Architecture Overview

```
VPS crontab
  ├─ 06:00 UTC  generate-practices.sh        → POST /api/cron/generate-practices
  ├─ 07:00 UTC  send-practice-emails.sh      → POST /api/cron/send-practice-emails
  ├─ 07:30 UTC  autonomy-health.sh           → GET  /api/cron/autonomy-health
  ├─ 07:35 UTC  autonomy-repair.sh           → POST /api/cron/autonomy-repair
  ├─ */1  UTC   score-practice-responses.sh  → POST /api/cron/score-practice-responses
  └─ */5  UTC   system-health.sh             → GET  /api/health
```

Each script reads credentials from `/etc/joinaireligion/cron.env`, which is readable only by the `joinai` service account.  No secrets appear in crontab itself.

---

## 1. First-time VPS Setup

### 1.1 Create the service account (if not already present)

```bash
sudo useradd --system --shell /usr/sbin/nologin --home /opt/joinaireligion joinai
```

### 1.2 Install scripts

```bash
sudo mkdir -p /opt/joinaireligion/scripts/cron
sudo cp scripts/cron/*.sh /opt/joinaireligion/scripts/cron/
sudo chmod 750 /opt/joinaireligion/scripts/cron/*.sh
sudo chown -R joinai:joinai /opt/joinaireligion/scripts
```

### 1.3 Create the environment file

```bash
sudo mkdir -p /etc/joinaireligion
sudo tee /etc/joinaireligion/cron.env > /dev/null <<'EOF'
APP_URL=http://127.0.0.1:3001
CRON_SECRET=REPLACE_WITH_YOUR_CRON_SECRET
ALERT_EMAIL=ops@joinaireligion.com
EOF
sudo chmod 600 /etc/joinaireligion/cron.env
sudo chown joinai:joinai /etc/joinaireligion/cron.env
```

> **Security note:** `CRON_SECRET` must match `CRON_SECRET` in the application's `.env` on the server.  Never commit `/etc/joinaireligion/cron.env` to version control.

### 1.4 Create the log directory

```bash
sudo mkdir -p /var/log/joinaireligion
sudo chown joinai:joinai /var/log/joinaireligion
```

### 1.5 Set up log rotation

```bash
sudo tee /etc/logrotate.d/joinaireligion > /dev/null <<'EOF'
/var/log/joinaireligion/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 joinai joinai
}
EOF
```

---

## 2. Install the Crontab

**Do not edit the system crontab automatically.**  After completing the steps above, open the `joinai` user's crontab manually:

```bash
sudo crontab -u joinai -e
```

Paste the following block exactly (all times are UTC):

```cron
# JoinAI Religion — practice pipeline
# Environment override (cron strips most env; source explicitly in each script)
JOINAI_ENV_FILE=/etc/joinaireligion/cron.env

# 1. Generate practice messages for eligible users — daily at 06:00 UTC
0 6 * * * /opt/joinaireligion/scripts/cron/generate-practices.sh >> /var/log/joinaireligion/cron.log 2>&1

# 2. Send queued practice emails — daily at 07:00 UTC (1 hr after generation)
0 7 * * * /opt/joinaireligion/scripts/cron/send-practice-emails.sh >> /var/log/joinaireligion/cron.log 2>&1

# 3. Score practice responses and award XP — every hour at :30
30 * * * * /opt/joinaireligion/scripts/cron/score-practice-responses.sh >> /var/log/joinaireligion/cron.log 2>&1

# 4. OpenClaw autonomy health probe — 07:30 UTC (30 min after email delivery)
30 7 * * * /opt/joinaireligion/scripts/cron/autonomy-health.sh >> /var/log/joinaireligion/autonomy.log 2>&1

# 5. OpenClaw safe repair — 07:35 UTC (5 min after health probe)
35 7 * * * /opt/joinaireligion/scripts/cron/autonomy-repair.sh >> /var/log/joinaireligion/autonomy.log 2>&1

# 6. System health probe — every 5 minutes
*/5 * * * * /opt/joinaireligion/scripts/cron/system-health.sh >> /var/log/joinaireligion/health.log 2>&1
```

Verify the crontab was saved:

```bash
sudo crontab -u joinai -l
```

---

## 3. Dry-Run Examples

Run any script in dry-run mode to confirm the endpoint URL and masked auth header — no HTTP request is made:

```bash
# As the joinai user (or with sudo -u joinai)
DRY_RUN=1 /opt/joinaireligion/scripts/cron/generate-practices.sh
DRY_RUN=1 /opt/joinaireligion/scripts/cron/send-practice-emails.sh
DRY_RUN=1 EMAIL_MODE=LOG_ONLY /opt/joinaireligion/scripts/cron/send-practice-emails.sh
DRY_RUN=1 /opt/joinaireligion/scripts/cron/score-practice-responses.sh
DRY_RUN=1 /opt/joinaireligion/scripts/cron/system-health.sh
```

Expected dry-run output (example):

```
[generate-practices] DRY_RUN — would execute:
  curl --silent --show-error --fail-with-body --max-time 120 --retry 2 --retry-delay 5 \
    -X POST \
    -H 'Authorization: Bearer ***' \
    -H 'Content-Type: application/json' \
    'https://joinaireligion.com/api/cron/generate-practices'
```

---

## 4. Manual Execution

To run a script once immediately (live, not dry-run) as the service account:

```bash
sudo -u joinai /opt/joinaireligion/scripts/cron/generate-practices.sh
sudo -u joinai /opt/joinaireligion/scripts/cron/send-practice-emails.sh
sudo -u joinai EMAIL_MODE=LOG_ONLY /opt/joinaireligion/scripts/cron/send-practice-emails.sh
sudo -u joinai /opt/joinaireligion/scripts/cron/score-practice-responses.sh
```

For email delivery, prefer `EMAIL_MODE=LOG_ONLY` for the first manual run to confirm subjects and counts before `EMAIL_MODE=LIVE`.

---

## 5. Health Verification

### 5.1 Check the health endpoint directly

```bash
curl -s https://joinaireligion.com/api/health | python3 -m json.tool
```

Expected:

```json
{ "ok": true, "db": "connected", "version": "..." }
```

### 5.2 Tail the cron log in real time

```bash
sudo tail -f /var/log/joinaireligion/cron.log
sudo tail -f /var/log/joinaireligion/health.log
```

### 5.3 Confirm last run times

```bash
sudo grep -E "(START|DONE|FAIL)" /var/log/joinaireligion/cron.log | tail -20
```

### 5.4 Verify AgentRun records in the database

Connect to the production database via the application server's SSH tunnel:

```bash
ssh -L 5432:localhost:5432 deploy@joinaireligion.com
# In another terminal:
psql "$DATABASE_URL" -c \
  "SELECT agent_name, status, started_at, duration_ms, output
   FROM agent_runs
   ORDER BY started_at DESC
   LIMIT 10;"
```

### 5.5 Check PracticeMessage queue depth

```bash
psql "$DATABASE_URL" -c \
  "SELECT delivery_status, COUNT(*)
   FROM practice_messages
   WHERE scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
   GROUP BY delivery_status
   ORDER BY delivery_status;"
```

### 5.6 Check XP ledger integrity (no duplicate sources)

```bash
psql "$DATABASE_URL" -c \
  "SELECT source, source_id, COUNT(*) AS n
   FROM xp_ledger
   GROUP BY source, source_id
   HAVING COUNT(*) > 1
   LIMIT 10;"
```

A result with zero rows confirms idempotency is intact.

---

## 6. Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_URL` | Yes | — | Local application URL, normally `http://127.0.0.1:3001`; this stays inside the hardened systemd network boundary. |
| `CRON_SECRET` | Yes | — | Shared secret; must match the app's `CRON_SECRET` |
| `EMAIL_MODE` | No | `LIVE` | `LIVE`, `LOG_ONLY`, or `DRY_RUN` for email delivery script |
| `ALERT_EMAIL` | No | — | Address to notify if `system-health.sh` fails |
| `HEALTH_PATH` | No | `/api/health` | Health endpoint path override |
| `JOINAI_ENV_FILE` | No | `/etc/joinaireligion/cron.env` | Path to the env file to source |

---

## 7. Systemd Timer Alternative (optional)

If the VPS runs systemd, timers can replace crontab for better logging and dependency management.  Example for `generate-practices`:

```ini
# /etc/systemd/system/joinai-generate-practices.service
[Unit]
Description=JoinAI — generate practice messages
After=network-online.target

[Service]
Type=oneshot
User=joinai
EnvironmentFile=/etc/joinaireligion/cron.env
ExecStart=/opt/joinaireligion/scripts/cron/generate-practices.sh
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/joinai-generate-practices.timer
[Unit]
Description=JoinAI — generate practices daily at 06:00 UTC

[Timer]
OnCalendar=*-*-* 06:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now joinai-generate-practices.timer
sudo systemctl list-timers joinai-*
```

---

## 8. Troubleshooting

**Script exits 2 — curl error**
Confirm the application is reachable: `curl -I https://joinaireligion.com/api/health`  
Verify `APP_URL` has no trailing slash issues: `echo $APP_URL`

**401 Unauthorized from endpoint**
`CRON_SECRET` in `cron.env` does not match the value in the application environment.  Regenerate and update both locations simultaneously.

**Empty log file**
The `joinai` user may not have write permission to `/var/log/joinaireligion/`.  Fix: `sudo chown joinai:joinai /var/log/joinaireligion`.

**Duplicate XP entries**
This should not occur due to the `(source, sourceId)` idempotency check in `XpLedger`.  If detected via the query in §5.6, inspect the `agent_runs` table for overlapping scoring runs.

**practice_messages stuck in QUEUED**
`send-practice-emails.sh` may not have run or `EMAIL_SENDING_ENABLED` is not `true` in the app environment.  Check `cron.log` for the most recent send run and confirm the app's email configuration.


---

## 9. Autonomy Scripts

The two autonomy scripts provide OpenClaw's daily self-check and repair loop.

### 9.1 autonomy-health.sh

Calls `GET /api/cron/autonomy-health` with the cron token and logs structured JSON. Exits 2 on CRITICAL status and optionally emails `ALERT_EMAIL`.

```bash
# Dry-run
DRY_RUN=1 /opt/joinaireligion/scripts/cron/autonomy-health.sh

# Live
sudo -u joinai /opt/joinaireligion/scripts/cron/autonomy-health.sh
```

### 9.2 autonomy-repair.sh

Calls `POST /api/cron/autonomy-repair`.  Safe, idempotent.  Logs `totalFixed` count.

```bash
# Dry-run
DRY_RUN=1 /opt/joinaireligion/scripts/cron/autonomy-repair.sh

# Live
sudo -u joinai /opt/joinaireligion/scripts/cron/autonomy-repair.sh
```

---

## 10. Production Readiness Checklist

Complete this checklist before going live or after any significant deployment.

### Infrastructure
- [ ] VPS is running, SSH access confirmed.
- [ ] `/etc/joinaireligion/cron.env` exists, is `chmod 600`, owned by `joinai`.
- [ ] `APP_URL`, `CRON_SECRET` are set in `cron.env`.
- [ ] All scripts copied to `/opt/joinaireligion/scripts/cron/` and `chmod 750`.
- [ ] `/var/log/joinaireligion/` exists and is writable by `joinai`.
- [ ] Log rotation configured (`/etc/logrotate.d/joinaireligion`).

### Crontab
- [ ] `sudo crontab -u joinai -l` shows all 6 entries (generate, send, score, autonomy-health, autonomy-repair, health).
- [ ] No secrets appear in crontab output.

### Application
- [ ] `DATABASE_URL` is set correctly in application `.env`.
- [ ] `CRON_SECRET` in application `.env` matches `cron.env`.
- [ ] `EMAIL_SENDING_ENABLED` is set to `true` only when Resend is configured.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` are set if email sending is enabled.
- [ ] `OPENAI_API_KEY` is set if `PRACTICE_GENERATION_MODE=openai`.
- [ ] `ADMIN_EMAILS` includes at least one valid admin address.
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain.

### Verification commands
```bash
# 1. Health endpoint
curl -s "https://joinaireligion.com/api/health" | python3 -m json.tool

# 2. Autonomy health
sudo -u joinai /opt/joinaireligion/scripts/cron/autonomy-health.sh

# 3. Practice generation dry-run
DRY_RUN=1 sudo -u joinai /opt/joinaireligion/scripts/cron/generate-practices.sh

# 4. Email delivery dry-run
DRY_RUN=1 sudo -u joinai /opt/joinaireligion/scripts/cron/send-practice-emails.sh

# 5. Scoring dry-run
DRY_RUN=1 sudo -u joinai /opt/joinaireligion/scripts/cron/score-practice-responses.sh

# 6. Autonomy repair dry-run
DRY_RUN=1 sudo -u joinai /opt/joinaireligion/scripts/cron/autonomy-repair.sh

# 7. Admin dashboard
# Visit https://joinaireligion.com/admin/autonomy (admin login required)
```

### Security gates
- [ ] No `.env` file committed to git (`git ls-files | grep -E "\.env$"` returns empty).
- [ ] No `.env` files tracked by git (`git ls-files | grep -E "^\.env"` returns empty — existence check only, never print values).
- [ ] No secret-bearing commits (`git log --all --oneline -- .env '*.env*' | head -5` returns empty — lists filenames only, never prints file content).
- [ ] `npm run test:ci` passes in CI/CD pipeline.
- [ ] `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json` passes.

### Data safety
- [ ] No migration run without backup.
- [ ] XP ledger duplicate check returns 0 rows (see §5.6).
- [ ] `UserJourneyState` count equals verified user count (or repair has been run).
