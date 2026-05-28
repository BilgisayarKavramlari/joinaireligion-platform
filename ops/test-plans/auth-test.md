# Test Plan: Auth, Onboarding, Lessons, and Admin

**Purpose:** Verify the full authenticated user journey from registration through onboarding, lesson access, and admin panel login. Covers the most critical user flows.

**Environment:** Production (`https://joinaireligion.com`) or local (`http://localhost:3000`)
**Estimated time:** 15–25 minutes
**Who runs this:** Test Agent or human (requires browser and a test email account)

---

## Prerequisites

- Smoke test has passed.
- Access to a test email inbox (to receive verification email).
- For admin tests: valid admin credentials (stored in `.env` on VPS — never in this document).
- Local environment: `npm run dev` running with a seeded database.

Set base URL once:
```bash
BASE="https://joinaireligion.com"   # or http://localhost:3000 for local
```

---

## Section A — Registration

### A-01 — Registration page renders

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/register")
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.

---

### A-02 — Registration rejects invalid email

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"password123","acceptedTerms":true}' | jq .
# Expected: { "error": "..." } with HTTP 400
```

**Pass:** `400` with an `error` field describing the validation failure.
**Fail:** `200`, `500`, or account created.

---

### A-03 — Registration rejects short password

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"abc","acceptedTerms":true}' | jq .
# Expected: 400, password too short
```

**Pass:** `400`.

---

### A-04 — Valid registration succeeds and sends verification email

1. Submit a registration form with a valid, previously unused email address.
2. Confirm the API returns `{ "ok": true, "next": "/check-email?email=..." }`.
3. Confirm a verification email arrives in the test inbox within 2 minutes.

**Pass:** `ok: true`, email received.
**Fail:** `500`, no email, or duplicate user created.

---

### A-05 — Duplicate email rejected

```bash
# Use the same email from A-04 (already registered)
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"<ALREADY_REGISTERED>","password":"password123","acceptedTerms":true}' | jq .
# Expected: 409
```

**Pass:** `409` with error message.

---

## Section B — Email verification & login

### B-01 — Email verification link works

1. Click the verification link from the email received in A-04.
2. Confirm the response includes `{ "ok": true, "onboardingDone": false, "next": "/onboarding" }`.
3. Confirm the browser is redirected to `/onboarding`.

**Pass:** Redirected to `/onboarding`; user session cookie set.

---

### B-02 — Login page renders

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/login")
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.

---

### B-03 — Login rejects wrong password

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"<REGISTERED_EMAIL>","password":"wrongpassword"}' | jq .
# Expected: 401
```

**Pass:** `401`.
**Fail:** `200` with a session cookie (auth bypass).

---

### B-04 — Login succeeds with correct credentials

1. Log in with the test account created in A-04 (after verification in B-01).
2. Confirm the API returns a session cookie (`jair_session`).
3. Confirm `/api/auth/me` returns `{ "user": { "email": "...", ... } }` when the cookie is sent.

**Pass:** Session cookie present; `/api/auth/me` returns user object.

---

## Section C — Onboarding

### C-01 — Onboarding page renders for new user

1. Log in as the test user (not yet onboarded).
2. Navigate to `$BASE/onboarding`.

**Expected:** Onboarding page renders with the first question visible.
**Pass:** Page loads, first question present.

---

### C-02 — Onboarding advances through questions

1. Answer the first question.
2. Confirm the UI advances to the next question without a full page reload.

**Pass:** Smooth progression; no 500 errors in network tab.

---

### C-03 — Onboarding completion marks user as onboarded

1. Complete all onboarding questions and submit.
2. Confirm the API returns `{ "ok": true, "next": "/lessons" }`.
3. Confirm a subsequent call to `/api/auth/me` returns `onboardingDone: true`.

**Pass:** `onboardingDone: true`; redirected to `/lessons`.

---

## Section D — Lessons

### D-01 — Lessons page renders for onboarded user

```bash
# With valid session cookie:
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  --cookie "jair_session=<SESSION>" "$BASE/lessons")
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.

---

### D-02 — Lesson detail API returns content

```bash
# Get the first available lesson ID from /api/lessons, then:
curl -s --cookie "jair_session=<SESSION>" \
  "$BASE/api/lessons/<LESSON_ID>" | jq '{title, stepNumber, quota}'
# Expected: { title: "...", stepNumber: 1, quota: { canSubmit: true } }
```

**Pass:** Lesson data present; `quota.canSubmit` is `true` for a fresh account.

---

### D-03 — Unauthenticated lesson access is blocked

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/lessons")
echo "HTTP $HTTP"
# Expected: 302 or 307 redirect to /login
```

**Pass:** Redirect to login.
**Fail:** `200` (auth guard missing).

---

## Section E — Admin

### E-01 — Admin login page renders

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/login")
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.

---

### E-02 — Admin login rejects non-admin credentials

1. Attempt to log in at `$BASE/admin/login` with a regular user account.

**Expected:** Access denied or redirect back to login.
**Pass:** Admin dashboard is not accessible.
**Fail:** Regular user reaches the admin dashboard.

---

### E-03 — Admin dashboard loads for admin user

1. Log in with admin credentials (from `.env` on VPS — do not document the actual values here).
2. Navigate to `$BASE/admin`.

**Expected:** Admin dashboard renders with stat cards and user table.
**Pass:** Dashboard visible; stat cards show numeric values (not `NaN` or `undefined`).

---

### E-04 — Admin user list loads

```bash
# With admin session cookie:
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  --cookie "jair_session=<ADMIN_SESSION>" "$BASE/admin/users")
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.

---

## Results table

| Case | Description | Expected | Actual | Pass/Fail |
|------|-------------|----------|--------|-----------|
| A-01 | Register page renders | 200 | | |
| A-02 | Rejects invalid email | 400 | | |
| A-03 | Rejects short password | 400 | | |
| A-04 | Valid registration | ok + email | | |
| A-05 | Duplicate email rejected | 409 | | |
| B-01 | Email verification works | → /onboarding | | |
| B-02 | Login page renders | 200 | | |
| B-03 | Wrong password rejected | 401 | | |
| B-04 | Login succeeds | session cookie | | |
| C-01 | Onboarding renders | page loads | | |
| C-02 | Onboarding advances | no errors | | |
| C-03 | Onboarding completion | onboardingDone: true | | |
| D-01 | Lessons page renders | 200 | | |
| D-02 | Lesson API returns content | data present | | |
| D-03 | Unauth lesson blocked | 302/307 | | |
| E-01 | Admin login page renders | 200 | | |
| E-02 | Non-admin blocked | no access | | |
| E-03 | Admin dashboard loads | stats visible | | |
| E-04 | Admin user list loads | 200 | | |
