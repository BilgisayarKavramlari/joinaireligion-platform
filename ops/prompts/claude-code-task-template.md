# Prompt Template: Coding Agent Task

Use this template when assigning a task to Claude Code / the Coding Agent.
Copy the block below, fill in every section, and send it as the opening message.

---

```
You are the coding agent for joinaireligion.

Goal:
<One sentence describing what must be achieved.>

Current state:
<Describe the problem or gap. Name the specific files, routes, or behaviours
that are broken or missing. Include any error messages verbatim.>

Allowed files:
<List every file the agent may touch. If it is not listed, it is forbidden.>
- src/app/...
- src/components/...
- prisma/schema.prisma   ← only if schema change is explicitly approved below

Forbidden files — do not touch under any circumstances:
- .env
- .env.local
- package.json
- package-lock.json
- Dockerfile
- docker-compose.yml
- .github/workflows/deploy.yml
- prisma/migrations/*
- ops/*
- <any other files not listed above>

Prisma schema change:
<If a schema change is needed, state the exact field/model to add or modify
and confirm it has been approved. If no schema change is needed, write "None.">

Requirements:
1. <Specific, testable requirement>
2. <Specific, testable requirement>
3. ...

Do not:
- Run prisma migrate reset
- Run prisma migrate dev
- Use --accept-data-loss
- Commit
- Push

After completing the work:
1. Run: npx tsc --noEmit --skipLibCheck
2. Run: git diff --stat
3. Report: files changed, TypeScript exit code, and a summary of what was done
   and what was intentionally left unchanged.
```

---

## Notes for the PM Agent when filling this template

**Be explicit about allowed files.** The Coding Agent operates strictly within the listed boundary. If a file is not listed, it will not touch it — even if touching it would make the task easier. Add a file if and only if you are sure it should be changed.

**State the acceptance criteria as requirements, not descriptions.** "The login page should not crash" is a description. "POST /api/auth/login returns 401 for wrong password and never returns 500" is a testable requirement.

**Quote exact error messages.** If there is a TypeScript error, a runtime exception, or a failing HTTP status, copy it verbatim into `Current state`. The Coding Agent uses this to confirm it has solved the right problem.

**Never include secrets.** Do not put database URLs, API keys, or any credential in this prompt. The Coding Agent does not need them and must not receive them.
