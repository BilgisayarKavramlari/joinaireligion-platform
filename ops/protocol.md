# Agent Protocol — joinaireligion

This document defines the four agent roles, their permissions, the task lifecycle, and the hard rules that govern all development work on this platform.

---

## 1. Roles

### Project Manager Agent
Plans and prioritises work. Breaks requirements into discrete tasks using the task template (`ops/tasks/000-template.md`). Coordinates sequencing across the Coding Agent, Test Agent, and Review Agent. Does **not** write or execute application code.

### Claude Code / Coding Agent
The **only** agent that may write, edit, or delete files in `src/`, `prisma/`, `Dockerfile`, `docker-compose.yml`, `package.json`, or `package-lock.json`. Operates strictly within the boundaries of an active task document. Reports what was changed, what was not changed, and what the diff looks like before the Review Agent is invoked.

### Test Agent
Executes test plans from `ops/test-plans/` against a running environment (local or production). Reports pass/fail for every test case. Does **not** edit application code. May flag defects to the Project Manager Agent for new task creation.

### Review Agent
Reads the git diff, the task document, and the Test Agent's report. Verifies that the implementation matches the task's acceptance criteria and does not touch forbidden files. Issues a written approval or a list of required changes. Does **not** edit application code.

---

## 2. Permissions matrix

| Capability | PM Agent | Coding Agent | Test Agent | Review Agent | Human |
|---|:---:|:---:|:---:|:---:|:---:|
| Edit `src/*` | ✗ | **✔** | ✗ | ✗ | ✔ |
| Edit `prisma/schema.prisma` | ✗ | ✔ (approved only) | ✗ | ✗ | ✔ |
| Edit `prisma/migrations/*` | ✗ | ✔ (approved only) | ✗ | ✗ | ✔ |
| Edit `Dockerfile` / `docker-compose.yml` | ✗ | ✔ (approved only) | ✗ | ✗ | ✔ |
| Edit `package.json` / `package-lock.json` | ✗ | ✔ (approved only) | ✗ | ✗ | ✔ |
| Edit `.github/workflows/*` | ✗ | ✔ (approved only) | ✗ | ✗ | ✔ |
| Read or write `.env` / `.env.local` / secrets | ✗ | ✗ | ✗ | ✗ | ✔ |
| Create `ops/tasks/*` | ✔ | ✗ | ✗ | ✗ | ✔ |
| Execute test plans | ✗ | ✗ | **✔** | ✗ | ✔ |
| Approve diffs | ✗ | ✗ | ✗ | **✔** | ✔ |
| Commit and push | ✗ | ✗ | ✗ | ✗ | **✔** |

---

## 3. Hard rules — no exceptions

**R1 — Only the Coding Agent touches application code.**
No other agent reads, proposes, or writes changes to files in `src/`, `prisma/`, container config, or package files.

**R2 — No agent may access secrets.**
No agent may read, write, print, log, or transmit the contents of `.env`, `.env.local`, `.env.production`, or any file that contains API keys, passwords, or tokens. The production `.env` lives only on the VPS and is never in the repository.

**R3 — Prisma schema changes require explicit human approval.**
Before the Coding Agent may modify `prisma/schema.prisma` or create a migration, the human must provide written approval in the task document. The Coding Agent must quote the approved change verbatim before proceeding.

**R4 — Production database changes are manual.**
No CI/CD pipeline may run `prisma migrate deploy`, `prisma db push`, or any destructive database operation automatically unless a separate, explicitly approved schema-deploy workflow exists and is documented in `ops/decisions/`.

**R5 — Forbidden database commands.**
The following commands are permanently forbidden in all contexts — agent, CI, and manual:
- `prisma migrate reset`
- `prisma migrate dev` (in production or CI)
- `prisma db push --accept-data-loss`

**R6 — No unsolicited commits or pushes.**
No agent may run `git commit` or `git push` without an explicit human instruction in the current session.

**R7 — Forbidden files list is absolute.**
If a task document lists a file under `forbidden_files`, the Coding Agent must not touch it under any circumstances, including for refactoring, formatting, or import corrections.

---

## 4. Task lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│  1. PLAN                                                      │
│     PM Agent creates ops/tasks/<NNN>-<slug>.md               │
│     Human reviews and approves the task document             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  2. IMPLEMENT                                                 │
│     Coding Agent executes task within allowed_files boundary  │
│     Coding Agent reports: files changed, tsc result, diff    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  3. TEST                                                      │
│     Test Agent runs relevant test plan(s)                     │
│     Test Agent files pass/fail report                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  4. REVIEW                                                    │
│     Review Agent reads diff + test report                     │
│     Issues approval or change requests                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  5. MERGE                                                     │
│     Human commits and pushes to main                          │
│     GitHub Actions runs CI build + deploy                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  6. VERIFY                                                    │
│     Test Agent runs ops/test-plans/deployment-test.md         │
│     Report filed in ops/reports/<NNN>-<slug>.md              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Approval gates

| Gate | Required before |
|---|---|
| Human approves task document | Coding Agent begins work |
| Human approves Prisma schema change | Coding Agent edits `prisma/schema.prisma` |
| Review Agent issues written approval | Human commits |
| Test Agent passes deployment test | Task is closed |

---

## 6. Escalation

If the Coding Agent encounters a situation requiring changes to forbidden files, it must stop, report the blocker, and wait for a new task document that explicitly permits the required changes. It must not proceed on its own judgement.

If a Test Agent or Review Agent finds a critical regression in production, they escalate immediately to the human. No agent attempts a hotfix without a task document.
