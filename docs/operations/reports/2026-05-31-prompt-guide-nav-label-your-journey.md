# 2026-05-31 Prompt Guide Nav Label -> Your Journey

## Scope

- Renamed the visible `Prompt Guide` navigation label to `Your Journey`.
- Kept the internal route unchanged as `/prompt-guide`.
- Updated menu-label translations in the active i18n sources only.

## Files

- `src/lib/i18n/dict.ts`
- `src/lib/landingContent.ts`
- `src/i18n/messages/en.ts`
- `src/i18n/messages/tr.ts`
- `src/i18n/messages/es.ts`
- `src/i18n/messages/de.ts`
- `src/i18n/messages/fr.ts`

## Verification

- No existing Jest tests specifically covered this menu label, so no label-specific test file was updated.
- Ran TypeScript verification:
  - `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json`

## Notes

- Aborted dashboard-card changes from the interrupted attempt were not included in this slice.
- Footer and page-title wording were left unchanged because the request was limited to the visible navigation label.
