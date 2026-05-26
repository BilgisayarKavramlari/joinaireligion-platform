# Deployment (Manual, VPS)

This project intentionally avoids automatic deployment workflows at this stage.

## Target

- VPS path: `/opt/apps/joinaireligion`
- Domain: `joinaireligion.com`

## Prerequisites on VPS

- Docker Engine + Docker Compose plugin installed
- Git installed
- Reverse proxy configured separately (Nginx/Caddy/Traefik)
- TLS certificates configured separately

## Manual Deploy Steps

1. Clone repository on VPS.
2. Copy environment template and set real values locally on server:
   ```bash
   cp .env.example .env
   ```
3. Review `.env` values (never commit secrets).
4. Run deployment script:
   ```bash
   ./scripts/deploy-manual.sh
   ```
5. Verify containers:
   ```bash
   docker compose ps
   docker compose logs -f app
   ```
6. Verify health endpoint through proxy:
   - `https://joinaireligion.com/api/health`

## Rollback

- Re-deploy previous commit and re-run `docker compose up --build -d`.

## Notes

- No CI/CD deploy workflow is included by design.
- No deployment secrets are stored in this repository.
