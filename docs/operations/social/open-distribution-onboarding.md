# Open distribution onboarding

Last updated: 2026-08-11

This runbook covers Flipboard Publisher, DEV Community/Forem, Apple News, Blogger, Tumblr, Hashnode Pro, Ghost, LINE Official Account, Lemmy, MediaWiki, Fandom, and Nostr (the earlier `nsotr` label is treated as Nostr).

## Verified implementation state

All production switches remain `false`; a local test or accepted API request must never be reported as a public publication without an externally checked result. On 2026-08-11, separate public UI canaries were externally verified on Blogger and Tumblr. They prove those two public surfaces, not API delivery or scheduled automation. No paid plan, unattended terms acceptance, external signer key, or provider approval was created.

| Channel | Implemented now | Automation class after setup | Remaining human gate | First canary |
| --- | --- | --- | --- | --- |
| Flipboard Publisher | RSS now supplies publisher byline, long description, canonical link, image `media:content`, and image `enclosure` | RSS ingestion only if Publisher intake reopens and the profile is approved | New Publisher applications are currently closed; recheck the official signup page later | After reopening and approval, confirm one article appears with correct byline, image, language, and source link |
| DEV / Forem | API v1 article adapter, Markdown, canonical URL, main image, tags, disclosure | Setup then unattended for the technical AI/engineering subset | The prepared brand account is hidden by DEV's spam/moderation gate; support restoration is required before an API key can be created | After restoration, one English responsible-AI article; verify canonical URL |
| Apple News | Apple News Format 1.7 builder, multipart body, HHMAC signing, canonical metadata | Setup then unattended within approved channel language | Apple News Publisher channel approval and API key generation | One preview/channel article; verify layout, source, byline, image, language |
| Blogger | Blogger v3 insert adapter, safe HTML, labels, canonical source link, refresh-token renewal; public blog and one source-linked/disclosed UI canary are verified | Setup then unattended after API canary | Google Cloud terms, project/API/OAuth consent, `blogger` scope with offline access, direct secret-store handoff | One API-created draft first; compare it with the verified public UI canary before enabling publication |
| Tumblr | OAuth1 owner-context NPF adapter with title, disclosure, body, tags, source-link block; one separate public UI canary is verified and the earlier connection-test draft remains private | Setup then unattended after API canary | Move the already owner-authorized credentials directly from local custody to the production secret store | One new API-created reviewed draft; do not reuse or publish the private connection-test draft |
| Hashnode Pro | Current GraphQL `publishPost` adapter, canonical source, cover, tags, disclosure | Paid setup then unattended | GraphQL reads/writes require Pro; paid activation is deferred under the free-only rule | None while the free-only rule remains active |
| Ghost | Admin API adapter, five-minute JWT, canonical URL, feature image, tags, including self-hosted subdirectory support | Setup then unattended | Ghost(Pro) is paid; self-hosted Ghost requires an existing approved HTTPS host and integration key, so no new infrastructure is assumed | One test post on a non-indexed/staging publication before any public mirror |
| LINE Official | Retry-safe broadcast adapter only | Setup then unattended to opted-in friends | Create Official Account and Messaging API channel, choose message plan, issue token | One owner-only test audience where available, then a small opt-in broadcast |
| Lemmy | API v4 post adapter locked to one configured approved community | Approved-scope only | Account application/CAPTCHA plus explicit owned/community-moderator approval | One context-specific post; no generic cross-community spraying |
| MediaWiki | CSRF + revision-guarded Action API adapter, bot assertion, title prefix | Owned/approved wiki only | Own/approved wiki, separate bot, bot rights/OAuth, namespace approval | Create one prefixed page; never use Wikipedia/Wikimedia for promotion |
| Fandom | Fandom-domain-restricted MediaWiki adapter and approval gate | Approved Fandom community only; not a general growth channel | Fandom policy rejects promotional/link-farm use, so do not create a marketing wiki; only a genuine independently useful community with local approval could qualify | None for promotion |
| Nostr | NIP-23 kind `30023`, canonical/source tags, external signer interface, minimum two relay acknowledgements | Unattended only through external/NIP-46 signer | Choose key custody/recovery, signer, public key, at least two relays | Publish one signed long-form event; verify retrieval from both relays |

## Required activation order

1. Keep `DISTRIBUTION_PUBLISHING_ENABLED=false` while creating provider accounts and credentials.
2. Run `npm run distribution:check -- --provider <provider>`; the report prints only missing variable names, never values.
3. Store credentials directly in the production secret store. Do not paste them into chat, documentation, commits, or shell history.
4. Turn on only the selected provider switch. Leave the global switch off while validating a draft/private/sandbox path where the provider supports it.
5. Run one reviewed canary, externally check the public result, canonical URL, locale, disclosure, image, and provider delivery ID.
6. Enable the global switch only after the selected provider has passed its canary. A failure disables only that provider.

## Content and interaction boundaries

- Only already-published public Join AI Religion content may be distributed. Private notes, account records, user profiles, or inferred beliefs are never eligible.
- DEV and Hashnode receive only genuinely relevant technical/responsible-AI material, not every reflection.
- LINE is broadcast to opted-in account friends only. Narrowcast demographic or sensitive-interest targeting is prohibited.
- Lemmy, MediaWiki, and Fandom require an owned or explicitly approved community. No promotional automation into unrelated communities is allowed.
- Nostr private keys never enter application environment variables; signing is delegated to a protected external signer.
- Replies, comments, DMs, likes, follows, votes, reposts, account creation, paid upgrades, and ad spend are outside this publisher.

## Official references

- Flipboard: [Publisher FAQ](https://about.flipboard.com/forpublishers/publisher-faq/) and [RSS guidelines](https://about.flipboard.com/rss-guidelines/)
- DEV/Forem: [API v1](https://developers.forem.com/api/)
- Apple News: [Create an Article](https://developer.apple.com/documentation/applenewsapi/post-channels-_channelid_-articles), [publishing tutorial](https://developer.apple.com/documentation/applenews/publishing-an-article), and [security model](https://developer.apple.com/documentation/applenews/about-the-apple-news-security-model)
- Blogger: [`posts.insert`](https://developers.google.com/blogger/docs/3.0/reference/posts/insert)
- Tumblr: [API v2](https://www.tumblr.com/docs/en/api/v2) and [official API docs repository](https://github.com/tumblr/docs)
- Hashnode: [GraphQL API paid access](https://hashnode.com/changelog/2026-05-13-graphql-api-paid-access) and [official publish tutorial](https://hashnode.com/blog/publishing-a-blog-post-to-hashnode-using-a-custom-editing-interface)
- Ghost: [Admin API](https://docs.ghost.org/admin-api) and [posts](https://docs.ghost.org/admin-api/posts/overview)
- LINE: [send messages](https://developers.line.biz/en/docs/messaging-api/sending-messages/), [broadcast API](https://developers.line.biz/en/reference/messaging-api/nojs/), and [retry keys](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/)
- Lemmy: [API guide](https://join-lemmy.org/docs/contributors/04-api.html) and [API v4 post](https://join-lemmy.org/api/main)
- MediaWiki: [Edit API](https://www.mediawiki.org/wiki/API:Edit), [bot passwords](https://www.mediawiki.org/wiki/Manual:Bot_passwords), and [bot creation](https://www.mediawiki.org/wiki/Manual:Creating_a_bot/en)
- Fandom: [user rights](https://community.fandom.com/wiki/Help:User_rights) and [policies](https://community.fandom.com/wiki/Fandom_Policies)
- Nostr: [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md), and [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md)
