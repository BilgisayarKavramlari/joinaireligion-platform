# 2026-05-31 Practice Respond CI Unblock Report

## Scope

Smallest safe CI fix only.

- Did not change application runtime code.
- Did not weaken `enforceLearningAccess()`.
- Did not remove onboarding guard.
- Did not start Task 3.

## Root Cause

`POST /api/practice/respond` now calls `enforceLearningAccess()`, which loads
`db.user.findUnique()` through `src/lib/access.ts`.

`__tests__/api/practice-respond.test.ts` mocked `practiceMessage` and
`practiceResponse` but did not mock `db.user.findUnique`, so CI failed with:

`TypeError: Cannot read properties of undefined (reading 'findUnique')`

## Fix

Updated `__tests__/api/practice-respond.test.ts` to:

- add `db.user.findUnique` to the mocked Prisma shape
- default the mocked access user to verified with `onboardingDone: true`
- preserve validation-focused behavior for existing tests
- add a regression test proving `onboardingDone: false` returns `403`

## Verification

- `npm test -- --runTestsByPath __tests__/api/practice-respond.test.ts`
- `npm run test:ci`

Both passed locally after the test-only change.
