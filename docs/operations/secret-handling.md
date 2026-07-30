# Secret Handling — JoinAI Religion Platform

Operational security reference for managing environment variables, API keys, and credentials on the production VPS and in CI/CD pipelines.

---

## 1. Secrets Inventory

| Secret | Where set | Rotation trigger |
|---|---|---|
| `CRON_SECRET` | VPS `/etc/joinaireligion/cron.env` + app `.env` + GitHub Secrets | On any suspected leak; after every team change |
| `DATABASE_URL` | VPS app `.env` only | On any suspected leak; at DB provider credential rotation |
| `OPENAI_API_KEY` | VPS app `.env` only | On any suspected leak; monthly if cost anomalies observed |
| `RESEND_API_KEY` | VPS app `.env` only | On any suspected leak; if bounce/spam signals appear |
| `STRIPE_SECRET_KEY` | VPS app `.env` only | On any suspected leak; via Stripe dashboard immediately |
| `STRIPE_WEBHOOK_SECRET` | VPS app `.env` only | When webhook endpoint URL changes or key is suspected leaked |
| `PINTEREST_APP_SECRET` | VPS app `.env` only | On suspected disclosure or Pinterest app-secret reset |
| `PINTEREST_ACCESS_TOKEN` | VPS app `.env` only | Automatically refreshed weekly; immediately on invalidation or disclosure |
| `PINTEREST_REFRESH_TOKEN` | VPS app `.env` only | Atomically replaced with every successful refresh; owner OAuth if expired or invalid |
| `VPS_SSH_KEY` | GitHub Secrets only | When SSH key is rotated or team member leaves |

---

## 2. The Non-Negotiable Rules

1. **Never print a secret value to a terminal, log file, or CI/CD output.**  All checks are existence-only — verify a variable is set, not what it contains.
2. **Never commit a `.env` file to git.**  The `.gitignore` blocks this; enforce it with the check in §5.
3. **Never inline a secret in a shell script, cron entry, or documentation example.**  Always load from a file using `source`.
4. **Never pass secrets as command-line arguments.**  They appear in `ps aux` and shell history.  Pass them as environment variables.
5. **If a secret is observed in a log, terminal, or commit — rotate it immediately.**  See §4.

---

## 3. Safe Existence Checks

Use these patterns to verify secrets are configured without revealing their values.

### Check that an env var is set (no value printed)

```bash
# ✓ Safe — prints only "set" or "MISSING"
[ -n "${CRON_SECRET:-}" ] && echo "CRON_SECRET: set" || echo "CRON_SECRET: MISSING"
[ -n "${OPENAI_API_KEY:-}" ] && echo "OPENAI_API_KEY: set" || echo "OPENAI_API_KEY: MISSING"
[ -n "${RESEND_API_KEY:-}" ] && echo "RESEND_API_KEY: set" || echo "RESEND_API_KEY: MISSING"
[ -n "${DATABASE_URL:-}" ] && echo "DATABASE_URL: set" || echo "DATABASE_URL: MISSING"
[ -n "${STRIPE_SECRET_KEY:-}" ] && echo "STRIPE_SECRET_KEY: set" || echo "STRIPE_SECRET_KEY: MISSING"
```

```bash
# ✗ UNSAFE — prints the actual value
echo $CRON_SECRET
echo "Key is: $OPENAI_API_KEY"
```

### Check that no .env is tracked by git

```bash
# ✓ Lists filenames only — never prints file content
git ls-files | grep -E "^\.env"
# Expected: empty output (no tracked .env files)
```

### Check that no secret-bearing files were accidentally committed

```bash
# ✓ Lists commit hashes and messages only — never prints file content
git log --all --oneline -- .env '*.env*' | head -5
# Expected: empty output
```

```bash
# ✗ UNSAFE — prints full diff including secret values if committed
git log --all -p | grep -E "CRON_SECRET|API_KEY|DATABASE_URL"
```

### Verify CRON_SECRET header round-trip (presence check via HTTP status)

```bash
# ✓ Safe — uses $CRON_SECRET from env, checks HTTP status only
source /etc/joinaireligion/cron.env 2>/dev/null
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://joinaireligion.com/api/admin/autonomy/health)
[ "$HTTP" = "200" ] && echo "CRON_SECRET: valid" || echo "CRON_SECRET: INVALID (HTTP $HTTP)"
```

---

## 4. Rotation Procedures

### When to rotate
- Any secret is observed in plaintext in a terminal, log file, CI output, or git diff.
- A team member with secret access leaves.
- Any third-party service (Resend, OpenAI, Stripe) reports suspicious activity.
- Routine rotation (quarterly minimum for all secrets).

### CRON_SECRET rotation

```bash
# 1. Generate a new high-entropy secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update the VPS env file (existence-check approach — do not echo $NEW_SECRET)
sudo sed -i "s/^CRON_SECRET=.*/CRON_SECRET=${NEW_SECRET}/" /etc/joinaireligion/cron.env
sudo sed -i "s/^CRON_SECRET=.*/CRON_SECRET=${NEW_SECRET}/" /opt/apps/joinaireligion/.env

# 3. Update GitHub Secrets via gh CLI (no value printed to terminal)
gh secret set CRON_SECRET --body "$NEW_SECRET"

# 4. Restart the app container to pick up the new value
cd /opt/apps/joinaireligion && docker compose up -d app

# 5. Verify the new secret works (existence check via HTTP status)
source /etc/joinaireligion/cron.env
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://joinaireligion.com/api/admin/autonomy/health)
echo "Health check: HTTP $HTTP"

# Discard NEW_SECRET from shell history
unset NEW_SECRET
```

### OPENAI_API_KEY rotation

> **If an OpenAI API key is leaked, the key must be invalidated at [platform.openai.com](https://platform.openai.com/api-keys) before updating the environment.**  An attacker with an active key can generate content and incur charges until the key is revoked.

```bash
# 1. Immediately revoke the old key at platform.openai.com/api-keys
# 2. Generate a new key there
# 3. Update VPS .env (do NOT echo the new key value)
sudo sed -i "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=NEW_VALUE_HERE/" /opt/apps/joinaireligion/.env
# Replace NEW_VALUE_HERE by editing the file directly in a text editor
sudo nano /opt/apps/joinaireligion/.env

# 4. Restart the app
cd /opt/apps/joinaireligion && docker compose up -d app

# 5. Confirm generation mode works (does not reveal the key)
curl -sf -H "Authorization: Bearer ${CRON_SECRET}" \
  https://joinaireligion.com/api/admin/autonomy/deploy-status \
  | jq '{generationMode, openaiKeyPresent}'
```

### RESEND_API_KEY rotation

> **If a Resend API key is leaked, revoke it at [resend.com/api-keys](https://resend.com/api-keys) immediately.**  An attacker with an active Resend key can send email from your domain, damaging deliverability and sender reputation.

Follow the same pattern as OPENAI_API_KEY above — revoke first, then update `.env`, then restart.

### Stripe keys

Stripe key rotation is handled entirely through the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).  After rotating:
1. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the VPS `.env`.
2. Update the webhook endpoint signing secret if the endpoint URL changed.
3. Restart the app container.
4. Confirm with a test payment in Stripe's test environment before switching live.

---

## 5. Pre-Deploy Security Gate Checklist

Run before every significant deployment and on a regular schedule.

```bash
# ── Existence checks (no values printed) ───────────────────────────────────
source /opt/apps/joinaireligion/.env 2>/dev/null

for VAR in CRON_SECRET DATABASE_URL OPENAI_API_KEY RESEND_API_KEY STRIPE_SECRET_KEY; do
  [ -n "${!VAR:-}" ] && echo "  ✓ $VAR: set" || echo "  ✗ $VAR: MISSING"
done

# ── Git hygiene ─────────────────────────────────────────────────────────────
echo "── Tracked .env files:"
git ls-files | grep -E "^\.env" | head -5 || echo "  ✓ none"

echo "── Commits touching .env files:"
git log --all --oneline -- .env '*.env*' | head -5 || echo "  ✓ none"

echo "── .gitignore covers .env:"
grep -q "^\.env" .gitignore && echo "  ✓ .env is gitignored" || echo "  ✗ .env is NOT in .gitignore"
```

---

## 6. CI/CD Secret Handling

Secrets are stored in GitHub repository settings as **Actions secrets** (Settings → Secrets and variables → Actions).  They are injected into workflow steps as environment variables and are **masked in all CI logs** by GitHub — any accidental `echo $SECRET_VAR` in a workflow step prints `***`.

Required GitHub secrets for the deploy pipeline:

| Secret name | Description |
|---|---|
| `VPS_HOST` | IP address or hostname of the production VPS |
| `VPS_USER` | SSH user (typically `root` or `deploy`) |
| `VPS_SSH_KEY` | Full PEM private key (public half must be in `~/.ssh/authorized_keys` on VPS) |
| `VPS_PORT` | SSH port (default `22`) |
| `VPS_APP_DIR` | Absolute path on VPS (e.g. `/opt/apps/joinaireligion`) |
| `PRODUCTION_URL` | Full origin, no trailing slash (e.g. `https://joinaireligion.com`) |
| `CRON_SECRET` | Shared secret for health/repair endpoint auth (optional — enables autonomy post-deploy check) |

**Secrets are never printed to workflow logs.**  The deploy workflow uses `${{ secrets.VPS_HOST }}` syntax which GitHub masks automatically.

---

## 7. What OpenClaw May and May Not Do

OpenClaw (the autonomous operations agent) operates under the following secret constraints:

**May do:**
- Call API endpoints authenticated with `$CRON_SECRET` sourced from the env file — value never logged.
- Run existence checks to confirm secrets are configured.
- Report secret misconfiguration as a health finding (e.g. `OPENAI_API_KEY` missing).

**Must escalate to the project owner:**
- Any secret rotation (CRON_SECRET, API keys, database credentials).
- Any action that would cause live email sending to be enabled.
- Any change to production environment variables.
- Any situation where a secret value may have been exposed.

---

## 8. Related Documentation

- `docs/operations/cron-setup.md` — VPS cron env file setup and log rotation.
- `docs/operations/openclaw-autonomy.md` — OpenClaw operator protocol.
- `docs/operations/openclaw-command-runbook.md` — Safe runner scripts for all operational tasks.
- `.github/workflows/deploy.yml` — CI/CD pipeline with masked secrets.
