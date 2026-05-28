# Task 001 — Admin User Management Dashboard

> **Status:** `approved`
> **Assigned to:** Coding Agent
> **Requested by:** Şadi Evren Şeker
> **Date opened:** 2025-05-28
> **Date closed:** —

---

## Objective

Build a complete, production-ready admin user management interface.
The existing admin pages are either stubs (`JSON.stringify` dumps) or bare lists with no search, pagination, or detail views. This task replaces them with a proper, navigable admin UI that gives full visibility into every user's data across all platform domains: profile, onboarding, subscription, invoices, journey progress, lessons, AI dialogues, email logs, and activity logs.

---

## Context

### Current state of admin routes

| Route | File | Current state |
|---|---|---|
| `/admin` | `admin/page.tsx` | ✓ Complete — stat cards + recent tables |
| `/admin/login` | `admin/login/page.tsx` | ✓ Complete |
| `/admin/users` | `admin/users/page.tsx` | ⚠ Bare list — `take:100`, no search, no pagination |
| `/admin/users/[id]` | `admin/users/[id]/page.tsx` | ✗ Stub — single `<pre>JSON.stringify</pre>` (4 lines) |
| `/admin/subscriptions` | `admin/subscriptions/page.tsx` | ✗ Stub — `JSON.stringify` |
| `/admin/activity` | `admin/activity/page.tsx` | ✗ Stub — `JSON.stringify` |
| `/admin/dialogues` | `admin/dialogues/page.tsx` | ⚠ Partial — basic table (43 lines) |
| `/admin/lessons` | `admin/lessons/page.tsx` | ⚠ Partial — basic table (80 lines) |
| `/admin/stats` | `admin/stats/page.tsx` | Unknown — not yet audited |

### Access control

`requireAdminSession()` in `src/lib/admin.ts` checks the session email against the
`ADMIN_EMAILS` environment variable (comma-separated list on the VPS `.env`).
The `UserRole` enum in the schema (`USER | ADMIN | SUPER_ADMIN`) also exists but is not
yet enforced by `requireAdminSession`. The role-based check is out of scope for this task.

### Available Prisma relations on User

Every data section in Phase 4 has a corresponding Prisma relation already present in the
schema — no schema changes are required for this task.

| Section | Prisma relation / model |
|---|---|
| Profile | `user.profile` → `UserProfile` |
| Onboarding | `user.onboarding` → `OnboardingAnswer[]` |
| Subscription | `user.subscription` → `Subscription` |
| Invoices | `user.invoices` → `InvoiceRecord[]` |
| Journey / progress | `user.journeyLevels` → `JourneyLevel[]`; `user.currentLevel`, `user.xpTotal` |
| Lessons | `user.userLessons` → `UserLesson[]` + nested `lesson`, `attempts` |
| AI dialogues | `user.dialogues` → `AiDialogue[]` |
| Email logs | `user.emailLogs` → `EmailLog[]` |
| Activity logs | `user.activityLogs` → `UserActivityLog[]` |

### Design system

All existing admin pages use inline styles with this palette. New pages must match:
- Background: `#04000c`
- Text: `#ede8dc`
- Gold accent: `#c9a227` / `#f0d47a`
- Border: `rgba(201,162,39,0.15)` to `rgba(201,162,39,0.25)`
- Teal positive: `#14b8a6`
- Card background: `rgba(255,255,255,0.02)` – `rgba(255,255,255,0.04)`
- Font: Georgia serif for headings, system sans for tables

---

## Allowed files

### Existing files the Coding Agent may modify
- `src/app/admin/users/page.tsx`
- `src/app/admin/users/[id]/page.tsx`
- `src/app/admin/subscriptions/page.tsx`
- `src/app/admin/activity/page.tsx`
- `src/app/admin/dialogues/page.tsx`
- `src/app/admin/lessons/page.tsx`
- `src/app/admin/stats/page.tsx`
- `src/app/admin/page.tsx` ← only to add/fix navigation links if broken

### New files the Coding Agent may create
- `src/app/admin/users/[id]/components/` — any `.tsx` files inside this directory
- `src/components/admin/` — any shared admin UI components created for this task

### No other files may be touched.

---

## Forbidden files

- `.env` / `.env.local`
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/lib/admin.ts`
- `src/lib/auth.ts`
- `src/lib/db.ts`
- `src/lib/env.ts`
- `src/app/admin/login/page.tsx`
- `src/app/api/*` (no API route changes)
- `package.json` / `package-lock.json`
- `Dockerfile` / `docker-compose.yml`
- `.github/workflows/deploy.yml`
- `ops/*`
- `docs/*`
- `scripts/*`

---

## Prisma schema change approval

- **Approved:** `no`
- **Reason:** All required models and relations are already present in the schema.
  No new fields or models are needed for this task.

---

## Implementation phases

### Phase 1 — Audit (read-only, no code changes)

Before writing any code, the Coding Agent must read and document:

1. The full content of every admin page file listed in the Current state table above.
2. The `requireAdminSession()` implementation in `src/lib/admin.ts`.
3. All Prisma relations on `User` that will be used in the detail page.
4. Any shared layout or nav file under `src/app/admin/`.

The Coding Agent must report the audit findings before proceeding to Phase 2.
If any file contains logic that conflicts with the approach below, it must flag it
before making changes.

---

### Phase 2 — Users list with search and pagination

Replace `src/app/admin/users/page.tsx` with a server component that supports:

- URL-driven search: `?q=<email or name>` — filters by `email` (contains) and
  `displayName` (contains), case-insensitive.
- URL-driven pagination: `?page=<N>` with a fixed page size of 50.
- Columns: email (linked to detail page), display name, role, verified, plan status,
  onboarded (derived from `_count.onboarding > 0`), level, XP, joined date.
- A total count shown above the table ("Showing X–Y of Z users").
- Previous / Next navigation links (disabled when at first/last page).
- The search input must be a plain HTML `<form>` with `method="get"` — no client-side
  JavaScript required. The search field must be pre-populated with the current `?q` value.

Prisma query requirements:
```ts
db.user.findMany({
  where: q ? {
    OR: [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ]
  } : undefined,
  take: PAGE_SIZE,
  skip: (page - 1) * PAGE_SIZE,
  orderBy: { createdAt: "desc" },
  select: {
    id: true, email: true, displayName: true, role: true,
    emailVerifiedAt: true, currentLevel: true, xpTotal: true,
    onboardingDone: true, createdAt: true,
    subscription: { select: { status: true } },
    _count: { select: { onboarding: true } },
  },
})
```

---

### Phase 3 — User detail page shell

Replace `src/app/admin/users/[id]/page.tsx` with a proper server component that:

- Fetches a single user by `params.id` with all relations needed for all tabs
  (see Phase 4 for full include list).
- Shows a header section with: avatar placeholder, display name, email, role badge,
  verification status, plan status, join date, last login.
- Shows a quick-stats row: Level, XP, `daysActive`, `onboardingDone` (boolean badge),
  `unsubscribedAt` (null or date), total lessons completed, total AI dialogue turns.
- Has a back link to `/admin/users`.
- Renders stub sections for each tab — they can show "coming in Phase 4" until
  Phase 4 replaces them. No blank `<pre>JSON.stringify</pre>`.

---

### Phase 4 — User detail tabs / sections

Add the following sections to the user detail page.
Each section is a visually distinct block with a section heading.
All sections are rendered server-side on the same page (no client-side tab switching
is required; anchor links are sufficient for navigation).

#### 4a — Profile
Fields: `bio`, `intent`, `timezone`, `tradition`, `country`, `city`, `phone`,
`secondaryEmail`, `socialMedia` (rendered as pretty JSON), `avatarPath`.
Show "—" for null fields. Do not show an edit form.

#### 4b — Onboarding answers
Table: question key, answer, date submitted.
Ordered by `createdAt` ascending (chronological order of answers).
Show count in the section heading: "Onboarding (N answers)".

#### 4c — Subscription & payments
Subscription row: provider customer ID (truncated), plan ID, status, trial ends at,
current period end, canceled at.
Invoices table: invoice ID (truncated), status, amount (in dollars, formatted),
currency, date, PDF link (if present).
Show "No subscription" if the user has no subscription record.

#### 4d — Journey & progress
Stats: current level, XP total, `daysActive`, last active date.
Journey levels table: level number, label, unlocked date.
Practice logs table (last 20): practice title (via `practiceId`), duration, completed at.

> Note: `practiceId` is a foreign key to `Practice`. Include it in the Prisma query.
> The practice title can be shown as the `practiceId` if the full Practice join is too
> costly — the Coding Agent should decide based on query complexity.

#### 4e — Lessons & attempts
For each `UserLesson`: lesson step number, title, status, XP earned, started at,
completed at, attempt count.
For the most recent 3 attempts per lesson: score (colour-coded: ≥70 teal, ≥60 gold,
<60 dim), passed/failed badge, feedback (truncated to 120 chars), date.

#### 4f — AI dialogues
Table of the most recent 30 `AiDialogue` records: truncated user prompt (80 chars),
token counts (input/output), latency, safety flags (Y/N), date.
Include a `conversationId` column so conversations can be grouped visually.

#### 4g — Email logs
Table of all `EmailLog` records for this user: template name, status, provider message
ID (if present), date sent.
Most recent first.

#### 4h — Activity logs
Table of the most recent 100 `UserActivityLog` records: event type badge, event name,
path, method, date.
Do not render `metadata`, `ipHash`, or `userAgent` columns in the default view — these
may contain PII and are not needed for day-to-day admin use. They may be shown in a
collapsed `<details>` element per row if the Coding Agent considers it useful.

---

### Phase 5 — Access control hardening & production-safe approach

1. Verify that every new admin page calls `requireAdminSession()` and wraps it in a
   `try/catch` that redirects to `/admin/login` on failure (matching the pattern in
   the existing `admin/page.tsx`).

2. Do not expose raw database IDs or internal tokens in rendered HTML beyond what is
   already present in the existing admin pages. Provider IDs (Stripe customer IDs,
   invoice IDs) may be shown in truncated form.

3. All Prisma queries in the detail page must use `select` or targeted `include` —
   never `db.user.findUnique({ where: { id }, include: { /* everything */ } })` without
   field selection. This prevents accidentally pulling large text columns (like
   `fullContextSent` on `LessonAttempt`) into the page unnecessarily.
   Specifically: `LessonAttempt.fullContextSent` and `LessonAttempt.aiRawResponse`
   must NOT be included in the Phase 4e query. Use only: `id`, `score`, `passed`,
   `feedback`, `tokensUsed`, `latencyMs`, `createdAt`.

4. Pagination or `take` limits must be applied to every list — no unbounded queries.
   Recommended limits: dialogues 30, activity logs 100, invoices all (typically small),
   email logs all (typically small), lesson attempts 3 per lesson or 20 total.

---

## Acceptance criteria

1. `GET /admin/users` returns HTTP 200 for an admin session and HTTP 3xx redirect to
   `/admin/login` for an unauthenticated request.

2. `GET /admin/users?q=test` filters the users table to rows whose email or display
   name contains "test" (case-insensitive). The search field is pre-populated with
   "test" in the rendered HTML.

3. `GET /admin/users?page=2` shows the second page of 50 users. The "Previous" link
   points to `?page=1`. If fewer than 50 users exist, page 2 shows an empty table
   and the "Next" link is absent.

4. `GET /admin/users/<valid-id>` returns HTTP 200 and renders: the user's email,
   display name, role badge, and at minimum sections 4a–4h with section headings.
   No `<pre>JSON.stringify</pre>` appears anywhere on the page.

5. `GET /admin/users/<invalid-id>` returns HTTP 404 (or redirects gracefully) rather
   than throwing an unhandled error.

6. The detail page query for `LessonAttempt` does not select `fullContextSent` or
   `aiRawResponse` (verify by code review — these are large text columns).

7. Every admin page calls `requireAdminSession()`. Visiting any admin URL without a
   valid admin session redirects to `/admin/login`.

8. `npx tsc --noEmit --skipLibCheck` exits with code 0.

9. The new users list and detail page match the existing admin colour palette (dark
   background `#04000c`, gold accents, card borders) — no Tailwind classes or
   external CSS that contradicts the inline-style design of `admin/page.tsx`.

---

## Test commands

```bash
# 1. TypeScript — must exit 0
npx tsc --noEmit --skipLibCheck

# 2. Verify no fullContextSent or aiRawResponse in detail page query
grep -n "fullContextSent\|aiRawResponse" src/app/admin/users/\[id\]/page.tsx
# Expected: no output

# 3. Verify requireAdminSession is called in each new/modified page
grep -rn "requireAdminSession" src/app/admin/
# Expected: present in every page.tsx file

# 4. Local smoke — users list
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/users
# Expected: 307 (redirect to /admin/login — no session)

# 5. Local search (with valid admin session cookie)
curl -s -o /dev/null -w "%{http_code}" \
  --cookie "jair_session=<ADMIN_SESSION>" \
  "http://localhost:3000/admin/users?q=test&page=1"
# Expected: 200

# 6. Local detail page
curl -s -o /dev/null -w "%{http_code}" \
  --cookie "jair_session=<ADMIN_SESSION>" \
  "http://localhost:3000/admin/users/<VALID_USER_ID>"
# Expected: 200

# 7. Invalid user ID
curl -s -o /dev/null -w "%{http_code}" \
  --cookie "jair_session=<ADMIN_SESSION>" \
  "http://localhost:3000/admin/users/nonexistent000000000000000"
# Expected: 404 or 302
```

---

## Test plan reference

- [x] `ops/test-plans/smoke-test.md` — S-01, S-05 (admin session auth)
- [x] `ops/test-plans/auth-test.md` — Section E (E-01 through E-04)
- [ ] `ops/test-plans/deployment-test.md` — after production deploy

---

## Rollback notes

All changes are UI-only (server components, read-only Prisma queries). No schema
migrations, no data writes, no new API routes. Rolling back is a clean revert:

```bash
# Option A — git revert (preferred, deploys via CI)
git revert HEAD --no-edit
git push origin main

# Option B — direct VPS reset
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
git reset --hard <LAST_KNOWN_GOOD_SHA>
docker compose up -d --build
curl -s https://joinaireligion.com/api/health
```

No database rollback is required. The queries are read-only and the schema is unchanged.

---

## Implementation notes

<!-- Filled in by the Coding Agent after completing the work. -->

### Files changed
<!-- git diff --stat output -->

### TypeScript result
<!-- npx tsc --noEmit --skipLibCheck exit code -->

### Summary of changes

---

## Review

- **Reviewer:**
- **Date:**
- **Decision:**
- **Notes:**
