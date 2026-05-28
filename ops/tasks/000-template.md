# Task NNN — <Short Title>

> **Status:** `draft` | `approved` | `in-progress` | `in-review` | `complete`
> **Assigned to:** Coding Agent
> **Requested by:** <!-- human or PM Agent -->
> **Date opened:** YYYY-MM-DD
> **Date closed:** —

---

## Objective

<!-- One paragraph. What problem is being solved and why it matters.
     Be specific: name the files, routes, or behaviours that are broken or missing. -->

---

## Context

<!-- Background the Coding Agent needs to understand the task.
     Include relevant schema field names, API routes, component names,
     prior decisions from ops/decisions/, etc. -->

---

## Allowed files

<!-- List every file the Coding Agent is permitted to touch.
     If it is not listed here, it is forbidden. -->

- `src/...`
- `prisma/schema.prisma`  ← only if schema change is explicitly approved below

---

## Forbidden files

<!-- Files that must not be touched under any circumstances for this task. -->

- `.env`
- `.env.local`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`
- `prisma/migrations/*`  ← no new migrations; existing migrations are immutable
- `src/...`  <!-- list any src files that should be locked for this task -->

---

## Prisma schema change approval

<!-- Complete this section only if the task requires a schema change.
     Leave blank otherwise. The Coding Agent must quote this approval before editing the schema. -->

- **Approved:** `yes` / `no` / `pending human sign-off`
- **Approved change:** <!-- exact field/model names and types to be added/changed -->
- **Approved by:** <!-- human name + date -->
- **Migration required:** `yes` / `no` / `manual on VPS`

---

## Acceptance criteria

<!-- Numbered list. Each item must be independently verifiable.
     Use "Given / When / Then" phrasing where helpful. -->

1.
2.
3.

---

## Test commands

<!-- Commands the Test Agent or human can run to verify correctness.
     Include both local and production checks where applicable. -->

```bash
# TypeScript — must exit 0
npx tsc --noEmit --skipLibCheck

# Unit / integration (if applicable)
# npm test -- --testPathPattern=<pattern>

# Local smoke test
curl -s http://localhost:3000/api/health | jq .

# Production health
curl -s https://joinaireligion.com/api/health | jq .
```

---

## Test plan reference

<!-- Which test plan(s) from ops/test-plans/ should be run after this task? -->

- [ ] `ops/test-plans/smoke-test.md`
- [ ] `ops/test-plans/landing-test.md`
- [ ] `ops/test-plans/auth-test.md`
- [ ] `ops/test-plans/deployment-test.md`

---

## Rollback notes

<!-- How to undo this change if it causes a production regression.
     Be specific: git revert SHA, manual SQL, container restart command, etc. -->

```bash
# Revert on VPS if deploy has already gone out:
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
git log --oneline -5          # find the last-known-good SHA
git reset --hard <GOOD_SHA>
docker compose up -d --build
curl -s https://joinaireligion.com/api/health
```

If the change involved a non-destructive schema addition (new nullable columns or new tables),
no data rollback is needed — reverting the code is sufficient.

---

## Implementation notes

<!-- Filled in by the Coding Agent after completing the work. -->

### Files changed
<!-- git diff --stat output -->

### TypeScript result
<!-- npx tsc --noEmit --skipLibCheck exit code and error count -->

### Summary of changes
<!-- 3–5 sentences describing what was done and any notable decisions. -->

---

## Review

<!-- Filled in by the Review Agent. -->

- **Reviewer:**
- **Date:**
- **Decision:** `approved` / `changes requested`
- **Notes:**
