# Claude Code Task - Fix New User Product Regressions

Title: Fix onboarding localization, empty first lesson, incorrect starter stats, and missing feedback intake

Created: 2026-05-30 20:23 UTC

## Context

OpenClaw health check result from this run:
- `status: WARNING`
- `users_missing_journey_state`: `1`
- `users_missing_onboarding`: `3`

Deploy verification result from this run:
- `scripts/ops/openclaw-run-deploy-status.sh` did not return the expected authenticated JSON
- The endpoint returned a public `404` HTML page, so `gitCommit`, `buildTimestamp`, and `dbConnected` could not be confirmed through the deploy-status probe

Real product issues observed in a new-user web test:
1. During registration/onboarding, changing the language updates the UI shell, but the onboarding and practice questions remain in English.
2. After first login, Lesson 1 appears, but its content is empty.
3. A newly registered user dashboard shows `Level 3`, `XP 240`, and `Active Days 12`, which is incorrect for a clean account with no historical activity.
4. The product needs a persistent customer support / feedback button at bottom-right on every page. Users must be able to submit bug reports, translation issues, content issues, complaints, and feature requests. These items must be stored, visible in admin, classified, and usable by the autonomy system to create improvement tasks when appropriate.

Additional confirmed observation:
- A newly created test user received Lesson 1, but the lesson content/body was empty. This confirms the defect is not just missing navigation state; it may involve lesson assignment, lesson seed data, lesson generation, or lesson detail rendering. The product must never show a blank lesson to a new user.

## Affected Areas

Onboarding localization:
- `src/app/onboarding/page.tsx`
- `src/contexts/LanguageContext.tsx`
- `src/lib/i18n/dict.ts`

Lesson 1 creation / retrieval / rendering:
- `src/app/api/onboarding/save/route.ts`
- `src/app/api/lessons/route.ts`
- `src/app/api/lessons/[id]/route.ts`
- `src/app/lessons/page.tsx`
- `src/app/lessons/[id]/page.tsx`
- `prisma/seed.ts`

Starter stats / dashboard:
- `src/app/account/page.tsx`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/verify-email/route.ts`

Feedback intake, admin visibility, and autonomy integration:
- `prisma/schema.prisma`
- `src/app/admin/**`
- `src/app/api/admin/autonomy/health/route.ts`
- Any new feedback API routes / admin pages needed for intake, review, and task generation

## Findings

1. Onboarding localization is likely blocked by hardcoded English question definitions in `src/app/onboarding/page.tsx`.
   The page uses `useLanguage()` for chrome text, but `QUESTIONS` is defined inline with English `text`, `hint`, and `options`, so changing locale cannot fully localize the flow.

2. The starter dashboard stats issue is directly reproducible from code.
   `src/app/account/page.tsx` currently renders hardcoded demo values:
   - `XPBar current={240} max={500}`
   - `StatBox value="Lv 3"`
   - `StatBox value="240"`
   - `StatBox value="12"`
   Meanwhile, `src/app/api/auth/me/route.ts` already exposes real `currentLevel`, `xpTotal`, and `daysActive`, and `src/app/api/auth/verify-email/route.ts` initializes a new verified user to `1 / 0 / 0`.

3. Lesson 1 emptiness needs investigation across both data and routing paths.
   Relevant risk points:
   - Step 1 depends on a template lesson seeded in `prisma/seed.ts`
   - On onboarding completion, `src/app/api/onboarding/save/route.ts` creates a `UserLesson` that points to the template lesson
   - Lesson creation or retrieval may succeed structurally while still returning empty body fields
   - The no-lessons CTA in `src/app/lessons/page.tsx` links to `/lessons/step-1`, which is not a database lesson id and may not map cleanly to `src/app/api/lessons/[id]/route.ts`
   - `src/app/lessons/[id]/page.tsx` may be rendering a blank body when lesson content fields are absent instead of showing a safe fallback or explicit empty-state
   - The system currently lacks a product-health guard for empty lesson payloads in first-login flows

4. The feedback/support capability is currently missing as a first-class product workflow.
   A full implementation is required, not just a button:
   - persistent UI entry point
   - authenticated or anonymous submission handling as appropriate
   - durable storage
   - admin review surface
   - classification taxonomy
   - autonomy-facing signal so recurring issues can produce improvement tasks

## Goal

Fix the four product issues above so that:
- onboarding questions fully localize when the user changes language
- a new user always receives a non-empty first lesson experience
- a new user dashboard reflects real account state instead of demo placeholders
- every page exposes a persistent feedback/support button backed by admin-visible, classified storage and autonomy-task integration

## Constraints

- Do not modify `.env`, secrets, payment records, or billing logic
- Do not enable real email sending
- Do not change production prompt policy
- Do not expose or rotate secrets
- Do not change production deployment behavior as part of this task
- Fix must include regression coverage for the affected flows

## Acceptance Criteria

1. Onboarding localization
- Switching locale during onboarding updates question text, hints, and answer options for supported languages
- Saved onboarding answers still map to stable internal keys regardless of display language

2. First lesson integrity
- New users must never receive or see an empty Lesson 1
- A brand-new verified user can complete onboarding and open Lesson 1 with non-empty `readingText`, `practiceDescription`, and `questions`
- If generated or assigned lesson content is missing, the system must use safe fallback lesson content instead of rendering a blank lesson
- The lesson detail page must render a clear safe empty-state only when no lesson is available, not a blank body
- The no-lessons fallback path does not rely on an invalid pseudo-id such as `/lessons/step-1`

3. Starter stats correctness
- A clean new account shows `Level 1`, `XP 0`, and `Active Days 0` unless real historical activity exists
- Account/dashboard stats are sourced from real backend data rather than hardcoded placeholders

4. Feedback system
- Bottom-right persistent feedback button is visible across the app
- Feedback submissions support categories at minimum: `bug`, `translation`, `content`, `complaint`, `feature_request`
- Feedback items are stored and visible in admin with status/classification fields
- The autonomy system can surface recurring or actionable feedback into improvement-task creation logic

5. Verification
- Add or update regression tests for onboarding localization, first-login Lesson 1 content, and starter stats
- Add at least one regression test covering feedback intake and persistence
- Add product-health coverage for empty lessons so blank first-lesson payloads are surfaced by the autonomy system
