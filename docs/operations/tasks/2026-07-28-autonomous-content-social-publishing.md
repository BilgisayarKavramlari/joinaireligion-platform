# Autonomous Content and Social Publishing

Status: Approved for implementation and production deployment.
Date: 2026-07-28

## Owner authorization

The project owner explicitly requested that the complete content lifecycle be controlled by agents: scheduled generation, independent review, automatic publication, SEO, engagement measurement, adaptive topic planning, public social listening, social composition, and automatic posting to configured social accounts.

## Autonomous workflow

1. The producer creates five-locale structured content in a non-public staging state.
2. A separate publisher agent reconstructs and reruns the deterministic quality, completeness, duplication, and safety gate.
3. Passing content is published automatically. Failed content is quarantined or rejected without deletion.
4. Public pages expose canonical metadata, locale alternates, article/FAQ structured data, sitemap entries, and anonymous aggregate interactions.
5. A performance agent updates aggregate scores and can reversibly unpublish content only after a strong negative-signal threshold.
6. The next producer run uses aggregate engagement and public social trend summaries to prioritize future topics.
7. Social composition uses only published site content. A separate publisher validates the source, text, destination, and provider configuration before posting.

## Hard boundaries

- no private user text or identity is exported to content or social providers
- no direct messages, replies, comments, follows, likes, or engagement farming
- no political targeting, religious superiority claims, health/legal/financial claims, or manipulative calls to action
- no advertising spend or campaign mutation
- social posting is limited to explicitly configured organization/account credentials
- provider secrets remain only in the production environment and are never logged or persisted
- external actions are idempotent where the provider supports it, and all attempts are recorded in `AgentRun`/`AgentArtifact`
- unpublishing is reversible; no content, user, payment, or interaction record is deleted
