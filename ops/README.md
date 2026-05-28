# ops/ — Development Operations

This folder defines how joinaireligion is built, tested, reviewed, and deployed.
It is the single source of truth for agent roles, task protocol, test plans, and architectural decisions.

---

## Folder structure

```
ops/
├── README.md                        ← this file
├── protocol.md                      ← agent roles, rules, approval gates
│
├── tasks/
│   └── 000-template.md              ← copy this for every new task
│
├── reports/
│   └── 000-template.md              ← copy this to record completed work
│
├── test-plans/
│   ├── smoke-test.md                ← production health & API reachability
│   ├── landing-test.md              ← landing page & public routes
│   ├── auth-test.md                 ← register, login, onboarding, lessons, admin
│   └── deployment-test.md           ← post-deploy verification checklist
│
├── prompts/
│   ├── claude-code-task-template.md ← template prompt for Coding Agent tasks
│   ├── test-agent-template.md       ← template prompt for Test Agent runs
│   └── review-agent-template.md     ← template prompt for Review Agent sessions
│
└── decisions/
    └── 0001-deployment-policy.md    ← ADR: how code reaches production
```

---

## Quick reference: who does what

| Role | May edit application code? | May edit secrets? | May approve schema changes? |
|------|---------------------------|-------------------|-----------------------------|
| Project Manager Agent | No | No | Requests only |
| Coding Agent (Claude Code) | **Yes** | No | No |
| Test Agent | No | No | No |
| Review Agent | No | No | No |
| Human (Şadi) | Yes | **Yes** | **Yes** |

Full role definitions and rules are in `ops/protocol.md`.

---

## How a task flows

```
1. Human or PM Agent writes a task  →  ops/tasks/<NNN>-<slug>.md
2. Coding Agent executes the task
3. Test Agent runs the relevant test plan
4. Review Agent reads diff + test output and approves or requests changes
5. Human approves merge to main
6. GitHub Actions deploys to production
7. Deployment test plan is run against production
8. Report filed in ops/reports/<NNN>-<slug>.md
```

---

## Non-negotiable rules (summary)

- **Only the Coding Agent edits `src/`, `prisma/`, Dockerfile, docker-compose.yml, package files.**
- **No agent of any kind may read, write, or log `.env`, `.env.local`, or any file containing secrets.**
- **Prisma schema changes require explicit written approval from the human before the Coding Agent may proceed.**
- **Production database changes are manual unless a separate approved schema-deploy workflow exists.**
- **No `prisma migrate reset`, no `prisma migrate dev` in CI, no `--accept-data-loss` anywhere.**
- **No agent may commit or push without human instruction.**
