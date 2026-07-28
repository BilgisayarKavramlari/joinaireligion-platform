# ADR 0001 — Deployment Policy

**Status:** Accepted
**Date:** 2025-05-28
**Decided by:** Şadi Evren Şeker (project owner)
**Context:** First CI/CD pipeline established for joinaireligion.

---

## Context

joinaireligion runs on a single production VPS behind Nginx with Docker Compose.
The codebase is a Next.js 16 application backed by PostgreSQL via Prisma 6.
This decision records the rules that govern how code and database changes reach production,
to prevent accidental data loss or outages caused by automated tooling.

---

## Decision

### 1. Normal deployment path

All application code changes reach production exclusively through the following path:

```
local commit
  → git push origin main
  → GitHub Actions: .github/workflows/deploy.yml
      job: build  (npm ci + prisma generate + npm run build)
      job: deploy (restricted SSH → root-owned joinai-deploy wrapper)
        wrapper: git reset --hard + schema status check + app rebuild
  → health check: GET /api/health → HTTP 200
  → deployment complete
```

The SSH automation user has no direct Docker or unrestricted sudo access. It may invoke only the root-owned, argument-free deploy and status wrappers installed from `ops/server/`. No other deployment mechanism is authorised. Manual `docker compose up` or `git pull` on the VPS is permitted only for emergency recovery, and must be followed by a note in `ops/reports/`.

### 2. Prisma schema changes

Schema changes in `prisma/schema.prisma` are permitted but require explicit written approval from the project owner before the Coding Agent may proceed. The approval must be recorded in the relevant task document under the `Prisma schema change approval` heading.

### 3. Database migrations

Migrations are **not** run automatically by any CI/CD pipeline.

Applying migrations to the production database is a manual step performed by the human via SSH:

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
docker compose run --rm app npx prisma migrate deploy
```

This step must be:
- Preceded by a database backup.
- Recorded in an `ops/reports/` file.
- Reviewed for safety (no destructive SQL) before execution.

A separate automated schema-deploy workflow may be introduced in a future ADR if the migration cadence justifies it.

### 4. Permanently forbidden commands

The following commands are forbidden in all contexts: CI, local tooling, agent prompts, and manual execution on the VPS.

| Command | Reason |
|---|---|
| `prisma migrate reset` | Destroys all production data |
| `prisma migrate dev` (in CI or on VPS) | Creates new migration files in production; not idempotent |
| `prisma db push --accept-data-loss` | Silently drops columns or tables |
| `prisma db push` (unreviewed) | Safe only for purely additive changes; always review diff first |
| `docker compose down -v` | Removes named volumes, potentially destroying the database |

### 5. Production `.env` management

The production `.env` file:
- Lives only on the VPS at `/opt/apps/joinaireligion/.env`.
- Is never committed to the repository.
- Is listed in `.gitignore`.
- Is backed up automatically by the deploy script before every `git reset --hard`, and restored immediately after.
- May only be edited by the human via SSH.
- May never be read, printed, or transmitted by any agent.

### 6. Rollback procedure

If a deployment introduces a regression:

```bash
# Option A — revert on VPS directly (fastest)
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
git reset --hard <LAST_KNOWN_GOOD_SHA>
docker compose up -d --build
curl https://joinaireligion.com/api/health

# Option B — revert commit and redeploy via CI (preferred for traceability)
git revert HEAD --no-edit
git push origin main
# GitHub Actions will build and deploy the revert commit automatically
```

Option B is preferred because it produces a visible audit trail in the git log and in GitHub Actions.

---

## Consequences

**Positive:**
- No automated tooling can destroy production data without explicit human approval.
- Every deployment is traceable via GitHub Actions logs and git history.
- The `.env` file is never at risk of being overwritten or leaked.
- The pipeline fails loudly (non-zero exit, log dump) if the health check does not pass.

**Negative:**
- Schema migrations require a manual SSH step, which adds latency when a migration is needed alongside a deployment.
- A separate migration automation ADR will be required as the project scales.

---

## Review

This ADR should be revisited when:
- The deployment cadence exceeds one schema migration per week.
- A staging environment is introduced.
- The team grows beyond a single developer.
