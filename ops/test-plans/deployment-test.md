# Test Plan: Deployment Verification

**Purpose:** Confirm that a deployment to production completed successfully, the correct code version is running, containers are healthy, and no regressions were introduced.

**Environment:** Production (`https://joinaireligion.com`)
**When to run:** Immediately after every GitHub Actions deployment.
**Estimated time:** 5–10 minutes
**Who runs this:** Test Agent or human

---

## Prerequisites

- GitHub Actions workflow has completed (green checkmark on the Actions page).
- SSH access to the VPS is available for container-level checks.
- The commit SHA being deployed is known (from the Actions run or `git log --oneline -1`).

---

## Test cases

### D-01 — GitHub Actions workflow completed successfully

**Steps:**
1. Open the GitHub repository → Actions tab.
2. Find the most recent run on the `main` branch.

**Expected:** Both `Build` and `Deploy to Production` jobs show a green ✔.
**Pass:** Both jobs green.
**Fail:** Either job is red or yellow (in-progress past expected completion).

---

### D-02 — Health endpoint returns 200

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 15 https://joinaireligion.com/api/health)
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.
**Fail:** Any other status or timeout.

---

### D-03 — Deployed commit SHA matches expected

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
git rev-parse HEAD
# Must match the SHA shown in the GitHub Actions run
```

**Pass:** SHA on VPS matches the Actions run SHA.
**Fail:** SHA mismatch — code on VPS is not what was deployed.

---

### D-04 — All containers are running

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
docker compose ps
# Expected: all service containers show status "running" or "Up"
# No container should be "Exit", "Restarting", or "Dead"
```

**Pass:** All expected containers are `Up`.
**Fail:** Any container is in a non-running state.

---

### D-05 — No recent container restarts

```bash
ssh <VPS_USER>@<VPS_HOST>
docker compose ps --format json | python3 -c "
import sys, json
for c in json.load(sys.stdin):
    print(c.get('Name'), 'restarts:', c.get('RunningFor'), c.get('Status'))
"
# Alternatively:
docker ps --format "table {{.Names}}\t{{.Status}}"
# Look for "(X restarts)" in the status column
```

**Pass:** Restart count for all containers is 0 since deploy.
**Fail:** Any container shows restarts after the deployment timestamp.

---

### D-06 — Application logs show no startup errors

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
docker compose logs --since=10m 2>&1 | grep -iE "error|fatal|exception|crash|unhandled" | head -20
# Expected: no output (no errors in the last 10 minutes)
```

**Pass:** Zero lines of error output.
**Fail:** One or more error lines (investigate before marking deployment complete).

---

### D-07 — .env has not been overwritten

```bash
ssh <VPS_USER>@<VPS_HOST>
stat /opt/apps/joinaireligion/.env
# Confirm modification time is OLDER than the deploy time
# (The deploy must not have touched .env)
```

**Pass:** `.env` modification time predates the current deployment.
**Fail:** `.env` modification time matches or is newer than the deploy (investigate immediately).

---

### D-08 — No new prisma migrations were run automatically

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
docker compose run --rm app npx prisma migrate status 2>&1 | tail -10
# Expected: "Database schema is up to date" or a list of applied migrations
# with no "failed" or "pending" entries that were not manually approved
```

**Pass:** No unapproved migrations in a failed or unexpected state.
**Fail:** Migration ran automatically that was not in the task document.

---

### D-09 — Critical user flows still work (post-deploy spot check)

Run the following subset of the auth test plan:

| Case | Check | Expected |
|------|-------|----------|
| S-01 | Health endpoint | 200 |
| L-07 | Unauthenticated /account | 302/307 redirect |
| B-02 | Login page renders | 200 |
| E-01 | Admin login page renders | 200 |

```bash
BASE="https://joinaireligion.com"
for path in /api/health /login /register /admin/login; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$path → $HTTP"
done
# Expected: all 200 except /account which should be 302/307
```

**Pass:** All expected status codes match.
**Fail:** Any `5xx` or unexpected redirect.

---

## Results table

| Case | Description | Expected | Actual | Pass/Fail |
|------|-------------|----------|--------|-----------|
| D-01 | Actions workflow green | Both jobs ✔ | | |
| D-02 | Health check 200 | 200 | | |
| D-03 | Commit SHA matches | SHA match | | |
| D-04 | All containers running | All Up | | |
| D-05 | No container restarts | 0 restarts | | |
| D-06 | No startup errors in logs | 0 error lines | | |
| D-07 | .env not overwritten | mtime < deploy | | |
| D-08 | No unplanned migrations | No pending/failed | | |
| D-09 | Critical flows working | All 200 | | |

---

## On failure

| Symptom | First action |
|---|---|
| D-02 fails (no health) | `docker compose logs --tail=60` on VPS |
| D-04 fails (container down) | `docker compose up -d` then re-check logs |
| D-07 fails (.env overwritten) | Stop containers; restore `.env` from VPS backup; restart |
| D-03 fails (wrong SHA) | Re-run the GitHub Actions workflow or deploy manually |
| Any `5xx` in D-09 | Escalate to human; consider rollback via `ops/protocol.md` escalation procedure |
