# Join AI Religion Platform

Join AI Religion is a **fictional, educational platform** for AI-guided symbolic self-discovery and reflective practice.

> **Important disclaimer:** This project is not a religious authority, not medical care, and not psychological treatment.

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- PostgreSQL + Prisma
- Docker + Docker Compose
- Node.js 20 Alpine

## Quick Start (Local)

1. Copy env template:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d db
```

3. Install dependencies and generate Prisma client:

```bash
npm install
npx prisma generate
```

4. Run migrations (when ready):

```bash
npx prisma migrate dev --name init
```

5. Start app:

```bash
npm run dev
```

App should run at `http://localhost:3000` and health endpoint at `http://localhost:3000/api/health`.

## Docker

Build and run full stack:

```bash
docker compose up --build
```

## Project Structure

```text
.
├── docs/
│   ├── architecture.md
│   ├── content-policy.md
│   └── deployment.md
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── deploy-manual.sh
├── src/
│   ├── app/
│   │   ├── api/health/route.ts
│   │   ├── globals.css
│   │   └── page.tsx
│   └── lib/
│       ├── db.ts
│       └── env.ts
├── .env.example
├── docker-compose.yml
└── Dockerfile
```

## Safety & Scope

- No real API keys are included.
- No automatic deployment workflow is included.
- No production secrets are committed.
- External integrations (OpenAI, Stripe, email) are intentionally not implemented yet.

## Next Steps

- Add `package.json`, `next.config.ts`, `tailwind.config.ts`, and TypeScript project config.
- Implement authentication and onboarding flow.
- Add Stripe subscription lifecycle.
- Add usage quota enforcement for AI queries.
- Add observability, tests, and moderation pipeline.


## Production Docker Networking Notes

- App is bound to localhost only (`127.0.0.1:3001:3000`) for reverse proxy usage.
- Docker Postgres is internal-only in compose and does **not** publish port `5432` to host.
- `DATABASE_URL` should continue to use `db:5432` inside the Docker network.
- Real secrets are configured only in VPS `.env` and must never be committed.
- Stripe should remain in test/sandbox until production readiness review is completed.


## Simulation & Legal Framing

- This project is a fictional, educational, religion-themed **simulation game**.
- It is not affiliated with or representative of any religion or faith authority.
- It is not medical care or psychological treatment.
- Users must review legal pages before use:
  - `/legal/eula`
  - `/legal/email-consent`

- Admin features and prompt education pages are included (MVP read-only admin guard).
- Prompt guide page: `/prompt-guide` includes checklist, character limit (2000), and safety disclaimers.
