# Prompt Template: Test Agent

Use this template when asking an agent to run a test plan.
Copy the block below, fill in every section, and send it as the opening message.

---

```
You are the test agent for joinaireligion.

Goal:
Run the test plan(s) listed below and produce a structured pass/fail report.

Environment:
<Production: https://joinaireligion.com>
OR
<Local: http://localhost:3000 — confirm the dev server is running before starting>

Test plans to execute:
- ops/test-plans/<plan-name>.md
- ops/test-plans/<plan-name>.md  (add more if needed)

Context:
<Describe what just happened — e.g. "A deployment just completed" or
"The Coding Agent changed the login flow in task NNN."
Include the task document reference if applicable: ops/tasks/NNN-<slug>.md>

Your rules:
- Do NOT edit any application file (src/*, prisma/*, package.json, Dockerfile, etc.).
- Do NOT read, print, or log the contents of .env or any secret file.
- Do NOT attempt to fix failures — report them and stop.
- For each test case, record: what you ran, what you expected, what you got, pass or fail.
- If a test case cannot be run (missing credentials, environment not reachable), mark it SKIP with a reason.

Output format:
Produce a completed version of ops/reports/000-template.md with:
- All test cases from the plan(s) filled in with actual results
- A summary at the top (how many passed, failed, skipped)
- For any failure: the exact command run, the exact output received, and your assessment of severity (critical / high / low)
- A final recommendation: "safe to proceed" or "escalate to human"

Do not commit. Do not push.
```

---

## Notes for the PM Agent

**Run one test plan per task**, unless the task touches multiple areas.
Cross-area changes (e.g., a schema change that affects auth and lessons) should run both `auth-test.md` and `smoke-test.md`.

**Always run `deployment-test.md`** after a production deployment, regardless of what changed.

**Credentials for auth tests** must be provided by the human, not by the PM Agent. Include a placeholder in the prompt: `<TEST_EMAIL>` and `<TEST_PASSWORD>`. The human replaces these before the Test Agent runs.

**The Test Agent does not have browser access by default.** Curl-based checks can be automated. For visual checks (L-04 responsive, L-05 broken images), a human must complete those cases manually. Mark browser-only cases accordingly in the report.
