# Test Plan: Smoke Test — Production Health

**Purpose:** Verify that the application is reachable, the API is responding, and core infrastructure is healthy. Run this immediately after any deployment and at any time a production issue is suspected.

**Environment:** Production (`https://joinaireligion.com`)
**Estimated time:** 2–3 minutes
**Who runs this:** Test Agent or human

---

## Prerequisites

- `curl` available in shell
- Production deployment completed
- VPS SSH access not required for these checks

---

## Test cases

### S-01 — Health endpoint returns 200

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://joinaireligion.com/api/health)
echo "HTTP $HTTP"
# Expected: HTTP 200
```

**Pass:** Response is `200`.
**Fail:** Any other status code or connection refused.

---

### S-02 — Health response body is valid

```bash
curl -s https://joinaireligion.com/api/health | jq .
# Expected: { "status": "ok" } or equivalent non-error JSON
```

**Pass:** JSON body contains a `status` field that is not an error value.
**Fail:** Empty body, HTML error page, or `{ "error": "..." }`.

---

### S-03 — Landing page is reachable

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://joinaireligion.com/)
echo "HTTP $HTTP"
# Expected: HTTP 200
```

**Pass:** `200`.
**Fail:** `5xx`, connection refused, or timeout.

---

### S-04 — HTTPS certificate is valid

```bash
curl -sv https://joinaireligion.com/ 2>&1 | grep -E "SSL|TLS|certificate|expire"
# Expected: no SSL errors; certificate is valid and not expiring within 7 days
```

**Pass:** No certificate error in curl output.
**Fail:** `SSL certificate problem`, `certificate has expired`, or `unable to verify`.

---

### S-05 — API auth endpoint responds

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://joinaireligion.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.invalid","password":"invalid"}')
echo "HTTP $HTTP"
# Expected: 400 or 401 (invalid credentials rejected, not a 500)
```

**Pass:** `400` or `401`.
**Fail:** `500` or connection refused (indicates server crash or DB connectivity failure).

---

### S-06 — Static assets load (no CDN errors)

```bash
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://joinaireligion.com/favicon.ico)
echo "HTTP $HTTP"
# Expected: 200
```

**Pass:** `200`.
**Fail:** `404` or `5xx`.

---

## Results table

| Case | Description | Expected | Actual | Pass/Fail |
|------|-------------|----------|--------|-----------|
| S-01 | Health endpoint status | 200 | | |
| S-02 | Health response body | `{"status":"ok"}` | | |
| S-03 | Landing page reachable | 200 | | |
| S-04 | HTTPS certificate valid | No SSL error | | |
| S-05 | Auth endpoint responds | 400 or 401 | | |
| S-06 | Static assets load | 200 | | |

---

## On failure

If S-01 or S-05 fails with a `5xx`, check container logs immediately:

```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/apps/joinaireligion
docker compose logs --tail=100
docker compose ps
```

Escalate to human if containers are down or the database connection is failing.
