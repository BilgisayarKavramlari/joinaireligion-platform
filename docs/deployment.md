# Deployment (GitHub Actions to VPS)

Normal deployments run through the verified GitHub Actions workflow and a restricted, root-owned VPS wrapper. Database schema changes remain manual and approval-gated.

## Target

- VPS path: `/opt/apps/joinaireligion`
- Domain: `joinaireligion.com`

## Prerequisites on VPS

- Docker Engine + Docker Compose plugin installed
- Git installed
- Reverse proxy configured separately (Nginx/Caddy/Traefik)
- TLS certificates configured separately

## Manual Deploy Steps

1. Clone the repository on the VPS at the target path.
2. Copy environment template and set real values locally on server:
   ```bash
   cp .env.example .env
   ```
3. Review `.env` values (never commit secrets).
4. Install the restricted runtime wrappers once as root:
   ```bash
   bash ops/server/install-vps-runtime
   ```
5. Configure the GitHub Actions SSH secrets, then push an approved commit to `main`.
6. Verify containers:
   ```bash
   docker compose ps
   docker compose logs -f app
   ```
6. Verify health endpoint through proxy:
   - `https://joinaireligion.com/api/health`

## Rollback

- Re-deploy previous commit and re-run `docker compose up --build -d`.

## Notes

- The automation SSH user is not in the Docker group and has no general sudo access.
- Normal deployment checks migration status but never applies migrations or seeds.
- No deployment secrets are stored in this repository.


## Stripe (Test Mode) Setup

1. In Stripe Dashboard, enable **Test mode**.
2. Create monthly recurring prices for:
   - Seeker
   - Initiate
3. Copy values into server `.env`:
   - `STRIPE_SECRET_KEY` (test secret key)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test publishable key)
   - `STRIPE_PRICE_SEEKER_MONTHLY`
   - `STRIPE_PRICE_INITIATE_MONTHLY`
   - `STRIPE_WEBHOOK_SECRET` (from webhook endpoint)
4. Configure webhook endpoint to:
   - `https://joinaireligion.com/api/stripe/webhook`
5. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

> Keep Stripe keys in test mode until production readiness review is complete.


## PostgreSQL exposure

- PostgreSQL in `docker-compose.yml` is intentionally internal-only and not exposed to public host ports.
- Application and migration tooling should connect through Docker network hostname `db:5432`.

## Secrets policy

- Keep repository `.env.example` placeholders only.
- Configure real production secrets only in VPS-local `.env` (never commit).

## Stripe key policy

- Use test keys during staging and initial validation.
- Switch to production Stripe keys only after readiness/security review.

## Admin/Internal API keys

- `ADMIN_EMAILS` controls placeholder admin access allowlist (comma-separated emails).
- `INTERNAL_AGENT_API_KEY` protects internal summary endpoints.
- Set real values only in VPS `.env` and never commit secrets.

## Auth/Email setup

- Configure email provider keys in VPS `.env` to enable real verification/password-reset email delivery.
- Without provider keys, APIs return safe fallback responses and do not send real messages.

## Stripe Customer Portal

- Enable Customer Portal in Stripe dashboard.
- App endpoint: `POST /api/stripe/create-portal-session` for authenticated users with Stripe customer id.
