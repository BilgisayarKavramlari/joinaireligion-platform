# Task 002 — Secure VPS bootstrap and deploy gate repair

## Status

VPS bootstrap and the approved empty-database initialization are complete. Local implementation is verified; commit, push, GitHub Actions secret configuration, and production application deployment remain gated on an authenticated GitHub CLI session.

## Human authorization

On 2026-07-27 the project owner instructed Codex Desktop to take operational ownership of the new Hostinger VPS with minimum interaction, supplied the SSH endpoint, and authorized reversible bootstrap work. The repository rule requiring an explicit current-session instruction for `git commit` and `git push` remains in force.

The project owner subsequently approved commit/push/merge, creation of the VPS-only production environment file without exposing its contents, initialization of the new empty PostgreSQL database, and configuration of GitHub Actions secrets. The approved administrator address is recorded only as the non-secret configuration value `joinaireligion@sadievrenseker.com`.

## Objective

Prepare a fresh Ubuntu/Docker VPS for least-privilege deployments, repair the security/test gates, keep database changes outside normal deployments, and preserve uploaded avatars across container rebuilds.

## Allowed files

- `.github/workflows/deploy.yml`
- `Dockerfile`
- `dev.sh`
- `docker-compose.yml`
- `jest.config.js`
- `jest.setup.ts`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `prisma/seed.ts`
- `setup-local.sh`
- `src/lib/access.ts`
- affected files under `__tests__/`
- `docs/deployment.md`
- `docs/deployment/ci-cd.md`
- `ops/decisions/0001-deployment-policy.md`
- `ops/server/*`
- this task document

## Forbidden files and operations

- repository `.env`, `.env.local`, `.env.production`, or any secret value
- `prisma/schema.prisma` and `prisma/migrations/*`
- production database writes without a separately recorded approval and backup
- automatic migrations or seeds in CI/CD
- `git commit` or `git push` without an explicit current-session instruction

## Acceptance criteria

1. Runtime dependency audit reports no high or critical findings.
2. All tests, type checks, and the Next.js production build pass.
3. The runtime image is standalone, runs as a non-root user, excludes Jest/ESLint, and passes `/api/health`.
4. Learning routes require a verified user who completed onboarding, with an admin bypass.
5. Uploaded avatars persist in a dedicated Docker volume.
6. Prisma tooling is available only through an opt-in Compose profile; normal deployment runs status only and never modifies the schema.
7. GitHub Actions can invoke only root-owned, allowlisted deploy/status commands; the SSH user is not a member of the Docker group.
8. A failed application deployment automatically returns to the previous Git revision.

## Prisma schema change approval

Not requested. No schema or migration file may be changed by this task.

## Execution evidence

- The production environment file exists only on the VPS, is owned by `root:root`, has mode `0600`, and was validated without printing secret values. External AI, email, and payment credentials remain disabled.
- PostgreSQL was initialized on a private Docker network with no public database port.
- A root-only pre-bootstrap dump was created at `/var/backups/joinaireligion/db/pre-bootstrap-20260728T022350Z.sql.gz` and passed a gzip integrity check.
- The schema generated from the current Prisma model contained no `DROP`, `DELETE`, or `TRUNCATE` statement before it was applied to the confirmed-empty database.
- Bootstrap verification returned 40 application tables, one applied migration, one lesson total, one Step 1 template, and an up-to-date migration status.
- Normal deployments remain migration-status-only. The one-time schema initialization and seed were executed separately under the recorded approval.
- The seed loader was updated for the installed `jiti` version, the migrator image now generates Prisma Client, and the Step 1 seed now explicitly sets template identity so reruns are idempotent.
