# Reflection Companion launch pack

Release: `reflection-companion-launch-v1`

Owner scope: 2026-08-13 explicit product-and-campaign launch command

Primary language: English; one localized article/draft exists for `en`, `tr`, `es`, `de`, `fr`, `ar`, `ru`, and `zh`

## Positioning

**Promise:** Ask what a lesson left open, receive a bounded perspective, a genuine reflection question, and one small reversible next step.

**Audience:** Adults who are curious about meaning, values, lessons, and worldview comparison but do not want an AI to tell them what to believe.

**Package facts:**

- Guests see examples but cannot send live questions.
- Free and Seeker: one lesson-grounded session and three turns per UTC day.
- Initiate: three sessions and twenty-four turns per UTC day, including Life Reflection.
- The safety, correctness, moderation, and non-authority standard is identical across plans.
- Join AI Religion does not retain question or answer text; OpenAI processing is explicitly disclosed and may include up to 30 days of default abuse-monitoring retention unless stronger provider controls apply.

## Campaign message hierarchy

1. **Lead with curiosity:** “Ask what the lesson left open.”
2. **Show the product shape:** concise answer, reflection question, optional next step.
3. **Establish trust:** member-only, bounded use, no tools, no live monitoring, no religious/professional authority.
4. **Explain privacy precisely:** no application text persistence; do not claim zero provider retention.
5. **Call to action:** open `/companion`; guests create a free verified account.

## Organic creative system

The existing Instagram/Facebook visual generator creates a 4:5 card from the locale-specific article title and summary. For this campaign, the visual hierarchy is:

- top label: `REFLECTION COMPANION`
- primary line: the localized article title
- support line: the localized summary
- footer: `joinaireligion.com/companion`
- visual tone: calm, high-contrast, human-readable; no sacred symbols presented as endorsement, no simulated chat testimonials, no fear or urgency tactics

Text providers use the localized title, summary, attributed article URL, and existing bounded hashtags. Every URL carries source/medium/campaign attribution. The publisher may use only already-configured brand accounts and records `PUBLISHED`, `FAILED`, `SKIPPED`, or `AMBIGUOUS` without blind retries after uncertain creation.

## Measurement and agent feedback

Measure only privacy-minimized aggregates:

- campaign sessions and landing-page views;
- account-registration link clicks;
- Reflection Companion sessions, turns, safety redirects, total tokens, and useful/not-useful votes;
- public provider likes, comments, and shares where the provider permits collection.

Content-performance may compare formats and locales only after minimum sample thresholds. It never receives questions, answers, referrer query strings, raw IP addresses, or individual belief/profile data. Small samples are reported as inconclusive and do not trigger new language accounts or product-policy changes.

## Release and rollback

- Admin launch endpoint: `POST /api/admin/reflection-companion/launch`
- Authorization: signed admin session plus same-origin request
- Content idempotency: fixed SHA-256 fingerprint for launch version
- Social idempotency: one package per content item plus provider delivery records
- Rollback: revert the application release and disable `AI_REFLECTION_ENABLED`; do not delete or blindly recreate public social posts
