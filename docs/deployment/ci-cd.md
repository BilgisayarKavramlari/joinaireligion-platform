# CI/CD Deployment — joinaireligion

This document describes the GitHub Actions → VPS deployment pipeline for joinaireligion.

---

## Overview

Every push to `main` triggers a two-job workflow:

```
push → main
  └── Job 1: Build
        npm ci → prisma generate → npm run build
        (fails fast; blocks deploy if build fails)
  └── Job 2: Deploy  (only runs if Build passes)
        SSH → VPS
        git fetch + reset --hard origin/main
        .env preserved
        docker compose up -d --build
        health check → PRODUCTION_URL/api/health
```

No manual steps are required once the GitHub Secrets are set.

---

## Required GitHub Secrets

Add all five secrets at:  
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name       | What to put there                                      | Example                          |
|-------------------|--------------------------------------------------------|----------------------------------|
| `VPS_HOST`        | IP address or hostname of the production VPS           | `203.0.113.42`                   |
| `VPS_USER`        | SSH username on the VPS                                | `deploy` or `root`               |
| `VPS_SSH_KEY`     | Full contents of the **private** SSH key (PEM format)  | `-----BEGIN OPENSSH PRIVATE KEY-----…` |
| `VPS_APP_DIR`     | Absolute path to the app directory on the VPS          | `/opt/apps/joinaireligion`        |
| `PRODUCTION_URL`  | Full origin without trailing slash                     | `https://joinaireligion.com`     |

### Generating a deploy SSH key pair (if you don't already have one)

Run this on your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/joinaireligion_deploy
```

- Copy the **public** key (`~/.ssh/joinaireligion_deploy.pub`) to the VPS:
  ```bash
  ssh-copy-id -i ~/.ssh/joinaireligion_deploy.pub <VPS_USER>@<VPS_HOST>
  ```
- Paste the full contents of `~/.ssh/joinaireligion_deploy` (the **private** key) as the `VPS_SSH_KEY` secret.

---

## VPS Prerequisites (first deploy only)

The following must be true on the VPS before the first automated deploy can succeed.

### 1. Repository cloned

```bash
git clone https://github.com/<org>/joinaireligion.git /opt/apps/joinaireligion
cd /opt/apps/joinaireligion
```

### 2. `.env` file in place

The production `.env` must exist at `/opt/apps/joinaireligion/.env` and must **never** be committed to git. It is preserved automatically on every subsequent deploy.

The workflow will exit with a non-zero code if `.env` is missing, preventing a broken deploy.

### 3. Docker and Docker Compose installed

```bash
docker --version      # Docker 24+ recommended
docker compose version  # v2 plugin (not docker-compose v1)
```

### 4. The deploy user can run Docker without sudo

```bash
usermod -aG docker <VPS_USER>
# Re-login or run: newgrp docker
```

---

## How the deploy step works, step by step

The remote SSH script (`deploy.yml`, Job 2) does exactly this — nothing more:

```bash
cd "$VPS_APP_DIR"

# Back up .env
cp .env /tmp/joinaireligion_env_<timestamp>.bak

# Pull new code
git fetch origin main
git reset --hard origin/main

# Restore .env (safety net — git reset won't overwrite gitignored files,
# but we restore unconditionally)
cp /tmp/joinaireligion_env_<timestamp>.bak .env

# Rebuild and restart
docker compose up -d --build

# Verify
docker compose ps

# Health check — fails the workflow if not HTTP 200
curl "$PRODUCTION_URL/api/health"
```

No `prisma migrate` commands are run automatically. See the section below for database migrations.

---

## Database Migrations

> **Default behaviour: migrations are NOT run by the CI pipeline.**

Running `prisma migrate deploy` or `prisma db push` automatically on every deploy is intentionally omitted. Schema migrations carry data-loss risk and must be reviewed manually.

### Optional: manual migration procedure

When you have a new migration to apply, SSH into the VPS and run it by hand **before** or **after** the deploy, depending on whether the migration is additive (before is safer for most cases):

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion

# Preview what will change (no writes)
docker compose run --rm app npx prisma migrate status

# Apply pending migrations (uses production DATABASE_URL from .env)
docker compose run --rm app npx prisma migrate deploy
```

> **Never use:**
> - `prisma migrate dev` — development-only, creates new migration files
> - `prisma migrate reset` — destroys all data
> - `prisma db push --accept-data-loss` — silent destructive changes

For additive-only schema changes (new nullable columns, new tables) you may also use `prisma db push` without `--accept-data-loss` in a controlled window:

```bash
# Only safe for purely additive changes; review output carefully
docker compose run --rm app npx prisma db push
```

---

## Local validation before pushing

Use the provided scripts to catch problems before CI does:

```bash
# Full validation: branch check, clean tree, .env not tracked, build
bash scripts/deploy/validate-local.sh

# Validate + push in one command (aborts if any check fails)
bash scripts/deploy/push-if-clean.sh

# Validate only, no push
bash scripts/deploy/push-if-clean.sh --dry-run
```

---

## Rollback

If a deploy introduces a regression:

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion

# Find the last good commit
git log --oneline -10

# Roll back to it
git reset --hard <GOOD_COMMIT_SHA>

# Restart with the rolled-back code
docker compose up -d --build
```

Or revert on GitHub and let the pipeline redeploy automatically:

```bash
git revert HEAD --no-edit
git push origin main
```

---

## Workflow file location

```
.github/workflows/deploy.yml
```

---

## Secrets quick-reference

| Secret            | Never put in code | Stored in           |
|-------------------|-------------------|---------------------|
| `VPS_HOST`        | ✓                 | GitHub Secrets      |
| `VPS_USER`        | ✓                 | GitHub Secrets      |
| `VPS_SSH_KEY`     | ✓                 | GitHub Secrets      |
| `VPS_APP_DIR`     | ✓                 | GitHub Secrets      |
| `PRODUCTION_URL`  | ✓                 | GitHub Secrets      |
| All app secrets   | ✓                 | VPS `.env` file only |
