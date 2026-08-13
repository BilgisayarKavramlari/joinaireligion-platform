# Security incident runbook

## Immediate incident response
1. Put the site behind maintenance or Nginx rate limits if active abuse continues.
2. Preserve evidence before cleanup: `docker compose ps`, `docker compose logs --since 24h > incident.log`, Nginx access/security logs, and `git rev-parse HEAD`.
3. Rotate exposed or suspected secrets.
4. Deploy the latest security branch and verify health endpoints.
5. Send Hostinger a concise remediation summary with commit SHA, dependency audit output, Nginx probe blocks, and Docker hardening state.

## Required production environment variables
- `DATABASE_URL` with the production DB password.
- `POSTGRES_PASSWORD` for the Compose-managed Postgres container; never hard-code this in `docker-compose.yml`.
- `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAILS`, `INTERNAL_AGENT_API_KEY`, `CRON_SECRET`, `OPENAI_API_KEY`, Stripe keys/webhook secret, Resend API key, and `EMAIL_FROM`.

## Abuse-control rate limits
The in-process limiter currently uses conservative one-hour windows for sensitive auth flows: register 5/IP and 3/email, forgot-password 5/IP and 3/email, resend-verification 6/IP and 3/email, verify-email 20/IP. Keep Nginx auth limits enabled as a second layer.

## Unsubscribe token storage
`User.unsubscribeToken` now stores a SHA-256 hash of the raw URL token. The raw token is generated only for outbound email links and is not persisted. Existing legacy raw unsubscribe tokens should be rotated by sending fresh email or clearing the field.

## Secret rotation checklist
- VPS SSH keys and deploy user authorized keys.
- GitHub Actions secrets.
- `CRON_SECRET`.
- `INTERNAL_AGENT_API_KEY`.
- Session cookies are server-side random tokens; rotate by deleting rows in `Session` if compromise is suspected.
- `OPENAI_API_KEY`.

## Reflection Companion cost and abuse controls

- `AI_REFLECTION_ENABLED=false` is the immediate feature kill switch; absence means enabled after all other safe configuration checks pass.
- `AI_REFLECTION_MODEL` may pin an approved model; the default is `gpt-5-mini`.
- `AI_REFLECTION_GLOBAL_DAILY_LIMIT` defaults to 1,000 paid generation reservations across the service.
- `AI_REFLECTION_FREE_IP_DAILY_LIMIT` defaults to 24 reservations per daily keyed network hash; `AI_REFLECTION_INITIATE_IP_DAILY_LIMIT` defaults to 72.
- `ANALYTICS_HASH_SECRET` or `CRON_SECRET` is required to create non-reversible daily network and safety identifiers. Raw IP addresses, prompts, answers, cookies, and user-agent strings must not be logged.
- A request reserves account, session, network, and global budget before provider generation. Provider errors still consume the reservation to prevent deliberate error-driven retry amplification.
- Emergency shutdown order: set the feature kill switch, confirm `/api/ai/query` returns 503, inspect aggregate `reflection_response_completed` outcomes and provider status without reading content, then restore only after the failure category is understood.
- Stripe secret key and Stripe webhook secret.
- Resend API key.
- Database password and any backup credentials.

## npm audit and dependency checks
```bash
npm ci
npm run audit:high
npm outdated
npm run verify
```

## Docker and log forensics
```bash
docker compose ps
docker compose logs --tail=500 app
docker compose logs --since 24h app > app-24h.log
docker inspect joinaireligion_app --format '{{json .HostConfig.SecurityOpt}} {{json .HostConfig.CapDrop}}'
docker stats --no-stream
```

## Nginx monitoring
```bash
tail -f /var/log/nginx/joinaireligion.security.log
tail -f /var/log/nginx/joinaireligion.error.log
awk '{print $1}' /var/log/nginx/joinaireligion.security.log | sort | uniq -c | sort -nr | head
```

## Hostinger re-enable checklist
- Confirm app uses patched Next.js/React and `npm run audit:high` passes or has documented mitigations.
- Confirm Nginx blocks common WordPress/router/shell probes.
- Confirm Docker app has `no-new-privileges`, dropped capabilities, pids/memory/CPU limits, and tmpfs `/tmp`.
- Confirm auth no longer trusts client-controlled base64 session JSON.
- Confirm Stripe and unsubscribe routes do not trust raw client identifiers.

## Rollback plan
1. Revert the problematic commit and redeploy with `docker compose up -d --build app`.
2. If schema migration caused the incident, restore the latest database backup or run a tested down migration.
3. Keep Nginx probe blocking and rate limits enabled during rollback.
4. Re-run `npm ci`, `npm run audit:high`, `npm run test:ci`, and health checks before asking Hostinger to re-enable.

## Post-deploy verification
```bash
npm ci
npm run test:ci
npm run verify
npm run audit:high
curl -I https://joinaireligion.com/
curl -I https://joinaireligion.com/wp-login.php
```
