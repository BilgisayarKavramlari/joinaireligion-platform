# Report NNN — <Short Title>

> **Task ref:** `ops/tasks/NNN-<slug>.md`
> **Reported by:** <!-- agent name -->
> **Date:** YYYY-MM-DD
> **Environment:** `local` | `staging` | `production`

---

## Summary

<!-- Two to four sentences. What was done, what was verified, and what the outcome was. -->

---

## Changes made

### Git diff —stat

```
<!-- paste output of: git diff --stat HEAD~1 HEAD -->
```

### Files changed

| File | Change type | Notes |
|------|-------------|-------|
| `src/...` | modified | |
| `prisma/schema.prisma` | modified | |

---

## Test results

### TypeScript compilation

```
<!-- paste output of: npx tsc --noEmit --skipLibCheck -->
Exit code: 0
```

### Test plan results

| Test plan | Result | Notes |
|-----------|--------|-------|
| smoke-test | ✔ pass / ✗ fail | |
| landing-test | ✔ pass / ✗ fail | |
| auth-test | ✔ pass / ✗ fail | |
| deployment-test | ✔ pass / ✗ fail | |

### Individual test cases

<!-- Copy the relevant test plan and mark each case pass/fail/skip -->

| # | Test case | Result | Notes |
|---|-----------|--------|-------|
| 1 | | ✔ | |
| 2 | | ✔ | |

---

## Health check

```bash
# Production health at time of report
curl -s https://joinaireligion.com/api/health
# Expected: HTTP 200, { "status": "ok" }
# Actual:
```

---

## Issues found

<!-- List any defects, unexpected behaviours, or follow-up tasks identified.
     Leave blank if none. -->

| # | Severity | Description | Action |
|---|----------|-------------|--------|
| | | | |

---

## Review decision

- **Reviewer:** Review Agent
- **Date:**
- **Decision:** `approved` / `changes requested` / `escalated to human`
- **Notes:**

---

## Deployment

- **Deployed via:** GitHub Actions run #<!-- link -->
- **Deploy time:** YYYY-MM-DD HH:MM UTC
- **Post-deploy health:** ✔ pass / ✗ fail
- **Closed:** YYYY-MM-DD
