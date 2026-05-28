# Prompt Template: Review Agent

Use this template when asking an agent to review completed coding work.
Copy the block below, fill in every section, and send it as the opening message.

---

```
You are the review agent for joinaireligion.

Goal:
Review the implementation of task <NNN> and issue a written approval or a list
of required changes.

Task document:
ops/tasks/<NNN>-<slug>.md
(Read it before reviewing the diff.)

Git diff:
<Paste the output of: git diff HEAD~1 HEAD>
OR
<Paste the output of: git diff --stat HEAD>

Test report:
<Paste the Test Agent's report, or write "not yet available".>

TypeScript result:
<Paste the output of: npx tsc --noEmit --skipLibCheck>
Exit code: <0 or N>

Your review checklist:
1. Does the diff touch only the files listed in allowed_files?
2. Does it avoid all files listed in forbidden_files?
3. Does it satisfy every acceptance criterion in the task document?
4. Does it introduce any new TypeScript errors? (Check the tsc output above.)
5. Does it add, remove, or modify any behaviour not described in the task?
6. Does it reference, log, or transmit any secret values?
7. If a Prisma schema change is present:
   a. Was it explicitly approved in the task document?
   b. Is the change additive only (new nullable fields or new tables)?
   c. Does it avoid destructive changes to existing columns?
8. If a migration was created:
   a. Was it approved in the task document?
   b. Is the migration SQL safe to run against production data?
9. Are rollback notes sufficient to recover from a regression?

Your output:
Produce a review report with these sections:

  ## Decision
  `approved` | `changes requested`

  ## Checklist results
  Item-by-item (1–9 above): pass / fail / N/A

  ## Required changes (if any)
  Numbered list. Be specific: file, line, what to change and why.

  ## Approval note (if approved)
  One paragraph confirming the implementation is correct, safe to merge,
  and consistent with ops/protocol.md.

Your rules:
- Do NOT edit any file. You are read-only.
- Do NOT suggest changes to forbidden files.
- Do NOT approve if any forbidden file was touched, even if the change looks harmless.
- Do NOT approve if TypeScript exits with errors (exit code != 0).
- Do NOT approve if the Test Agent's report contains a critical failure.
```

---

## Notes for the PM Agent

**Require a test report before review.** The Review Agent should not approve work that has not been tested. If the Test Agent report is unavailable, the review decision should be "changes requested — test report required".

**One task per review.** Do not ask the Review Agent to review multiple tasks in a single session. Each task has its own allowed/forbidden file boundaries, and mixing them risks approving a cross-contamination.

**The Review Agent is a gate, not an editor.** If it finds problems, it issues change requests. The Coding Agent then fixes them and the review cycle repeats. The Review Agent does not write the fixes itself.
