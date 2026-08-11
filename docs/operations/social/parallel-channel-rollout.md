# Parallel channel rollout: mainstream slots 4+ and open distribution

Audit date: 2026-08-10 (America/Chicago)
Scope: the `mainstream-onboarding.md` sequence from slot 4 onward, the existing Medium/Quora/Reddit launch packages, and feed/search/podcast distribution that can progress without creating another platform account.

This is a decision and implementation map, not authorization to create accounts, accept terms, spend money, grant OAuth, publish, comment, message, follow, or submit an external directory listing. Those actions remain separately auditable provider gates. Routine automation must never use browser scripting where a supported API is required.

## Decision

Run four independent lanes in parallel:

1. **Keep Threads in operations, not onboarding.** It is already live and API delivery has public evidence.
2. **Advance Pinterest as the next true setup-once publishing channel.** The adapter exists; Standard Access, production OAuth, a board, and one public canary remain the separate review lane.
3. **Expand account-free discovery now.** Sitemap/robots discovery, IndexNow, public feeds, reader discovery, and podcast-RSS readiness already work without a publisher account.
4. **Do not treat Medium, Quora, Reddit, or TikTok as unattended syndication endpoints.** Their current policies require, respectively, human publication/editorial judgment, question-specific answers, community-specific participation, or explicit per-upload consent.

The strongest low-interaction sequence is therefore: open search/feed health -> Pinterest Standard review -> account-free podcast directories -> optional X spend gate -> carefully human-led Medium -> Quora/Reddit only after a reputation baseline -> TikTok only as a consent-driven media workflow.

## Evidence snapshot

- **Threads is already live.** The account inventory records `@joinaireligion`, live text publishing, and the public canary at `https://www.threads.com/@joinaireligion/post/DbZapNrgKm6`. The 2026-08-08 production audit records four public posts and a successful restored provider delivery. This is maintenance evidence, not an onboarding plan.
- **Pinterest is a separate review lane.** The account inventory records Trial Access approved on 2026-07-29, zero public Pins, an implemented image-Pin adapter, and a disabled production switch. The Pinterest production runbook keeps Trial entities creator-only and requires Standard Access plus a logged-out public canary before activation. Pinterest's current official access-tier documentation says Trial-created Pins and Boards are visible only to their creator and that even a sole-user app must provide an OAuth demonstration recording for Standard Access.
- **The open distribution surface is live.** At audit time, `/feed.xml`, `/atom.xml`, `/feed.json`, `/podcast.xml`, `/sitemap.xml`, and `/robots.txt` returned HTTP 200 with the expected content types. The homepage exposed RSS, podcast RSS, video RSS, Atom, and JSON Feed autodiscovery links. The public IndexNow ownership-key route returned HTTP 200.
- **The podcast feed is technically substantive, not an empty placeholder.** It was well-formed XML with three episodes, a reachable 3000 x 3000 JPEG cover, reachable MP3 enclosures, `itunes` metadata, per-episode `podcast:transcript` links, and explicit AI-voice disclosure. Directory-specific validation and content review still remain distinct gates.

Repository evidence: [account inventory](./account-inventory.md), [2026-08-08 autonomous audit](./2026-08-08-autonomous-social-audit.md), [Pinterest production activation](./pinterest-production.md), [mainstream onboarding](./mainstream-onboarding.md), and `src/lib/social/providers.ts`.

## A. Mainstream and community channels, slot 4 onward

Automation classes (the plain-language class is repeated in the tables):

- **A3 — unattended:** no routine human intervention.
- **A3 after setup — setup-then-unattended:** one-time provider setup and a verified canary, then no routine human intervention.
- **A2 — recurring consent:** technical automation is possible, but a recurring provider or policy gate prevents unattended publication.
- **A1 — manual publication:** drafting/opportunity discovery can be automated; publication must remain contextual and human-led.
- **A0:** no supported autonomous publication path should be used.

| Slot / proposed order | Channel | Current state | Automation class | Policy, removal, or account risk | Account-free work now / technical remainder | Human gate | Rollout decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **4 / complete** | Threads | Live `@joinaireligion`; adapter, token flow, status polling, permalink capture, and public canary are verified | **A3 — unattended** | Low while posts remain original, bounded, and non-interactive; authorization expiry is the main operational risk | Token-expiry alerting, delivery-health monitoring, profile completion, and aggregate cadence review | Only reauthorization, recovery, or provider verification if the token fails | Remove from onboarding. Keep in the normal bounded publisher and measure results |
| **5 / after Pinterest or when spend is approved** | X | Text adapter and provider gate exist; public handle and credentials are not independently verified; paid API was deferred | **A3 after setup — setup-then-unattended** | Medium. X requires the official API, an Automated label and operator disclosure for automated accounts, no identical cross-posting, and no unsolicited mentions. Current pay-per-use pricing makes URL-bearing creation materially more expensive than text-only creation | Without an account: add cost ceiling/credit alert, enforce automated-account disclosure, and preserve no-reply/no-DM/no-follow scope. After setup: verify identity and run a text canary | Accept current developer terms and prepaid spend, configure recovery/2FA, approve OAuth and one canary | Keep code-ready but financially deferred; do not use browser automation as a substitute |
| **6 / next setup-once target** | Pinterest | Business profile exists; Trial Access was approved; zero public Pins; image-Pin adapter, locale copy, media, idempotency, activation watermark, and token rotation are implemented | **A3 after setup — setup-then-unattended** | Medium provider-review risk, low spam risk if every Pin is fresh, useful, properly described, and points to its real source. Trial entities are not public | Without another account action: prepare the demo script, review packet, 1000 x 1500 media, alt text, destination validation, and canary checklist. Provider approval/OAuth remains gated | Standard Access submission/review, OAuth/2FA, public board selection, and one public canary | Continue as a dedicated review lane; never count a Trial Pin as public distribution |
| **7 / later media lane** | TikTok | No verified brand account or public post. The tracked social-provider registry has no production TikTok provider; the site video pipeline is separate | **A2 — recurring consent; never unattended** | High if treated as syndication. Unaudited clients are private-only; TikTok requires creator-info display and explicit consent for each upload. Added logos, watermarks, links, or promotional overlays are prohibited and can cause deletion or account action | Without an account: build the consent UI, creator-info client, media-rights/originality check, `SELF_ONLY` test path, polling, idempotency/ambiguity reconciliation, and AIGC/commercial disclosure handling | Account/app/OAuth/review once **plus recurring explicit consent for every upload** | Do not promise unattended posting. Revisit after public video quality is proven on the site and YouTube |
| **8 / selective pilot** | Medium | Canonical article and complete import package exist; no verified Medium publication | **A1 — manual publication** | High if automated or traffic-first. Medium currently prohibits automatic/systematic account registration, posting, and interaction; duplicate Medium copies and clipped link teasers are spam. AI-assisted text must be disclosed, while AI-generated/PR-style content receives restricted distribution | Without an account: turn the package into a genuinely human-edited standalone essay, keep canonical source, add early AI-assistance and image disclosures, and prepare the preview checklist | Account/profile setup once, then **human import, edit, tags, preview, and publish for every story** | One high-quality monthly pilot, not weekly unattended syndication. Stop if distribution is Network Only or moderation signals appear |
| **9 / reputation-only** | Quora | Profile and first-answer package exist; no external account mutation | **A1 — manual publication** | High for repeated templates or traffic-driving links. Answers must directly answer the exact question, stand alone without leaving Quora, disclose affiliation, and avoid excessive promotion | Without an account: prepare an opportunity shortlist, exact-question drafts, citations, affiliation blocks, and duplication checks; keep links off by default | Account/recovery once, then **human selection and submission of every answer** | Start only after a named expert/operator is willing to own the answers. Never auto-answer or create language-specific account farms |
| **10 / reputation-only** | Reddit | Thirty-day reputation-first plan exists; no account/community mutation | **A1 — manual publication** | Very high for link syndication. Reddit forbids repeated or unsolicited mass engagement; community moderators set stricter rules; bots or generative tools that proliferate spam are explicitly risky | Without an account: snapshot community rules, prepare native link-free drafts and disclosures, and define the removal/mod-feedback log | Transparent account once, then **human review of each community contribution and any moderator exchange** | Do not build a general Reddit poster. Devvit is relevant only to a subreddit the operator moderates and adds little external discovery until a real community exists |

### Channel-specific non-negotiables

- **X:** automate only through the official API. Label the account automated, identify its human operator, and never duplicate substantially identical posts across accounts.
- **Pinterest:** Trial evidence is demonstration evidence only. `PINTEREST_PUBLISHING_ENABLED` remains false until Standard Access and a logged-out public canary pass.
- **TikTok:** a saved OAuth grant is not consent for future uploads. The creator must see current privacy and interaction options and explicitly consent to each item.
- **Medium:** the importer is a human authoring tool, not an automation endpoint. Cross-posting owned work is allowed when canonicalized; automatic/systematic posting is not.
- **Quora:** a relevant project link may follow a complete answer, never replace it. Affiliation must remain visible.
- **Reddit:** no syndication cadence. Community fit and moderator rules outrank the global plan.

## B. Account-free feed, search, and podcast distribution

“Account-free” means no publisher account is required for the technical discovery path. A one-time external submission is still a public mutation and must be logged with its result; it must not be described as live until the destination returns a public listing.

| Proposed order | Destination | Current state | Automation level | Policy/indexing risk | Technical work remaining | Human gate | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | Google crawl via `robots.txt` + XML/video sitemaps | Live, public, and HTTP 200; both sitemaps are declared in `robots.txt` | **A3 / passive** | Low. Sitemap discovery is a hint, not an indexing guarantee | Monitor status, canonical/hreflang integrity, HTTP errors, and sitemap freshness; Search Console can later add diagnostics but is not required for discovery | None for passive discovery; account verification only if Search Console diagnostics are wanted | Keep always on; this is the highest-confidence zero-account baseline |
| **2** | Google Discover eligibility | Public indexed pages are automatically eligible; no special tag or submission exists | **A3 / passive** | Medium editorial visibility uncertainty; eligibility never guarantees appearance | Maintain useful, non-clickbait pages and large high-quality images; measure only if Search Console is later connected | None for eligibility | Treat as an outcome of strong content/search hygiene, not a channel that can be “activated” |
| **3** | IndexNow participants, including Bing and other participating engines | Implementation, public ownership key, and publish-time notification path exist; live key route returned HTTP 200 | **A3 / active notification** | Low. A 200/202 proves receipt, not crawl or indexing | Persist sanitized last status/time/count; retry bounded transient failures; send only changed same-host URLs | None | Keep in the autonomous content release; one endpoint shares accepted URLs with participating engines |
| **4** | Feedly | RSS/Atom/JSON feeds are public and homepage autodiscovery is live | **A3 / reader-driven** | Low; reach is subscriber-driven, not guaranteed by publishing the feed | Keep stable feed URLs and valid metadata; optionally expose language-specific feeds if subscriber evidence justifies them | None. A reader may add the public feed URL | Ready now; do not claim a Feedly listing until independently observed |
| **5** | Inoreader and generic RSS/Atom readers | Public feed URLs and autodiscovery are live | **A3 / reader-driven** | Low | Add `ETag`/`Last-Modified` verification and consider WebSub only if a reliable hub is selected; keep full URLs and per-item language metadata | None | Ready now; reader subscriptions trigger aggregation |
| **6** | Pocket Casts public directory | Podcast RSS is live, well-formed, has three episodes, reachable MP3s, square cover, and disclosures; no listing was found in the audit | **A3 after one form submission** | Low-to-medium directory review risk; a successful form response and public share URL are required evidence | Run directory validator; confirm stable brand-controlled owner email, rights, category, explicit flag, artwork, and AI-voice disclosure; save the returned share URL | No account is documented; one public RSS submission and result verification | Best first podcast directory submission after feed QA |
| **7** | Podcast Addict public directory | Same ready feed; no verified listing | **A3 after one form submission** | Low-to-medium; review can take up to 24 hours | Same feed QA; save public listing and first refresh evidence | No account is documented; one RSS submission | Second account-free directory target |
| **8 / conditional** | Listen Notes | No verified listing | **A3 ingestion, but content-review risk is high** | High for this feed. Listen Notes says submissions are human-reviewed and gives robot/machine-generated audio as a rejection example; this show explicitly uses an AI voice | Do not submit until the directory confirms that the disclosed, human-reviewed educational format is acceptable, or the show changes to a human-hosted format | Policy clarification or editorial format decision | Hold. Do not repeatedly resubmit after rejection |
| **Later** | Apple Podcasts | Feed appears close to baseline technical requirements but has not passed Apple validation/review | Recurring RSS updates are **A3 after setup** | Medium review risk; catalog publication is distinct from a listener manually following an RSS URL | Apple Podcasts Connect validation; content-rights/contact review; transcript choice; availability; save catalog ID | Apple Account, Podcasts Connect, rights confirmation, review, publish | High reach, but not account-free; queue after the first low-friction directory canary |
| **Later** | Spotify for Creators | No verified listing/claim | Recurring RSS updates are **A3 after setup** | Medium ownership/review risk | Claim external show by RSS; ensure the RSS owner email is reachable; verify code; save show ID | Spotify account and email ownership code | High reach, but a one-time account/ownership gate remains |
| **Later** | Amazon Music for Podcasters | No verified listing | Recurring RSS updates are **A3 after setup** | Medium ownership/review risk | Submit RSS, confirm ownership, save catalog ID and refresh evidence | Ownership confirmation/account workflow | Queue with Apple/Spotify, not in the account-free lane |

## Implementation plan

### Lane 1 — no user action, start/continue now

1. Keep Threads in delivery-health monitoring and remove all “setup” work except reauthorization/profile-completion exceptions.
2. Add a daily passive health check for the three content feeds, podcast RSS, both sitemaps, robots, the IndexNow ownership file, one current enclosure, and the 3000 x 3000 cover. Record status/latency/content type without secrets.
3. Persist IndexNow receipt evidence (`status`, URL count, timestamp) and distinguish receipt from actual indexing.
4. Prepare, but do not externally submit, Pocket Casts and Podcast Addict packets containing the exact RSS URL, title, category, disclosure, artwork, website, owner contact, and rollback/removal contact path.
5. Keep Medium, Quora, and Reddit agents in **draft/opportunity-only** mode. They may prepare candidates but may not publish or interact.

### Lane 2 — one-time owner/provider gates

1. Complete the Pinterest OAuth demonstration and Standard Access review. After approval, run one isolated public Pin and verify it logged out before enabling the provider.
2. Submit to Pocket Casts, then Podcast Addict, one destination at a time. Record the returned public listing and verify that a later RSS episode refreshes automatically.
3. Decide whether X's current URL-post cost and prepaid-credit model justify the channel. If yes, use a strict monthly ceiling, no auto-recharge by default, and one text canary before a URL-bearing canary.
4. Connect Apple, Spotify, and Amazon only after the feed passes the low-friction directory canary and the owner contact is confirmed.

### Lane 3 — recurring human judgment, deliberately later

1. Run one Medium story as a human-edited, canonicalized monthly pilot with visible AI-assistance disclosure. Compare read completion and meaningful referral visits, not raw impressions.
2. Run Quora only through exact-question answers owned by a named expert/operator. Start link-free; add a source link only when it materially improves the answer.
3. Run Reddit's first five contributions manually and link-free. Continue only if they remain visible for seven days with no moderator warning.
4. Do not open TikTok automation until the team accepts per-upload consent as a permanent requirement and has original, watermark-free media designed for TikTok rather than recycled promotional cards.

## Stop conditions

- Disable only the affected provider after authorization failure, unexpected volume, a missing external ID, language drift, or a provider-policy warning.
- Pause Medium after an automation/spam warning or systematic Network Only distribution caused by AI-generated/PR-style content.
- Pause Quora or Reddit after the first spam/moderator warning; do not evade enforcement with another account.
- Keep TikTok public posting disabled until app audit; never silently reuse an earlier upload's consent.
- Keep Pinterest public posting disabled until Standard Access and a public logged-out canary.
- Do not report search receipt, a private Trial Pin, a draft, or a submitted directory form as verified public distribution.

## Official sources checked for this audit

- Meta: [Threads API official collection](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api)
- X: [pricing](https://docs.x.com/x-api/getting-started/pricing), [developer and automation guidelines](https://docs.x.com/developer-guidelines), [create a Post integration](https://docs.x.com/x-api/posts/manage-tweets/integrate)
- Pinterest: [access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/), [authentication](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/), [Create Pin](https://developers.pinterest.com/docs/api/v5/pins-create/)
- TikTok: [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started/), [Direct Post and content-sharing guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines/)
- Medium: [rules](https://help.medium.com/hc/en-us/articles/213477928-Medium-Rules), [import and canonical behavior](https://help.medium.com/hc/en-us/articles/214550207-Importing-a-post-to-Medium), [AI-content policy](https://help.medium.com/hc/en-us/articles/22576852947223-Artificial-Intelligence-AI-content-policy), [distribution guidelines](https://help.medium.com/hc/en-us/articles/360006362473-Medium-s-Distribution-Guidelines-How-curators-review-stories-for-Boost-General-and-Network-Distribution)
- Quora: [question and answer policies](https://help.quora.com/hc/en-us/articles/9456583756180-Question-and-Answer-Policies), [platform/spam policies](https://help.quora.com/hc/en-us/articles/360000470706-Platform-Policies), [affiliation disclosure](https://help.quora.com/hc/en-us/articles/360055133711-What-is-Quora-s-policy-on-disclosing-affiliations-in-answers)
- Reddit: [spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam), [Devvit rules](https://developers.reddit.com/docs/devvit_rules), [app publication/review](https://developers.reddit.com/docs/get-started/publish)
- Google Search: [build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Discover eligibility](https://developers.google.com/search/docs/appearance/google-discover)
- IndexNow: [protocol documentation](https://www.indexnow.org/documentation), [FAQ and participating endpoints](https://www.indexnow.org/faq)
- Feed readers: [Feedly public-feed discovery](https://docs.feedly.com/article/288-how-to-follow-a-feed-in-your-feedly-account), [Inoreader feed fetcher and WebSub support](https://www.inoreader.com/feed-fetcher)
- Podcast directories: [Pocket Casts submission](https://support.pocketcasts.com/knowledge-base/submitting-podcasts/), [Podcast Addict submission](https://podcastaddict.com/submit), [Listen Notes submission and review notes](https://www.listennotes.com/api/faq/), [Apple RSS requirements](https://podcasters.apple.com/support/823-podcast-requirements), [Spotify claim flow](https://support.spotify.com/creators/article/claiming-your-podcast-on-spotify-for-creators/), [Amazon RSS submission](https://podcasters.amazon.com/submit-rss)
