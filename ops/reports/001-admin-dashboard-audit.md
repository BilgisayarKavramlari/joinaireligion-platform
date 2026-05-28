# Report 001 — Admin User Management Dashboard: Phase 1 Audit

**Task reference:** `ops/tasks/001-admin-user-management-dashboard.md`
**Phase:** 1 — Audit (read-only)
**Date:** 2026-05-28
**Prepared by:** Coding Agent
**Status:** Complete — ready for Phase 2 implementation

---

## 1. Current Admin Routes

| Route | File | Lines | Current state | `requireAdminSession` | try/catch | Style system |
|---|---|---|---|---|---|---|
| `/admin` | `admin/page.tsx` | ~200 | ✓ Complete — stat cards + recent tables | ✓ | ✓ redirect | Inline styles |
| `/admin/login` | `admin/login/page.tsx` | ~80 | ✓ Complete — client-side login form | N/A (public) | N/A | Tailwind |
| `/admin/users` | `admin/users/page.tsx` | 48 | ⚠ Bare list — `take:100`, no search, no pagination | ✓ bare call | ✗ no try/catch | Tailwind |
| `/admin/users/[id]` | `admin/users/[id]/page.tsx` | 4 | ✗ Stub — `<pre>JSON.stringify</pre>`, bare include | ✓ bare call | ✗ no try/catch | Tailwind |
| `/admin/subscriptions` | `admin/subscriptions/page.tsx` | 4 | ✗ Stub — `JSON.stringify` of subscriptions + webhook events | ✓ bare call | ✗ no try/catch | Tailwind |
| `/admin/activity` | `admin/activity/page.tsx` | 4 | ✗ Stub — `JSON.stringify` of last 200 `UserActivityLog` rows | ✓ bare call | ✗ no try/catch | Tailwind |
| `/admin/dialogues` | `admin/dialogues/page.tsx` | 43 | ⚠ Partial — fetches then `JSON.stringify` in `<pre>` | ✓ bare call | ✗ no try/catch | Tailwind |
| `/admin/lessons` | `admin/lessons/page.tsx` | 80 | ⚠ Partial — styled table of last 60 attempts | ✓ | ✓ redirect | Inline styles |
| `/admin/stats` | `admin/stats/page.tsx` | 4 | ✗ Stub — `JSON.stringify` of count totals only | ✓ bare call | ✗ no try/catch | Tailwind |

### Shared layout

`src/app/admin/layout.tsx` — not present. There is no shared admin layout file. Each page is self-contained. Navigation to other admin sections exists only in `admin/page.tsx` as inline `<a>` tags pointing to `/admin/users`, `/admin/lessons`, `/admin/activity`, `/admin/dialogues`, and a payments link (mapped to `/admin/subscriptions` via context).

---

## 2. Relevant API Routes

The admin pages are all **server components** — they query the database directly via Prisma (no internal API calls). The relevant API surface is:

| Route | Purpose | Relevance to dashboard task |
|---|---|---|
| `POST /api/auth/login` | Password login, sets `jair_session` cookie | Called by `admin/login/page.tsx` (client component) to authenticate |
| `GET /api/auth/me` | Returns current session user | Called by `admin/login/page.tsx` after login to read `role` for redirect decision |
| `GET /api/health` | Returns `{ status: "ok" }` | Used by deploy health check; not relevant to dashboard UI |

**Important:** No API routes are needed for Phase 2–5. All new admin pages will continue the pattern of direct server-side Prisma queries. The task document explicitly forbids touching `src/app/api/*`.

---

## 3. `requireAdminSession()` Implementation

**File:** `src/lib/admin.ts`

```ts
export function getAdminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? "admin@example.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdminSession(): Promise<string> {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
  if (!session) throw new Error("UNAUTHORIZED");
  if (!getAdminEmails().includes(session.email.toLowerCase())) throw new Error("FORBIDDEN_ADMIN");
  return session.email;
}
```

**Mechanism:** Email-list based. Reads the `ADMIN_EMAILS` comma-separated environment variable from `src/lib/env.ts`. The function **throws** on failure — it does not redirect. Callers are responsible for wrapping it in a `try/catch` to redirect to `/admin/login`.

**Inconsistencies found:**

1. **Missing try/catch on 6 of 8 admin pages.** Only `admin/page.tsx` and `admin/lessons/page.tsx` correctly wrap the call. The remaining pages (`users`, `users/[id]`, `subscriptions`, `activity`, `dialogues`, `stats`) call `requireAdminSession()` without try/catch. An unauthenticated request to any of these routes will produce an unhandled `Error("UNAUTHORIZED")`, which Next.js will render as a 500 Internal Server Error instead of a redirect to `/admin/login`. This violates acceptance criterion 1 and 7.

2. **Client-side vs. server-side access check mismatch.** `admin/login/page.tsx` is a client component. After login it calls `GET /api/auth/me` and checks `me?.user?.role === "ADMIN" || "SUPER_ADMIN"` to decide whether to redirect to `/admin`. This checks the `UserRole` enum field. However, `requireAdminSession()` checks only the `ADMIN_EMAILS` environment variable list — it does not consult `UserRole` at all. A user with `role = "ADMIN"` in the database but whose email is not in `ADMIN_EMAILS` will be granted the login redirect but will receive a 500 on every subsequent admin page. Conversely, a user in `ADMIN_EMAILS` but without an `ADMIN` role in the database will pass all server-side checks but will be rejected on the client-side login redirect. This mismatch is a latent access-control bug. It is **out of scope** for this task (the task document explicitly states role-based enforcement is out of scope), but it must be flagged.

3. **ADMIN_EMAILS fallback.** If the `ADMIN_EMAILS` environment variable is not set, `getAdminEmails()` returns `["admin@example.com"]`. In a production environment that has `ADMIN_EMAILS` properly set, this is harmless. But if the variable is accidentally unset (e.g., after a VPS rebuild without restoring `.env`), the fallback grants admin access to `admin@example.com` — an address that likely has no real user account, meaning no admin access is possible, rather than a broad security hole. Risk: **low for confidentiality, high for availability** (locked out of admin entirely).

---

## 4. Prisma Models and Relations Needed

All required models are present in the current schema. No schema changes are required for this task.

### User model fields used across Phase 2–5

| Field | Type | Used in |
|---|---|---|
| `id` | `String` | Detail page lookup key |
| `email` | `String` | List + detail header |
| `displayName` | `String?` | List + detail header |
| `role` | `UserRole` | List + detail header badge |
| `emailVerifiedAt` | `DateTime?` | List + detail header |
| `currentLevel` | `Int` | List + detail quick-stats |
| `xpTotal` | `Int` | List + detail quick-stats |
| `daysActive` | `Int` | Detail quick-stats |
| `lastActiveDate` | `DateTime?` | Detail quick-stats |
| `lastLoginAt` | `DateTime?` | Detail header |
| `onboardingDone` | `Boolean` | List + detail quick-stats |
| `onboardingDoneAt` | `DateTime?` | Detail quick-stats |
| `unsubscribedAt` | `DateTime?` | Detail quick-stats |
| `createdAt` | `DateTime` | List + detail header |

### Relations needed per section

| Section | Relation | Model | Key fields |
|---|---|---|---|
| 4a Profile | `user.profile` | `UserProfile` | `bio`, `intent`, `timezone`, `tradition`, `country`, `city`, `phone`, `secondaryEmail`, `socialMedia`, `avatarPath` |
| 4b Onboarding | `user.onboarding` | `OnboardingAnswer[]` | `questionKey`, `answer`, `createdAt` |
| 4c Subscription | `user.subscription` | `Subscription` | `providerCustomerId`, `planId`, `status`, `trialEndsAt`, `currentPeriodEnd`, `canceledAt` |
| 4c Invoices | `user.invoices` | `InvoiceRecord[]` | `id`, `status`, `amountCents`, `currency`, `pdfUrl`, `createdAt` |
| 4d Journey levels | `user.journeyLevels` | `JourneyLevel[]` | `levelNumber`, `label`, `unlockedAt` |
| 4d Practice logs | `user.practiceLogs` | `UserPracticeLog[]` | `practiceId`, `durationSeconds`, `completedAt` |
| 4e Lessons | `user.userLessons` | `UserLesson[]` | `lessonId`, `status`, `xpEarned`, `startedAt`, `completedAt`; nested `lesson` → `stepNumber`, `title`; nested `attempts` (last 3) → `score`, `passed`, `feedback`, `createdAt` |
| 4f AI dialogues | `user.dialogues` | `AiDialogue[]` | `conversationId`, `userPrompt`, `inputTokens`, `outputTokens`, `latencyMs`, `safetyFlagged`, `createdAt` — **truncate `userPrompt` to 80 chars in display** |
| 4g Email logs | `user.emailLogs` | `EmailLog[]` | `templateName`, `status`, `providerMessageId`, `createdAt` |
| 4h Activity logs | `user.activityLogs` | `UserActivityLog[]` | `eventType`, `eventName`, `path`, `method`, `createdAt` — **exclude `metadata`, `ipHash`, `userAgent` from default select** |

### Field names to verify before Phase 4 coding

The following field names appear in the task document and must be confirmed against the current schema before writing queries. The schema was last read during this session:

- `OnboardingAnswer.questionKey` — confirm exact field name (may be `key` or `question`)
- `UserPracticeLog.durationSeconds` — confirm field name and unit
- `AiDialogue.safetyFlagged` — confirm field name (may be `flagged`, `isSafe`, `blocked`)
- `AiDialogue.inputTokens` / `outputTokens` — confirm field names (may be `tokensInput` / `tokensOutput`)
- `AiDialogue.latencyMs` — confirm field name
- `InvoiceRecord.amountCents` — confirm field name and unit (may be `amount` in cents or dollars)
- `UserLesson.lessonId` vs. nested `lesson` relation — confirm whether `UserLesson` has a direct `lesson: Lesson` include or only `lessonId`
- `JourneyLevel.levelNumber` / `.label` / `.unlockedAt` — confirm field names

**Recommended action:** Before writing Phase 4 queries, run a targeted schema read (`grep -A 20 "model OnboardingAnswer"` etc.) to confirm all field names. This prevents TypeScript errors from field name mismatches.

---

## 5. Missing UI and Data Pieces Per Section

### Phase 2 — Users list

| Gap | Detail |
|---|---|
| No search | Current `page.tsx` has no `?q=` parameter handling; `take: 100` hard-coded |
| No pagination | No `?page=` parameter; no count query; no Previous/Next links |
| Missing columns | `onboardingDone`, `currentLevel`, `xpTotal`, `createdAt` not shown |
| Styling inconsistency | Uses Tailwind (`bg-slate-950`, `text-slate-100`) — must be replaced with inline styles matching `admin/page.tsx` palette |
| No total count display | "Showing X–Y of Z" header is absent |

### Phase 3 — User detail page shell

| Gap | Detail |
|---|---|
| No header section | No avatar placeholder, display name, email, role badge, verification status, plan status, join date, last login |
| No quick-stats row | No Level, XP, `daysActive`, `onboardingDone` badge, `unsubscribedAt`, total lessons completed, total AI dialogue turns |
| No back link | No link to `/admin/users` |
| JSON dump | The entire page is `<pre>JSON.stringify(data)</pre>` — no structure |
| No section stubs | No headings for sections 4a–4h |
| Missing access control | No try/catch around `requireAdminSession()` — will 500 instead of redirect |
| Missing 404 handling | No `notFound()` call if `db.user.findUnique` returns null |

### Phase 4a — Profile

| Gap | Detail |
|---|---|
| Not present | Section does not exist in any form |
| Fields to show | `bio`, `intent`, `timezone`, `tradition`, `country`, `city`, `phone`, `secondaryEmail`, `socialMedia` (pretty JSON), `avatarPath` |
| All null handling | Every field must show "—" if null |

### Phase 4b — Onboarding answers

| Gap | Detail |
|---|---|
| Not present | Section does not exist |
| Table needed | question key, answer, date submitted; ordered `createdAt ASC` |
| Count in heading | "Onboarding (N answers)" |

### Phase 4c — Subscription and payments

| Gap | Detail |
|---|---|
| Subscriptions stub | `admin/subscriptions/page.tsx` is a 4-line JSON dump of all subscriptions — no per-user view |
| Invoices not exposed | `admin/subscriptions/page.tsx` also includes Stripe webhook events (not InvoiceRecord model) — inconsistent |
| Per-user view needed | The detail page needs both the subscription row and an invoices table scoped to the viewed user |

### Phase 4d — Journey and progress

| Gap | Detail |
|---|---|
| Not present | No journey/progress section in any admin page |
| Stats | `currentLevel`, `xpTotal`, `daysActive`, `lastActiveDate` |
| Journey levels table | level number, label, unlocked date |
| Practice logs table | last 20 rows: `practiceId` (or title if joined), duration, completed at |

### Phase 4e — Lessons and attempts

| Gap | Detail |
|---|---|
| Only in `admin/lessons/page.tsx` | That page shows all attempts across all users, not per-user |
| Per-user view needed | `UserLesson` rows with nested lesson title, status, XP, attempt summary |
| Dangerous current query | `admin/lessons/page.tsx` uses `include: { lesson: true, user: { select: { email: true } } }` on `LessonAttempt` without field selection, pulling `fullContextSent` (large text) and `aiRawResponse` (large text) for every row |

### Phase 4f — AI dialogues

| Gap | Detail |
|---|---|
| Only in `admin/dialogues/page.tsx` | That page fetches last 150 across all users, not per-user |
| `JSON.stringify` output | No structured table |
| Full text fields included | Current query includes full `assistantResponse` and full `userPrompt` in the fetched object; even though they are not all rendered, they are held in memory |
| Per-user view needed | Detail page needs per-user table, last 30 rows |

### Phase 4g — Email logs

| Gap | Detail |
|---|---|
| Not present | No admin page for email logs |
| Table needed | `templateName`, `status`, `providerMessageId`, `createdAt`; most recent first |

### Phase 4h — Activity logs

| Gap | Detail |
|---|---|
| Only in `admin/activity/page.tsx` | That page is a JSON dump of last 200 across all users |
| PII exposed | `ipHash` and `userAgent` are included in the current query and rendered in `<pre>JSON.stringify</pre>` — a serious PII exposure in the current state |
| Per-user view needed | Detail page needs last 100 rows per user; `ipHash`, `userAgent`, `metadata` excluded from default columns |

---

## 6. Risk Notes

### 6.1 Large text field risk (CRITICAL)

`LessonAttempt` has two large text columns:

- `fullContextSent` — the full prompt context sent to the AI model (potentially thousands of tokens as plain text)
- `aiRawResponse` — the raw AI model response

**Current violation:** `admin/lessons/page.tsx` includes these fields via bare `include` on every row of the last 60 attempts. This loads kilobytes of text per row into the server component render, increasing memory pressure and response size with no user-visible benefit.

**Future violation risk:** Phase 4e will query `UserLesson` with nested `LessonAttempt`. The Coding Agent must explicitly use `select` and must exclude `fullContextSent` and `aiRawResponse`. This is listed as an explicit acceptance criterion (criterion 6) and must be verified by the grep test command.

**Recommended guard:** Add to Phase 4e implementation notes — every `LessonAttempt` select block must be checked against this list: only `id`, `score`, `passed`, `feedback`, `tokensUsed`, `latencyMs`, `createdAt` are permitted.

### 6.2 PII exposure risk (HIGH)

The following fields contain personally identifiable information and require special handling:

| Field | Model | Risk | Required treatment in Phase 4 |
|---|---|---|---|
| `ipHash` | `UserActivityLog` | Hashed IP address; still personal data under GDPR | Exclude from default view; allow in collapsed `<details>` only |
| `userAgent` | `UserActivityLog` | Browser/OS fingerprint | Same as above |
| `metadata` | `UserActivityLog` | May contain arbitrary event payload including user-authored content | Same as above |
| `phone` | `UserProfile` | Direct PII | Show in profile section (read-only admin view acceptable); do not render in list pages |
| `secondaryEmail` | `UserProfile` | Direct PII | Same |
| `socialMedia` | `UserProfile` | May contain handles linking to real identity | Show in profile section only |
| `userPrompt` | `AiDialogue` | User-authored content | Truncate to 80 chars in table view |

**Current violation:** `admin/activity/page.tsx` renders `JSON.stringify` of all `UserActivityLog` fields including `ipHash` and `userAgent`. This must not be replicated in Phase 4h.

### 6.3 Access control risk (HIGH — affects all new pages)

Six of eight current admin pages call `requireAdminSession()` without a `try/catch`. In production, any unauthenticated request to these routes will yield HTTP 500 with a Next.js error page instead of a redirect to `/admin/login`. This violates acceptance criterion 7.

**All pages created or modified in Phases 2–5 must follow this pattern (from `admin/page.tsx`):**

```ts
try {
  await requireAdminSession();
} catch {
  redirect("/admin/login");
}
```

Additionally, the detail page must handle `notFound()`:

```ts
const user = await db.user.findUnique({ where: { id }, select: { ... } });
if (!user) notFound();
```

This satisfies acceptance criterion 5 (invalid user ID returns 404).

### 6.4 Unbounded query risk (MEDIUM)

Several current pages have no pagination or `take` limits:

- `admin/subscriptions/page.tsx` — fetches all subscriptions with no limit
- `admin/activity/page.tsx` — `take: 200` (reasonable for now, but hardcoded)
- `admin/dialogues/page.tsx` — `take: 150` (acceptable but large)

For the new detail page, the task document specifies explicit limits for every relation. These must be enforced: dialogues `take: 30`, activity logs `take: 100`, lesson attempts `take: 3` per lesson (or `take: 20` total), practice logs `take: 20`.

### 6.5 Style system inconsistency (LOW — appearance only)

The codebase is split between two styling approaches in admin pages:

- **Inline styles** (correct): `admin/page.tsx`, `admin/lessons/page.tsx`
- **Tailwind classes** (incorrect for new work): `admin/users/page.tsx`, `admin/users/[id]/page.tsx`, `admin/dialogues/page.tsx`, `admin/stats/page.tsx`, `admin/subscriptions/page.tsx`, `admin/activity/page.tsx`

All pages created or modified in Phases 2–5 must use inline styles with the defined palette. Using Tailwind on new pages would violate acceptance criterion 9.

### 6.6 `ADMIN_EMAILS` fallback (LOW)

If the env var is missing in production, `getAdminEmails()` returns `["admin@example.com"]`. This does not represent a broad security hole (no real account has that address) but would lock all admins out. Not in scope for this task but worth noting in deployment runbooks.

---

## 7. Recommended Implementation Plan for Phase 2

Phase 2 replaces `src/app/admin/users/page.tsx`. The following implementation plan reflects all findings above.

### 7.1 File to modify

`src/app/admin/users/page.tsx` — complete replacement.

### 7.2 Component type

Server component. `export const dynamic = "force-dynamic"` required (already in the existing file).

### 7.3 Props / search params

```ts
type SearchParams = { q?: string; page?: string };
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) { ... }
```

Next.js 16 passes `searchParams` as a Promise on server components — must be awaited.

### 7.4 Access control

```ts
try {
  await requireAdminSession();
} catch {
  redirect("/admin/login");
}
```

Must be the first executable statement after awaiting `searchParams`.

### 7.5 Constants

```ts
const PAGE_SIZE = 50;
```

### 7.6 Prisma query

Use exactly the query specified in the task document:

```ts
const [users, total] = await Promise.all([
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
  }),
  db.user.count({
    where: q ? {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ]
    } : undefined,
  }),
]);
```

`Promise.all` runs both queries concurrently, halving the round-trip time.

### 7.7 Pagination math

```ts
const totalPages = Math.ceil(total / PAGE_SIZE);
const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
const to = Math.min(page * PAGE_SIZE, total);
```

### 7.8 Search form

Plain HTML form, `method="get"`, single `<input name="q">` pre-populated with current `q` value. Submitting the form sets `?q=<value>&page=1` (the hidden page input must reset to 1 on new search, or the form can simply omit it and rely on the default).

### 7.9 Pagination links

```ts
const prevHref = page > 1 ? `?q=${q ?? ""}&page=${page - 1}` : null;
const nextHref = page < totalPages ? `?q=${q ?? ""}&page=${page + 1}` : null;
```

Rendered as `<a>` tags; when null, the button should be rendered as a disabled `<span>` with reduced opacity.

### 7.10 Table columns

email (linked to `/admin/users/${user.id}`), displayName, role, verified (✓ / —), plan status (`subscription?.status ?? "none"`), onboarded (`onboardingDone` boolean badge), level, XP, joined date.

### 7.11 Styling

All inline styles. Follow `admin/page.tsx` palette:
- Page background: `background: "#04000c"`
- Text: `color: "#ede8dc"`
- Table header border: `borderBottom: "1px solid rgba(201,162,39,0.25)"`
- Row hover: not needed for a server-rendered page
- Gold link: `color: "#c9a227"`
- Teal positive (verified, active): `color: "#14b8a6"`
- Muted: `color: "rgba(237,232,220,0.45)"`

### 7.12 Edge cases to handle

- `q` is an empty string after trim → treat as no filter (same as `q` undefined)
- `page` is non-numeric or less than 1 → clamp to 1
- `page` is greater than `totalPages` → show empty table (do not throw)
- Zero results → show "No users found" row spanning all columns

### 7.13 TypeScript requirements

- Do not use `any`. Derive the row type from the Prisma select using `Prisma.UserGetPayload<{ select: ... }>`.
- `npx tsc --noEmit --skipLibCheck` must exit with code 0.

---

## Appendix: File contents summary

For reference, the approximate current line counts and quality assessments of all audited files:

| File | Lines | Viable base | Recommended action |
|---|---|---|---|
| `admin/page.tsx` | ~200 | ✓ Yes | Keep as-is; copy try/catch pattern |
| `admin/login/page.tsx` | ~80 | ✓ Yes | Forbidden — do not touch |
| `admin/users/page.tsx` | 48 | ✗ No | Full replacement (Phase 2) |
| `admin/users/[id]/page.tsx` | 4 | ✗ No | Full replacement (Phases 3–4) |
| `admin/subscriptions/page.tsx` | 4 | ✗ No | Full replacement (deferred — not in this task's phases) |
| `admin/activity/page.tsx` | 4 | ✗ No | Full replacement (deferred) |
| `admin/dialogues/page.tsx` | 43 | ✗ No | Full replacement (deferred) |
| `admin/lessons/page.tsx` | 80 | ⚠ Partial | Fix `fullContextSent`/`aiRawResponse` include bug (deferred) |
| `admin/stats/page.tsx` | 4 | ✗ No | Full replacement (deferred) |

Pages marked "deferred" are outside the scope of Phase 2–5 as defined in the task document. They are flagged here for a follow-on task.
