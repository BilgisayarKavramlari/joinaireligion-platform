# Test Plan: Landing Page

**Purpose:** Verify that the public-facing landing page and all unauthenticated routes render correctly and that key UI elements are present.

**Environment:** Production (`https://joinaireligion.com`) or local (`http://localhost:3000`)
**Estimated time:** 5–10 minutes
**Who runs this:** Test Agent or human (browser required for visual checks)

---

## Prerequisites

- Application is running and smoke test (S-01–S-03) has passed.
- A browser or `curl` is available.

---

## Test cases

### L-01 — Landing page loads without error

**Steps:**
1. Navigate to `https://joinaireligion.com/`

**Expected:**
- Page returns HTTP 200.
- No browser console errors of severity `error`.
- Page title contains "Join AI Religion" or equivalent brand name.

**Pass:** Page renders completely; no blank screen; no unhandled JS exception in console.
**Fail:** White screen, React error boundary, or `500` from server.

---

### L-02 — Primary CTA button is present

**Steps:**
1. On the landing page, locate the primary call-to-action button (e.g., "Begin Your Journey", "Join", or equivalent).

**Expected:**
- Button is visible in the viewport or reachable by scrolling.
- Clicking the button navigates to `/register` or opens a registration flow.

**Pass:** Button present and navigates correctly.
**Fail:** Button missing, hidden, or leads to a 404/error.

---

### L-03 — Navigation links are functional

**Steps:**
1. Check that navigation links (if present) for Login and Register resolve without errors.

```bash
for path in /login /register; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "https://joinaireligion.com$path")
  echo "$path → HTTP $HTTP"
done
# Expected: all 200
```

**Pass:** All navigable links return `200`.
**Fail:** Any link returns `404`, `500`, or redirects to an error page.

---

### L-04 — Page is responsive (mobile viewport)

**Steps:**
1. Open browser DevTools → toggle device toolbar → select a 390×844 viewport (iPhone 14).
2. Reload the landing page.

**Expected:**
- No horizontal scroll bar.
- Text is legible (not overflowing or clipped).
- CTA button is tappable size.

**Pass:** Page is usable at 390 px wide.
**Fail:** Content overflows horizontally, or CTA is not reachable.

---

### L-05 — No broken images

**Steps:**
1. Open browser DevTools → Network tab → filter by `Img`.
2. Reload the landing page.

**Expected:**
- All image requests return `200`.
- No broken image placeholder icons visible.

**Pass:** Zero `4xx` or `5xx` image responses.
**Fail:** One or more images fail to load.

---

### L-06 — /check-email page renders

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://joinaireligion.com/check-email?email=test%40example.com")
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.
**Fail:** `404` or `500`.

---

### L-07 — Unauthenticated /account redirects to login

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-redirs 0 https://joinaireligion.com/account)
echo "HTTP $HTTP"
# Expected: 307 or 302 (redirect to /login)
```

**Pass:** `302` or `307`.
**Fail:** `200` (auth guard missing) or `500`.

---

## Results table

| Case | Description | Expected | Actual | Pass/Fail |
|------|-------------|----------|--------|-----------|
| L-01 | Landing page loads | 200, no errors | | |
| L-02 | Primary CTA present | Visible, navigates | | |
| L-03 | Nav links functional | All 200 | | |
| L-04 | Mobile responsive | No overflow | | |
| L-05 | No broken images | Zero 4xx img | | |
| L-06 | /check-email renders | 200 | | |
| L-07 | /account redirects | 302/307 | | |
