# 2026-05-31 Phase 1 Task 4B User-Facing Support Reply Visibility

## Scope

- Added a protected user-facing support history API at `/api/account/support`.
- Added `/account/support` so authenticated users can review their own feedback tickets and user-visible support replies.
- Limited user-visible replies to `USER_VISIBLE` replies in `APPROVED` or `SENT` state only.
- Added an account dashboard card linking to the new support page.
- Added targeted privacy tests for ownership and reply visibility filtering.

## Files

- `src/app/api/account/support/route.ts`
- `src/app/account/support/page.tsx`
- `src/app/account/page.tsx`
- `src/lib/i18n/dict.ts`
- `__tests__/api/account-support-route.test.ts`

## Verification

- `npx jest __tests__/api/account-support-route.test.ts --runInBand`
- `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json`

## Notes

- No automatic reply generation, emails, OpenAI calls, or support-to-idea automation were added.
- `ADMIN_ONLY` replies remain hidden from users.
- `DRAFT` replies remain hidden from users.
