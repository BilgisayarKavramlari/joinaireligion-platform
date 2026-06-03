# Post-Abuse Security Hardening Audit

Date: 2026-06-03

## Scope

Repository and deployment-configuration audit after VPS abuse suspension. This review focused on cron authorization, admin authentication, command-execution surfaces, container/runtime hardening, rate limiting, headers, logging, and whether any existing operational scripts could resemble abusive bot activity.

## Findings

### Critical

1. Unsigned session cookies make account and admin impersonation plausible.
   - `src/lib/auth.ts` stores session state as plain base64 JSON with no signature, MAC, encryption, or server-side session lookup.
   - `src/lib/admin.ts` trusts decoded cookie content for admin checks.
   - Multiple authenticated routes trust the same cookie pattern, including account/profile/onboarding/avatar/history/admin surfaces.
   - Impact: a forged cookie could let an attacker impersonate arbitrary users and potentially satisfy admin checks by forging a matching admin email or role.

### High

2. Several `/api/admin/*` endpoints accept `CRON_SECRET` as an alternative to admin session auth.
   - `src/app/api/admin/agents/route.ts`
   - `src/app/api/admin/autonomy/health/route.ts`
   - `src/app/api/admin/autonomy/deploy-status/route.ts`
   - This is operationally convenient, but it broadens blast radius if the cron secret is exposed through logs, shell history, process inspection, or host compromise.

3. Login and registration endpoints do not show explicit rate limiting or lockout controls.
   - `src/app/api/auth/login/route.ts`
   - `src/app/api/auth/register/route.ts`
   - Related auth endpoints such as forgot-password and verification should also be included in the same throttling plan.
   - Impact: brute-force, credential-stuffing, account enumeration, and mailbox abuse risk.

### Medium

4. The container runs as non-root, but runtime hardening is incomplete.
   - `Dockerfile` creates and uses `nextjs` user in the final stage, which is good.
   - `docker-compose.yml` does not add `read_only`, `tmpfs`, `cap_drop`, `security_opt: no-new-privileges`, or resource limits.
   - Writable filesystem use exists today via `src/app/api/upload/avatar/route.ts`, which writes under `public/uploads/avatars/...`.

5. No centralized security headers policy is configured.
   - `next.config.ts` only enables `reactStrictMode`.
   - No repo-level evidence of CSP, HSTS, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy, or X-Content-Type-Options headers.

6. Nginx exploit-probe hardening is not documented in the repo.
   - There is no repo-side Nginx blocklist guidance yet for obviously irrelevant probe paths such as `/wp-admin`, `/wp-login.php`, `/xmlrpc.php`, `/cgi-bin`, `/shell`, and `/GponForm`.

### Low / Positive

7. Cron endpoint authorization is generally present and consistent.
   - `src/app/api/cron/generate-practices/route.ts`
   - `src/app/api/cron/send-practice-emails/route.ts`
   - `src/app/api/cron/score-practice-responses/route.ts`
   - `src/app/api/cron/autonomy-repair/route.ts`
   - `src/app/api/cron/support-triage/route.ts`
   - All reviewed cron routes require Bearer `CRON_SECRET`.

8. No shell-command execution surface was found in application code.
   - No `child_process`, `exec`, `spawn`, `execFile`, `fork`, `shelljs`, `execa`, or dynamic shell execution was found in `src/` or app routes.

9. No public endpoint was found that executes OS commands.
   - Public routes do network/database work, but no route reviewed shells out to the host.

10. Current repo scripts do not look like botnet or scanner behavior by default.
   - Existing cron scripts call only this application’s own endpoints on a controlled cadence.
   - `system-health.sh` probes only `/api/health`.
   - No repo script attempts mass scanning, outbound probing, cryptomining, or binary fetching.

## Nginx Hardening Recommendations

At the reverse proxy layer, return fast static responses for irrelevant exploit paths so they never hit the app:

- `location = /wp-login.php { return 444; }`
- `location = /xmlrpc.php { return 444; }`
- `location ^~ /wp-admin { return 444; }`
- `location ^~ /cgi-bin/ { return 444; }`
- `location ^~ /shell { return 444; }`
- `location ^~ /GponForm { return 444; }`

Also:

- deny suspicious methods other than `GET`, `HEAD`, `POST` where feasible
- cap request body size for app routes that do not need uploads
- log these blocked paths to a dedicated security log for Fail2Ban-style patterning

## Rate-Limit Recommendations

Add conservative rate limits without breaking normal routes:

- `/api/auth/login`: per-IP and per-account throttling
- `/api/auth/register`: per-IP throttling plus disposable-email and duplicate-attempt controls
- `/api/auth/forgot-password`: per-IP and per-email cooldown
- `/api/auth/verify-email`: replay-resistant token use plus per-IP throttling
- `/api/feedback`, `/api/account/support`, `/api/ai/query`: per-IP and per-session ceilings with 429 responses

Use small burst allowances and longer cooldowns rather than aggressive blanket blocks.

## Security Headers Recommendations

Add app- or proxy-level headers:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-Frame-Options: DENY` or equivalent CSP `frame-ancestors 'none'`

Apply CSP carefully to avoid breaking Next.js inline/runtime behavior.

## Log Monitoring Recommendations

Add explicit detection rules for:

- `xmrig`
- `scanner_linux`
- `safenet-client-alpine-amd64`
- `wget http`
- `curl http`
- `/bin/sh`
- `/bin/bash`
- `chmod +x`
- `nc `
- `busybox`

Watch:

- Nginx access/error logs
- container stdout/stderr
- Docker daemon logs
- Fail2Ban jail matches

Escalate immediately if payload names appear in request URIs, query strings, user agents, or app logs.

## Could Current Scripts Be Misread As Abuse?

Not from the repository alone. The current scripts are narrow, predictable, and internal:

- cron scripts call only the site’s own endpoints
- health scripts perform simple uptime checks
- deploy scripts perform local build/restart work

The larger recurrence risk is unauthorized use of the app or host, not the intended repository scripts themselves.

## Content-Growth Agent Research Constraint

Future content-growth web research should use only controlled, rate-limited providers:

- approved search/news APIs
- approved social APIs
- RSS/Atom feeds from permitted sources
- explicit request budgets, retries, and concurrency caps

Do not allow free-form scraping, arbitrary URL crawling, shell-based fetch pipelines, or agent-driven browsing without domain allowlists and request-rate controls.

## Recommended Immediate Fixes

1. Replace unsigned base64 session cookies with signed server-validated sessions as the top priority.
2. Remove `CRON_SECRET` access from non-cron `/api/admin/*` endpoints, or split to a separate narrower ops token with read-only scope.
3. Add rate limiting to login, register, forgot-password, verify-email, feedback, and AI query endpoints.
4. Add proxy-level blocks for obvious exploit-probe paths before requests reach the app.
5. Add baseline security headers in app or Nginx config.
6. Harden the container runtime further with `no-new-privileges`, capability dropping, and a more minimal writable surface.
7. Review avatar upload storage design if a future read-only root filesystem is desired.

## Overall Assessment

The repository does not show botnet-like code paths, command-execution primitives, or weak cron authentication. The biggest current recurrence risk is not exploit-path noise like `/wp-login.php`; it is the application’s trust in unsigned client-side session cookies, combined with privileged endpoints that expose operational state when presented with shared secrets meant for cron automation.
