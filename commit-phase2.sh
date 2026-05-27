#!/usr/bin/env bash
# Run this from your Mac terminal to commit and push Phase 2 test suite.
# Usage: bash commit-phase2.sh
set -e
cd "$(dirname "$0")"

git add \
  jest.config.js \
  package.json \
  __mocks__/ \
  __tests__/

git commit -m "Phase 2: Jest test suite — 72/72 tests passing

- jest.config.js: ts-jest config with Next.js module stubs
- __mocks__/next/server.js: NextResponse stub (cookies, json, redirect)
- __mocks__/next/headers.js: cookies() stub
- __tests__/phase2/01-auth-utils.test.ts: hashPassword, createToken, session round-trip
- __tests__/phase2/02-registration.test.ts: registration validation + journey defaults
- __tests__/phase2/03-email-verification.test.ts: token validation, journey init, auto-login
- __tests__/phase2/04-onboarding.test.ts: questionnaire save, safety ack, onboardingDone
- __tests__/phase2/05-profile-update.test.ts: all optional profile fields
- __tests__/phase2/06-avatar-upload.test.ts: MIME type + size validation

Phase 2 requirements met:
  2.1 Email verification initializes currentLevel=1, xpTotal=0, daysActive=0
  2.2 Onboarding stores belief, expectations, practice, language, safety ack
  2.3 Profile fields: country, city, phone, secondaryEmail, socialMedia
  2.4 Avatar upload: jpg/png/webp only, max 2 MB, stored in UserProfile"

git push origin main
echo ""
echo "✓ Phase 2 committed and pushed to GitHub."
