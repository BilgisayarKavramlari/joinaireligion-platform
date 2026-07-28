# Russian and Simplified Chinese Locale Expansion

Status: Approved for implementation and production deployment.
Date: 2026-07-28

## Owner authorization

The project owner requested Russian and Chinese support for the live site. Chinese is implemented as Simplified Chinese (`zh`); Russian uses `ru`.

## Scope

- add `ru` and `zh` to public language selectors and preferences
- provide native core-interface and landing-page translations
- include both locales in autonomous content production, independent publication gates, SEO metadata, hreflang, sitemap, RSS, Atom, JSON Feed, social packages, and engagement validation
- add Russian and Simplified Chinese high-risk phrase checks
- add an additive, manual locale-backfill agent for already-published content
- notify IndexNow after each new localized page is published

## Safety and preservation boundaries

- do not delete, overwrite, or unpublish existing content or locale variants
- backfill only from an already-published English source variant
- publish translations only after the complete seven-locale deterministic safety and quality gate passes
- retain the existing daily publication limit and two-agent separation of duties
- take a verified production backup before adding backfilled production records
