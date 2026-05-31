# 2026-05-31 Your Journey Dashboard Card

## Scope

- Added a sixth account dashboard card titled `Your Journey`.
- Linked the card to the existing `/prompt-guide` route.
- Added localized card title and description strings in the main account dictionary.

## Files

- `src/app/account/page.tsx`
- `src/lib/i18n/dict.ts`

## Verification

- No existing Jest tests specifically covered dashboard-card rendering or labels, so no targeted Jest file was added or updated for this slice.
- Ran TypeScript verification:
  - `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json`

## Notes

- The dashboard grid already used `repeat(auto-fill, minmax(260px, 1fr))`, so no layout code change was needed to support six cards.
- This slice did not change routes, lesson behavior, support-triage logic, or schema.
