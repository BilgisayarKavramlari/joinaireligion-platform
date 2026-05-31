# Phase 1 Task 4D - Support Reply Admin Approval Flow

Date: 2026-05-31

## Scope

Added a protected admin approval path for existing `SupportReply` drafts so admins can publish approved replies to the existing user-facing `/account/support` view without sending email or marking anything as sent.

## Changes

- Added `POST /api/admin/support-replies/[id]/approve`
- Updated `/admin/feedback` to show a `Publish to user` action for eligible `ADMIN_ONLY` + `DRAFT` replies
- Kept `/account/support` visibility rules unchanged: only `USER_VISIBLE` replies in `APPROVED` or `SENT` state appear to users

## Guardrails

- No reply body generation
- No new reply creation during approval
- No emails
- No `SENT` transition
- No `FeedbackItem.status` mutation
- No PM/CTO/task orchestration

## Verification

- `npx jest __tests__/api/admin-support-reply-approve-route.test.ts __tests__/app/admin-feedback-page.test.ts __tests__/api/account-support-route.test.ts --runInBand`
- `npx tsc --noEmit --skipLibCheck --project tsconfig.verify.json`
