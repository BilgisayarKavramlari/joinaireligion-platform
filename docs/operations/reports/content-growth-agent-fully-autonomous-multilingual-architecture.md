# Content Growth Agent - Fully Autonomous Multilingual Architecture

Date: 2026-06-03

## 1. Workflow

The Content Growth Agent runs daily and is responsible for producing at least one publishable public content item per day. Each run gathers candidate topics from internal product signals first, including support tickets, lesson activity, user comments, complaints, feature requests, and repeated FAQ-like questions. It also supports an external research stage for web/news/social and keyword opportunity inputs, but that stage should only be enabled later through approved APIs and policy-safe connectors.

For each chosen topic, the agent creates a canonical content brief, generates structured source content in the default authoring language, localizes it into all supported content locales (`en`, `tr`, `es`, `de`, `fr`, `ru`, `zh`), computes SEO and AEO metadata, and passes the result through an automatic publishability gate. Content that passes is published automatically without admin approval. Content that fails quality, completeness, language, duplication, or risk checks is automatically quarantined or rejected. After publication, admins can view, unpublish, and optionally republish items.

## 2. Data Model Summary

Add a content-domain model centered on a locale-independent `ContentItem` and locale-specific `ContentVariant` records. `ContentItem` should hold canonical topic identity, category, type, difficulty, source signals, workflow state, publishability decision, and aggregate performance metrics. `ContentVariant` should hold locale, localized title/body/summary, SEO fields, FAQ/AEO blocks, slug, quality scores, and per-locale publication timestamps.

Supporting records should include:

- `ContentAgentRun` for scheduled runs, status, counts, and failure reasons
- `ContentSourceSignal` for support/comment/lesson/request/topic evidence
- `ContentFeedbackMetric` for views, likes, dislikes, dwell, and CTR snapshots
- `ContentModerationDecision` for gate results, risk reasons, and auditability

This model should preserve the existing project pattern of audit-friendly agent runs and should keep locale variants structurally aligned with the site’s current i18n model.

## 3. Admin Pages

`/admin/content` should be the main dashboard for generated and published content. It should show published, quarantined, rejected, and unpublished items; per-locale coverage; category distribution; type distribution; views; likes; dislikes; and recent agent runs. Admins should be able to inspect the gate decision, open each locale variant, unpublish live items immediately, and republish previously unpublished items when still valid.

The admin surface should remain operational rather than editorial: it does not approve normal publishing, but it does provide visibility, intervention, and rollback controls.

## 4. Public Pages

The public surface should consist of `/content` for discovery and `/content/[slug]` for the item detail page. Rendering should respect the user’s selected site language and show the matching locale variant when available. Each page should include structured metadata for SEO, FAQ/AEO blocks when appropriate, and public interaction controls for like/dislike.

Public pages should display like counts only. Dislike counts should be captured for internal ranking and safety review but remain admin-only.

## 5. Publishing Gate

The automatic publishability gate is the core safety control. It replaces human approval for normal publishing and must block content that is empty, malformed, incomplete, duplicate, unsupported for the target locale, or high-risk. It should also reject content that conflicts with the platform’s fictional, educational, symbolic framing or contains legal, medical, therapy, payment, security, hateful, discriminatory, manipulative, or unsupported superiority claims.

Recommended gate stages:

- schema and required-field validation
- locale coverage validation for `en`, `tr`, `es`, `de`, `fr`, `ru`, `zh`
- slug/title/body completeness checks
- duplicate and near-duplicate detection
- SEO/AEO minimum score check
- policy and risk classification
- final publishability decision: `published`, `quarantined`, or `rejected`

## 6. Scheduling

The first scheduling slice should use the project’s existing cron-style pattern: one daily content-generation run plus lightweight repair/retry jobs for quarantined technical failures. The daily run should be idempotent and should guarantee that at least one successfully published content item is produced each day unless every candidate fails the gate. If all candidates fail, the run should record a failed daily quota event and surface it in admin metrics.

OpenAI usage should follow the existing `src/lib/openai/client.ts` pattern: lazy enablement, JSON-mode responses, timeout/error handling, and deterministic fallback behavior when generation fails. For this agent, fallback should not auto-publish placeholder content unless it still passes the same gate.

## 7. Metrics

Track output and outcome metrics separately.

- Output metrics: agent runs, items attempted, items published, quarantined, rejected, locale coverage, per-type volume, per-category volume
- Engagement metrics: views, unique viewers, likes, dislikes, like rate, dwell time, internal bounce proxy, CTA clicks
- Search metrics: impressions, indexed pages, ranking movement, organic entrances, FAQ rich-result eligibility
- Quality metrics: gate pass rate, duplication rate, localization completion rate, policy-risk rate

These metrics should feed future topic selection so the agent gradually prioritizes categories, formats, and difficulty levels that perform well without increasing safety risk.

## 8. Implementation Phases

Phase 1 should define the content-domain schema design, workflow states, publishability gate contract, and admin/reporting requirements in detail. Phase 2 should implement internal-signal topic intake, daily scheduling, and draft-to-published automation for one or two content types such as FAQ and blog article. Phase 3 should add full multilingual variants for `en`, `tr`, `es`, `de`, `fr`, `ru`, `zh`, public like/dislike capture, and performance dashboards. Phase 4 should add external research connectors, broader content types, stronger SEO/AEO scoring, and adaptive planning based on historical performance.

Recommended next slice: implement the data contract and workflow-state design for `ContentItem`, `ContentVariant`, `ContentAgentRun`, and the automatic publishability gate result model before building any routes or admin UI.
