# Architecture Overview

## Product Positioning

Join AI Religion is a fictional, educational reflective-practice platform.
It supports symbolic self-discovery journeys and is **not** a religious authority,
medical provider, or psychological treatment system.

## Monorepo Skeleton (Current)

This repository currently contains a single web app foundation and supporting infrastructure files.
It is structured to evolve into a broader monorepo with additional packages later.

## Core Layers

- **Frontend (Next.js App Router):** Landing page and API routes.
- **Application services:** AI orchestration, onboarding logic, quota checks, and the member-only Reflection Companion.
- **Data layer (PostgreSQL + Prisma):** User, onboarding, usage, subscription, and practice tracking models.
- **Infrastructure (Docker):** Local/prod-like runtime.

## Initial Domain Models

- Identity & access: `User`, `UserProfile`, `EarlyAccessLead`
- Onboarding & reflection: `OnboardingAnswer`, `Practice`, `UserPracticeLog`, `JourneyLevel`
- AI usage & billing prep: `AiQuery`, `QueryQuota`, `Subscription`
- Reflection Companion: verified membership → same-origin/JSON gate → deterministic injection/crisis checks → database quota, session, network, and global-budget reservation → lesson ownership/grounding → input moderation → tool-free structured OpenAI response with `store:false` → output moderation/policy gate → text-free `AiDialogue` and aggregate activity metrics. New Reflection Companion text is never written to `AiQuery`. `store:false` disables provider application state; the consent layer separately discloses possible OpenAI abuse-monitoring retention under its current API data controls.
- Messaging observability: `EmailLog`

## Safety Boundaries

- No religious, medical, or psychological authority claims.
- No emergency or crisis decisioning.
- All generated guidance should be framed as optional reflective prompts.
