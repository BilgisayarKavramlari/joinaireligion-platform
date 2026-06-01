# Codex Interruption Diagnosis

Date: 2026-05-31

## Diagnosis

Recent interruption behavior is primarily operational, not product-code-specific.

The repeated messages:

- `Codex stopped before confirming the turn was complete`
- `codex app-server turn idle timed out waiting for turn/completed`

are most consistent with OpenClaw waiting for a Codex app-server turn completion signal that does not arrive before the configured idle guard fires.

This appears to happen most often during longer implementation or investigation turns that involve many tool calls, large search output, or long silent stretches between tool activity and final assistant completion. It does not appear to happen mainly during short post-deploy checks or simple GitHub/status lookups.

## Evidence From Recent Runs

### 1. Codex is the current primary backend

The active main session metadata shows:

- `modelProvider: openai-codex`
- `model: gpt-5.4`
- `authProfileOverrideSource: auto`

This indicates OpenClaw is currently routing the main implementation session through Codex by default.

### 2. Claude Code is documented, but not configured as an active backend

The workspace contains a process note at:

- `~/.openclaw/workspace/docs/operations/skills/claude-code-primary-executor.md`

But the local model registry file currently shows no configured providers:

- `~/.openclaw/agents/main/agent/models.json`

In practice, that means Claude Code is described operationally, but is not currently wired in as a selectable active developer backend for this session.

### 3. OpenClaw explicitly tracks Codex idle guards

The Codex plugin manifest includes runtime controls for:

- request timeout
- turn completion idle timeout
- post-tool raw assistant completion idle timeout

Those controls exist specifically to interrupt turns when Codex goes quiet while OpenClaw is still waiting for `turn/completed`.

### 4. Codex cooldown is already being recorded

An OpenClaw doctor handoff log recorded:

- `openai-codex:... cooldown (1h)`

That suggests at least some recent instability is not only user interruption. There is also provider-side or profile-side cooldown handling in play.

### 5. Recent failures cluster around longer coding / tool-heavy work

From the recent project runs:

- Post-deploy observation turns usually completed normally.
- Repeated interruptions happened around larger implementation attempts such as:
  - Phase 2 Task 3 PM assessment foundation
  - Phase 2 Task 4 CTO assessment work
  - CTO helper follow-up attempts
  - multi-step admin/release visibility work

These turns involved repeated repo inspection, multiple tool calls, broad searches, and planned multi-file edits. Several were interrupted before any final confirmation step.

### 6. Partial repo edits were usually not left behind

Follow-up git-state inspections repeatedly found:

- no task-specific modified files
- no task-specific untracked files
- no new report file for the interrupted slice
- no new commit/push after interruption

That means many of the failures happened before or during exploration/tool phases rather than after a durable patch landed.

## Likely Causes

Most likely causes, in order:

1. **Turn idle timeout after long quiet periods**
   The strongest fit. OpenClaw expects `turn/completed`; long silent stretches after tool use appear to trigger the idle guard.

2. **Large, tool-heavy coding turns**
   Repeated implementation turns included many sequential file reads/searches and sometimes very large outputs, which increases the chance of delayed or missing completion signaling.

3. **Codex provider/profile cooldown**
   There is direct evidence that the active Codex auth profile has entered cooldown. That can amplify instability or increase recovery failures.

4. **Interruption before durable patching**
   In several cases the turn appears to have died mid-investigation, leaving no repo changes. This is consistent with interruption before the assistant returned a final completion.

Less likely as primary cause:

- GitHub status lookup by itself
- Jest/type-check duration alone
- app code in `joinaireligion-platform`

Those tasks usually completed when the turn was otherwise short and bounded.

## Which Tasks Interrupted Recently

Recent interruption cluster:

- Phase 2 Task 3: PM Agent Idea Assessment Foundation
- Phase 2 Task 4 / 4A helper planning attempts
- release/admin visibility implementation attempts

Recent tasks that did complete:

- multiple post-deploy observation checks
- document-only CTO assessment design note
- earlier small safe support-triage and support-reply slices

The main pattern is: **small bounded slices finish; long investigative or implementation-heavy turns are more likely to stop early**.

## Commits And Pushes After Interruptions

Observed behavior:

- interrupted turns did **not** automatically create commits or pushes
- completed turns still committed and pushed normally

Operationally, that means interruption is usually a failed in-flight turn, not a half-hidden background commit.

## Safe Retry Protocol

After every interruption, use this exact sequence:

1. Run `git status --short`.
2. Check the latest local commit with `git log -1 --oneline`.
3. Inspect only task-relevant files for partial edits.
4. Check whether a report file for the interrupted slice was already created.
5. Determine whether partial changes are:
   - absent: retry fresh
   - clean and in-scope: keep and complete
   - ambiguous or mixed with other work: inspect first before continuing
6. Prefer the next retry as a smaller bounded slice:
   - helper only
   - page only
   - test only
   - report only
7. Avoid large broad searches that dump huge output unless necessary.
8. If the turn is implementation-heavy, send short progress updates earlier and finish with a smaller number of tool phases before the final response.

## Recommendation For Claude Code Primary / Codex Fallback

Recommended operating model:

1. Configure Claude Code as an actual selectable backend, not just a documented preference.
2. Make Claude Code the default primary implementation backend for code-edit tasks.
3. Keep Codex as:
   - fallback during Claude cooldown/unavailability
   - report-only/documentation/observation backup
   - small bounded helper/test slices when explicitly handed off
4. Record fallback handoff explicitly whenever Codex implements a task that was meant for Claude.

## Recommended Next Setup Step

Configure an actual Claude/Anthropic developer provider in OpenClaw and make it selectable for the main coding session, then preserve Codex as secondary fallback.

Concretely, the next setup step is:

- onboard or configure a Claude-capable auth/provider profile in OpenClaw
- verify it appears in the active model/provider registry
- switch the implementation session default away from `openai-codex`
- keep the current Codex lane as fallback only

## Bottom Line

The current problem is best explained by **Codex being the active primary backend in OpenClaw while longer coding turns are hitting app-server completion-idle or cooldown behavior**. The cleanest fix is not bigger retries. It is:

- smaller bounded slices
- post-interruption git inspection every time
- Claude Code configured as the actual primary implementation backend
- Codex reserved for explicit fallback
