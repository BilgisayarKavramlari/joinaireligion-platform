# Task 2 - Feedback Ownership And Data Integrity

Status: Ready

## Goal

Fix feedback ownership and metadata integrity for authenticated users, and close the onboarding access-control gap for verified users who have not completed onboarding.

## Scope

- fix logged-in feedback ownership so feedback submitted by logged-in users is linked to the user
- store available metadata: `userId`, `email`, `locale`, `pageUrl`, `userAgent`, `authState`, `createdAt`
- keep truly anonymous feedback anonymous only when no valid session exists
- update `/admin/feedback` to show linked user identity when available
- add data-integrity checks for anonymous-rate warning if many logged-in sessions become anonymous
- add onboarding access guard so `onboardingDone=false` users cannot access lessons, practice, journey, or personalized dashboard content before completing onboarding
- do not block public landing pages, login, register, email verification, logout, support/feedback submission, or onboarding itself
- allow admin bypass only if explicit, role-based, and documented

## Acceptance Criteria

- authenticated feedback submissions persist with `userId` linkage and captured metadata
- anonymous submissions remain anonymous only when no valid session exists
- `/admin/feedback` clearly shows linked vs anonymous feedback identity
- verified/login users with `onboardingDone=false` are redirected to `/onboarding` from protected learning surfaces
- onboarding completion sets `onboardingDone=true` only after required answers are saved
- health/admin visibility warns when verified but not-onboarded users still show lesson or practice activity

## Verification

- targeted feedback intake tests
- targeted anonymous feedback tests
- targeted onboarding access-guard tests
- targeted health warning checks for onboarding/data-integrity drift

## Report Output

- `docs/operations/reports/2026-05-30-phase-1-task-2-report.md`
