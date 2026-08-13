# Paid acquisition readiness and pilot decision project

Date: 2026-08-13

Status: **Phase 0 planning is active; implementation and advertising spend remain disabled pending their own reviewed decisions.**

This project prepares a privacy-preserving paid-acquisition experiment for Join AI Religion. It does not authorize an ad account, payment method, platform terms, tracking pixels, OAuth grant, campaign launch, or spend. Those remain explicit owner gates.

## Executive decision

Do not launch paid advertising yet. The current live sample is too small and the product cannot calculate paid CAC or ROAS reliably:

- 4 total users, 3 verified users, 1 active paid member, and USD 25 all-time revenue were visible in the live admin dashboard on 2026-08-13; this is an inventory snapshot, not economic evidence, because test/admin status, refunds, fees, taxes, and cohort age have not been separated;
- the last 7 days showed 11 sessions and 2 registration-page link clicks;
- the ads-readiness artifact remains `INSUFFICIENT_BASELINE`;
- acquisition attribution stops at the registration-page click and does not yet connect a campaign to completed registration, email verification, subscription start, or renewal; and
- `ads-reporting`, `cfo-reporting`, and `revenue-orchestrator` are report-only and have no campaign or spend authority.

Proceed with a USD 0 Phase 0. Revisit one tightly capped pilot only after the measurement, privacy, budget, and baseline gates below pass.

## Non-negotiable ethical boundary

No campaign may infer, target, exclude, retarget, or optimize from religious or philosophical belief, private reflection, journal content, mental-health state, loneliness, sexual behavior, pornography use, crisis signals, ethnicity, or another sensitive characteristic or proxy.

Allowed segmentation is limited to:

- user-selected language;
- broad country or region where platform policy and local law permit;
- neutral page or media context;
- device and placement;
- aggregate first-party outcomes with privacy thresholds; and
- professional or educational context that does not act as a sensitive proxy.

Customer lists, Customer Match, lookalikes, actalikes, remarketing, custom audiences built from private users, and automatic audience expansion are out of scope for the pilot.

## Channel comparison

Weights: policy safety 30%, contextual or intent fit 20%, small-budget testability 15%, existing asset readiness 15%, privacy-preserving measurement 10%, learning speed 10%. Scores are an editorial planning index based on these criteria, not an empirical performance forecast; exact provider forecasts require an eligible ad account and are not outcome guarantees.

| Rank | Channel | Score | Best compliant use | Pilot planning assumption | Decision |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Google Search | 89 | Exact/phrase neutral intent around responsible AI, reflective learning, journaling prompts, and meaning-making exercises | Preferred: USD 150 campaign-total budget for 14 days, with provider-managed pacing and no daily setting; Search Network only | First paid candidate after readiness |
| 2 | Meta Reels/Stories | 82 | Broad 18+ country-and-language delivery of short educational reflection videos | USD 10/day for 14 days | Second experiment, not concurrent with Search |
| 3 | Pinterest contextual discovery | 76 | Neutral AI ethics, journaling, reflection prompts, and critical-thinking creative | USD 8/day for 10 days | Third experiment after business/ad-account, owned-Pin, billing, and terms readiness; Standard Access is needed only for API automation |
| 4 | Podcast/newsletter sponsorship | 75 | Contextual sponsorship of a specific AI ethics, education, or philosophy publication | USD 150–500 negotiated placement | Privacy-friendly fallback to Pinterest |
| 5 | Reddit | 68 | Neutral keyword/context only; no religious community targeting | USD 10/day for 14 days | Defer until current targeting policy is manually reverified |
| 6 | LinkedIn | 64 | Professional AI ethics, education, research, and responsible-technology context | USD 25/day for 14 days | Too expensive for the first learning cycle |
| 7 | X | 61 | General AI/technology context | USD 10/day for 14 days | Defer for brand safety and account readiness |
| 8 | TikTok | 28 | No recommended paid use under the current brand/topic framing | Not applicable | Exclude from paid plan |

Planning amounts are internal experiment assumptions, not universal provider minimums or authorization to spend.

### Channel planning-index detail

| Channel | Policy safety /30 | Intent fit /20 | Small-budget test /15 | Asset readiness /15 | Private measurement /10 | Learning speed /10 | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Google Search | 28 | 19 | 14 | 12 | 8 | 8 | 89 |
| Meta Reels/Stories | 24 | 16 | 13 | 14 | 7 | 8 | 82 |
| Pinterest | 27 | 16 | 11 | 8 | 7 | 7 | 76 |
| Podcast/newsletter sponsorship | 28 | 17 | 8 | 8 | 8 | 6 | 75 |
| Reddit | 19 | 15 | 10 | 8 | 7 | 9 | 68 |
| LinkedIn | 26 | 12 | 7 | 9 | 6 | 4 | 64 |
| X | 19 | 12 | 10 | 8 | 5 | 7 | 61 |
| TikTok | 5 | 5 | 3 | 7 | 4 | 4 | 28 |

## Language and market research priority

The score is an editorial research-priority index, not a predicted membership probability or reproducible media forecast. It combines public internet-reach ceiling, channel fit, product/content readiness, relative access economics, first-party evidence, and a testable conversion hypothesis. The first-party evidence component is deliberately low for every row.

| Rank | Language and broad market group | Score | Readiness decision | Primary conversion hypothesis |
| ---: | --- | ---: | --- | --- |
| 1 | English: US, UK, Canada, Australia, Ireland, New Zealand, Singapore; later India, Philippines, Nigeria, South Africa, Kenya, and Ghana, each after local review | 79 | Primary no-spend experiment | Responsible-AI resource → methodology/Meaning Map → account |
| 2 | Spanish: Mexico, Spain, Colombia, Argentina, Peru, Chile and broader Latin America | 76 | Primary no-spend experiment | Practical reflection guide → free learning path → account |
| 3 | French: France, Belgium, Switzerland, Canada; later Francophone markets assessed individually with local review | 69 | Primary no-spend experiment | Critical/cross-cultural AI inquiry → series → account |
| 3 | Turkish: Türkiye; Turkish-language users elsewhere only through explicit language choice or neutral content context | 69 | Primary no-spend experiment | Concise responsible-AI practice → account |
| 5 | German: Germany, Austria, Switzerland | 67 | Second-wave validation | Privacy/safety evidence → account |
| 6 | Arabic: Egypt, Saudi Arabia, UAE, Jordan, Iraq, and Morocco assessed as separate markets with local editorial review | 61 | Fix product readiness first | Neutral Modern Standard Arabic reflection → opt-in account |
| 7 | Russian-language users in supported open-web markets, reached only through explicit language choice or neutral content context; passive SEO/RSS for Russia | 50 | Organic learning lane | Responsible-AI explainer → feed/email; membership secondary |
| 8 | Chinese: Singapore/Malaysia (Simplified) and Taiwan/Hong Kong (Traditional), only after script and market separation | 42 | Product decision first | Evidence-led AI reflection → account after script/market split |

Important readiness gaps:

- country conversion ranking cannot be established because trusted country headers are not enabled and small groups are suppressed;
- in the live seven-day snapshot observed on 2026-08-13, English was the only reported locale; this was an 11-session sample and is not evidence of language demand;
- Arabic content and RTL article rendering exist, but Arabic is absent from the main landing/UI locale registry;
- Simplified and Traditional Chinese require separate product/editorial decisions; and
- equal content counts do not prove equal translation quality or cultural resonance.

### Language planning-index detail

| Language | Reach ceiling /25 | Channel fit /20 | Product readiness /20 | Access economics /15 | First-party evidence /10 | Conversion hypothesis /10 | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| English | 25 | 20 | 19 | 7 | 1 | 7 | 79 |
| Spanish | 22 | 18 | 18 | 10 | 1 | 7 | 76 |
| French | 16 | 17 | 18 | 10 | 1 | 7 | 69 |
| Turkish | 12 | 17 | 18 | 14 | 1 | 7 | 69 |
| German | 10 | 17 | 18 | 12 | 1 | 9 | 67 |
| Arabic | 20 | 16 | 9 | 8 | 1 | 7 | 61 |
| Russian | 15 | 9 | 15 | 7 | 1 | 3 | 50 |
| Chinese | 7 | 10 | 8 | 8 | 1 | 8 | 42 |

## Ethical personas

These are contextual creative briefs, not stored user profiles.

| Persona | Observable, permitted context | Need/hypothesis | Suitable channel and CTA | Prohibited inference |
| --- | --- | --- | --- | --- |
| Responsible-AI educator/practitioner | AI ethics, education, or responsible-technology context | Classroom-safe reflection framework | Search, YouTube, LinkedIn → methodology pack | Religion, ideology, employer belief |
| Multilingual lifelong learner | User-selected language | A structured, accessible learning path | Search, YouTube, podcast → save a free path | Nationality, ethnicity, native language |
| Reflective-practice explorer | User intentionally opens a neutral journaling/practice context; this may tailor the current page or aggregate analysis only, never create an audience or retargeting list | A short guided exercise | Search, Instagram, podcast → explore Meaning Map | Mental health, loneliness, hardship |
| Cross-cultural philosophy reader | Philosophy/AI article context | Compare ideas without an authority claim | Search, RSS, podcast → topic collection | Religious or philosophical affiliation |
| Higher-education instructor/graduate learner | Professional/learning context | Citation-ready responsible-AI material | Search, LinkedIn, YouTube → teaching pack | Student status beyond selected context |
| Open-web/privacy community builder | Public RSS/open-web context | Transparent, low-tracking participation | RSS, Mastodon, Bluesky → follow feed/optional account | Belief, political view, private browsing history |

## Proposed campaign projects

### Project A — Responsible AI Reflection Search Pilot

Preferred first paid experiment after all gates pass.

- Provider objective/bidding before any separately approved conversion feed: clicks, using Maximize Clicks or a reviewed manual-CPC setup. Internal evaluation: meaningful Meaning Map interaction and verified registration.
- Network: Google Search only; Display expansion and Performance Max off.
- Initial language: English only. Spanish, Turkish, and French run as later separate experiments, never mixed into one learning cell.
- Neutral exact/phrase themes: `responsible AI reflection`, `AI journaling prompts`, `meaning-making exercises`, `AI ethics reflection`.
- Negative concepts: therapy, crisis, diagnosis, conversion, miracle, cult, treatment, religion membership.
- Ad concept: “Explore an AI-assisted reflection experiment.”
- Disclosure: “Fictional and educational; not a religion, church, therapist, or crisis service.”
- Landing page: a dedicated campaign page explaining the experiment above the fold before the CTA.
- Prohibited: remarketing, Customer Match, custom segments from private users, audience expansion, sensitive keywords, or uploading enhanced-conversion identifiers.

### Project B — 30-second Reflection Reels Pilot

- Provider objective before any separately approved conversion feed: Traffic/Landing Page Views. Internal evaluation: meaningful Meaning Map completion, then verified registration.
- Creative: two reviewed vertical videos per tested language, using existing approved assets where suitable.
- Audience: broad 18+, country and language controls only.
- CTA: “Explore the Meaning Map.”
- Copy must never say or imply “you are lost/lonely/religious,” “AI knows your purpose,” healing, diagnosis, or conversion.
- Start with UTM and first-party aggregate measurement. Meta Pixel/CAPI remains absent in Phase 1 unless a separate consent, privacy, and event-allowlist review is approved.

### Project C — Meaning Map Pinterest Discovery Pilot

- Provider objective before any separately approved conversion feed: consideration/outbound clicks. Internal evaluation: qualified visit and Meaning Map completion.
- Creative: four to six vertical Pins such as “Three questions for reflective AI use” and “A map for thinking, not answers.”
- Audience: 18+, broad country/language, neutral AI ethics/journaling/critical-thinking context.
- Prohibited: religion/spirituality keywords, actalikes, customer lists, automatic expansion, or sensitive lead fields.
- Pinterest Tag remains absent until separately approved consent and sensitive-data safeguards exist.

## Phase 0 — USD 0 readiness work

### Product and measurement

1. Add privacy-safe outcome events for:
   - `meaning_map_started`;
   - `meaning_map_completed`;
   - `registration_completed`;
   - `email_verified`;
   - `subscription_started`; and
   - `first_renewal_succeeded`.
2. Preserve only allowlisted `source`, `medium`, and `campaign` labels in first-party attribution/events; never store search queries, creative text, belief answers, journal text, or sensitive onboarding answers in those events. Provider-side search-term processing remains governed by the provider and must be reviewed separately.
3. Define a campaign-attribution expiry and document it. Do not build cross-day behavioral profiles beyond the minimum aggregate attribution contract.
4. Extend the protected growth report to show the aggregate funnel by campaign and locale with privacy thresholds.
5. Add a dedicated campaign landing page and ensure the selected language survives the landing → registration transition.
6. Fix Arabic landing/UI support and complete cultural/editorial QA before Arabic acquisition.

### Financial safety

1. Add an append-only, audited, tamper-evident spend ledger separate from Stripe customer billing. Store provider transaction/snapshot IDs and record late corrections as adjustment rows instead of overwriting observations.
2. Phase 0 requires an internal immutable campaign-plan key, platform, currency, planned dates, budget model, lifetime ceiling, operational pause threshold, and owner decision-log reference. Add the provider campaign ID only after a separately approved draft is created and before launch.
3. Prefer a USD 150 Google campaign-total budget for 14 days: it has no provider average-daily setting and uses provider-managed pacing, with an internal expected-average alert near USD 10.71/day. If campaign-total budget is unavailable and average-daily budget is considered instead, USD 10 is only a pacing input that may spend up to twice that amount on an individual day; launch remains blocked without a separate enforceable lifetime funding control.
4. Add remaining-budget preflight, a provider-lag reserve, a campaign pause runbook, pause-state verification, a block on new launches/changes, and residual-spend reconciliation before the first dollar. This is a safety circuit, not a guarantee that delayed clicks, taxes, or billing adjustments become zero.
5. Treat payment mode as a separate owner gate. Manual/prepay eligibility varies by country, currency, and account; if only automatic payments are available, an independently enforceable card/account ceiling must be reviewed before launch.
6. Keep `ads-reporting`, `cfo-reporting`, and `revenue-orchestrator` report-only; campaign execution must be a separately reviewed bounded capability.

### Organic baseline

Before paid launch, collect:

- at least 25 verified non-admin organic users;
- at least 30 days of visit → meaningful interaction → completed registration → verified account aggregate baselines;
- at least 200 eligible sessions and 10 completed registrations before treating a language result as directional; scaling requires a repeated result and uncertainty review;
- either at least 25 mature paid customers with 90-day exposure, or a separately reviewed sample-size and uncertainty gate, before treating contribution margin, churn/retention, and operating cost as decision-grade. Smaller cohorts remain `provisional/insufficient` and cannot by themselves open the paid-launch gate; and
- no unresolved payment/webhook or attribution anomaly.

## Conditional Phase 1 budget envelope

This is a decision proposal, not an approved budget.

| Control | Proposed value |
| --- | --- |
| Platform | Google Search only |
| Duration | 14 days; any extension requires a new owner decision and cannot silently increase the total ceiling |
| Preferred Google budget model | USD 150 campaign-total budget for 14 days; no provider daily setting; internal expected-average alert near USD 10.71/day |
| Fallback Google budget model | USD 10 average daily pacing only if accompanied by a separately verified enforceable lifetime funding control; it is not a hard daily cap |
| Lifetime ceiling | USD 150 campaign-total budget if available and verified; otherwise launch remains blocked pending an equivalent enforceable funding control |
| Payment mode | Manual/prepay only if account-eligible; otherwise separately approve an external payment ceiling before launch |
| Campaign cells | One language, one landing page, one intent family |
| 90-day break-even CAC | Decision-grade 90-day contribution margin per acquired customer; provisional until the sample-size/uncertainty gate passes |
| Conservative operating CAC target | Lower of USD 7.50 or 25% of decision-grade 90-day contribution margin per acquired customer; USD 7.50 is 25% of the lowest plan's USD 30 three-month gross revenue and must be reduced after costs |
| CAC definition | Fully loaded acquisition cost—media, tax, platform fees, creative, and incremental operations—divided by new paid customers attributed to the pilot cohort |
| Initial evaluation | Meaningful interaction is an internal reporting KPI only; provider optimization requires a separately approved, consented, allowlisted conversion feed |

Automatic pause conditions:

- remaining campaign-total budget reaches the reserve threshold, the lifetime ceiling is reported reached, or reconciliation indicates an overage risk;
- USD 50 spend with zero verified registrations;
- USD 75 spend with zero paid subscriptions;
- with one or two new paid customers, fully loaded acquisition cost exceeding the owner-approved exploration allowance for that conversion count; the allowance must be set before launch and cannot exceed the USD 150 lifetime ceiling;
- after at least three paid conversions, CAC above the approved operating target; this is a conservative budget-safety stop, not a statistically reliable performance conclusion;
- among at least 20 paid landing sessions in a rolling 24-hour window, more than 10% lack valid allowlisted campaign attribution; any integrity failure may block sooner;
- billing, webhook, privacy, or policy anomaly;
- sensitive targeting, remarketing, customer-list use, or audience expansion becomes enabled; or
- a credible privacy/policy complaint is received.

The USD 75 zero-paid stop is an explicit maximum exploration-loss allowance, not evidence that the conservative operating CAC target has been met. Meaningful interaction and verified-registration CPA may be reported as learning metrics. They must never be presented as paid CAC.

## Decision gates for the owner meeting

The first paid pilot requires one scope-bound owner decision that names:

1. the platform;
2. the maximum lifetime ceiling, selected mutually exclusive provider budget model, operational alert/pause threshold, and the one-to-two-conversion exploration allowance;
3. the funding/payment method and who accepts provider terms;
4. the CAC formula and payback horizon;
5. the permitted country and language cell;
6. contextual-only, no-retargeting, no-sensitive-targeting rules; and
7. the specific landing page and creative package.

Even with that decision, launch stays blocked until Phase 0 measurement, consent/privacy review, spend ledger, kill switch, test suite, and live dry-run verification pass.

## Acceptance criteria

- No ad spend, campaign, payment method, pixel, CAPI, OAuth, or provider terms are created during Phase 0.
- Every planned event has a documented schema and rejects sensitive/free-text payloads.
- Campaign attribution is visible only in aggregate and respects minimum-cell thresholds.
- The CAC formula, 90-day break-even CAC, conservative operating target, one-to-two-conversion exploration allowance, payback horizon, and sample-size/uncertainty gate are defined before launch; actual paid CAC is calculated only after attributed paid traffic and conversions exist.
- An eligible campaign-total budget or equivalent enforceable funding control protects the lifetime ceiling; average daily pacing is never represented as a hard provider cap.
- One emergency action requests a pause, verifies provider pause state, blocks new launch/change operations, and starts residual-spend reconciliation.
- The first paid creative, targeting, landing page, and budget are reviewed together before launch.

## Primary policy and market references

- [Google religious-belief targeting policy](https://support.google.com/adspolicy/answer/16701958?hl=en)
- [Google location and language settings](https://support.google.com/google-ads/answer/1722072?hl=en)
- [Google EEA consent requirements](https://support.google.com/google-ads/answer/13695607?hl=en-GB)
- [Google average daily spending-limit behavior](https://support.google.com/google-ads/answer/6385083?hl=en)
- [Google campaign-total budgets](https://support.google.com/google-ads/answer/10486938?hl=en)
- [Google payment-setting availability](https://support.google.com/google-ads/answer/2375432)
- [Meta protected ad-data explanation](https://www.facebook.com/help/562973647153813/)
- [Pinterest advertising and sensitive-targeting guidelines](https://policy.pinterest.com/en/advertising-guidelines)
- [LinkedIn advertising policy](https://www.linkedin.com/legal/ads-policy)
- [TikTok policy covering religious conversion attempts](https://ads.tiktok.com/help/article/discrimination-harassment-bullying?lang=en)
- [TikTok policy stating religious or other sensitive-content ads are not permitted](https://ads.tiktok.com/help/article/protecting-minors-on-tiktok-advertising-initiatives?lang=en)
- [X sensitive-category targeting policy](https://business.x.com/en/help/ads-policies/campaign-considerations/targeting-of-sensitive-categories)
- [Reddit targeting policy; current rendering must be manually reverified before use](https://business.reddithelp.com/s/article/Reddit-Advertising-Policy-Targeting-Guidelines)
- [FTC sponsorship disclosure guidance](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)
- [World Bank population data](https://data.worldbank.org/indicator/SP.POP.TOTL)
- [World Bank internet-use data](https://data.worldbank.org/indicator/IT.NET.USER.ZS)
- [Google multilingual site guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
