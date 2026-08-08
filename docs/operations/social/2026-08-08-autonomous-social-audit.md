# Autonomous social audit and operating strategy

Date: 2026-08-08  
Scope: public account state, publishing reliability, language, visuals, safety, scheduling, and autonomous operation

## Verified public state

| Channel | Public state | Latest verified activity | Primary gap |
| --- | --- | --- | --- |
| Instagram `@joinaireligion` | 2 posts, 2 followers; 8 and 9 views; 0 interactions, saves, shares, profile visits, or link taps; bio restored | 2026-07-29 | Media delivery remained the only failed provider in the first recovery run |
| Threads `@joinaireligion` | 4 posts, 0 followers; bio, site link, and brand avatar restored | 2026-08-08 14:25 UTC | Delivery restored; grow a conversation baseline |
| Facebook `joinaireligion` | 1 follower; provider API recorded a successful new link post | 2026-08-08 14:25 UTC | Public logged-out page cache did not expose the new post during immediate verification |
| Mastodon `@joinaireligion@mastoturk.org` | 4 posts, 6 followers | 2026-08-08 14:25 UTC | Delivery restored; strongest early audience base |
| Bluesky `joinaireligion.bsky.social` | 6 posts, 1 follower | 2026-08-08 14:25 UTC | Delivery restored; link-led format dominates |
| Pinterest `joinaireligion` | 0 public Pins | No public Pin | Standard API access/production activation not verified |
| YouTube `@JoinAIReligion` | 0 public videos | No public upload | External upload/OAuth adapter absent |

## Root cause and repair contract

One non-Mastodon failure was persisted as `FAILED` but deliberately skipped on every later run. Because the publisher always chose the oldest `READY` package, that single artifact blocked every newer package. The composer simultaneously generated a new package every day for the same latest article, producing ten queued packages by the live audit.

The repaired contract is:

- provider failures retry after 1 hour and 6 hours, then become an auditable terminal skip after the third failed attempt;
- one provider cannot block successful providers or later packages indefinitely;
- only the newest fresh package is eligible; older fresh packages are marked superseded and packages older than 72 hours are marked stale, so the backlog is never burst-published;
- a provider does not receive the same source content twice across separate artifacts;
- one published content item receives at most one social package;
- the latest genuinely published content is selected by `publishedAt`;
- autonomy health reports package count, oldest age, last-run progress, and configured provider names without exposing credentials.

## Live recovery result

PR #28 deployed commit `67328e6`. The first post-deploy publisher run reduced the READY backlog from ten packages to one without burst publishing: nine stale/superseded packages were archived, and Mastodon, Facebook, Threads, and Bluesky recorded successful deliveries for the newest 2026-08-08 article. Instagram alone remained FAILED.

The Instagram recovery adds a server-side JPEG cache and a complete image preflight before the Meta container request. This removes the roughly 16-second cold-render delay from Meta's own media download. A same-origin, admin-session-only retry route runs the normal publisher with a failed-provider retry override; already-published providers remain skipped by their persisted delivery records and idempotency contract.

## Channel roles and format cadence

The content agent publishes at most one independently reviewed article per UTC day. Social distribution follows the article rather than manufacturing filler.

| Channel | Role | Default cadence | Format priority |
| --- | --- | --- | --- |
| Instagram | Brand discovery and visual reflection | 3-5 feed posts per week after queue recovery | 4:5 cover first; test two-slide summary carousel and short Reel only after baseline delivery is stable |
| Threads | Conversation starter | Up to 5 posts per week | One question or tension, concise context, then source link |
| Facebook | Longer explanatory distribution | 2-4 posts per week | Native link preview plus short reader-value framing |
| Mastodon | Turkish-first reflective community | 3-5 posts per week | Turkish copy, accurate language metadata, two relevant hashtags |
| Bluesky | English-first discovery | 3-5 posts per week | Short hook, clickable source facet, occasional secondary locale |
| Pinterest | Evergreen search/discovery | 3-5 Pins per week after Standard access | 2:3 title-led Pin, descriptive alt text, locale-specific boards once volume exists |
| YouTube | Durable audio-visual library | Weekly after OAuth canary | Full episode, captions, thumbnail, metadata, and Shorts package |

## Language strategy

Do not split Instagram into separate language accounts at the current two-follower/two-post scale. Fragmentation would make every account look abandoned and remove the ability to learn from a shared baseline.

Use one account with deterministic policy v4: English 70%, Turkish 18%, and 2% for each of Spanish, German, French, Arabic, Russian, and Chinese. Revisit separate accounts only after 90 days with all of these conditions:

1. at least three quality posts per week on the main account;
2. at least 30 posts and enough non-owner reach for a stable comparison;
3. one secondary language contributes at least 25% of aggregate reach or saves for four consecutive weeks;
4. that language can sustain at least two native-quality posts per week without machine-like repetition.

Only aggregate channel metrics may influence the mix. Private reflections, belief profile, direct messages, hidden users, and sensitive-behavior targeting are excluded.

## Visual effectiveness

The 4:5 social-card route is technically correct and visually coherent, but the first published cards left too much empty space and did not offer a clear interaction beyond reading. Their combined baseline is 17 views and zero interactions, so appearance alone has not yet produced evidence of engagement. The updated code-native composition keeps the brand system while adding a deterministic category orbit, focal symbol, and luminous nodes so the upper half carries visual information without inventing factual imagery or requiring licensed assets.

Measure formats against a 30-post baseline using reach, profile visits, saves, shares, outbound visits, and completion for video. Do not optimize for likes alone. A format becomes default only when it improves saves or outbound visits by at least 20% over the previous 10-post median without increasing safety or correction incidents.

## Human-free operating loop

1. Content producer drafts only from aggregate signals and public trend summaries.
2. Independent content publisher rechecks safety, completeness, duplication, and the one-item-per-day cap.
3. Social composer creates one multilingual package per published content item.
4. Social publisher selects locale per provider, validates the source URL and risk gate, publishes, and persists external evidence.
5. Failed providers retry within the bounded budget; stale and duplicate packages close automatically.
6. Autonomy health detects stalled progress even when the systemd job itself exits successfully.
7. Aggregate performance updates future format/language weights only after the sample thresholds above.

Owner intervention remains necessary only for provider-controlled identity, Standard/API-plan approval, CAPTCHA/2FA, OAuth consent, account recovery, or a new public-brand decision. Routine drafting, scheduling, delivery retries, and aggregate evaluation do not require per-post approval.
