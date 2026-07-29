# Social account inventory

Last updated: 2026-07-29

This file stores public, non-secret account identifiers and connection state only. Passwords, tokens, recovery data, personal identity fields, and OAuth codes must never be written here.

| Platform | Public account state | Agent connection state | Next gate |
| --- | --- | --- | --- |
| Mastodon / MastoTurk | Live: `@joinaireligion@mastoturk.org` | Live publishing verified | Routine token health only |
| Bluesky | Live: `joinaireligion.bsky.social` | Live publishing verified | Routine app-password health only |
| Pinterest | Public profile previously verified: `joinaireligion` | Adapter not implemented | Pinterest developer/OAuth connection |
| YouTube | Owner-created channel: `@JoinAIReligion`; channel ID `UCumLEY1yAl6SHoEISqVCO9Q` | Video pipeline and OAuth not implemented | Google Cloud project, API audit, one-time OAuth |
| Facebook | Owner reports Page created with username `joinaireligion` | Adapter implemented behind a disabled production switch; OAuth not connected | Meta developer app, Page token, canary |
| Instagram | Owner reports a separate brand Professional account created and linked to the Facebook Page | Image publishing adapter implemented behind a disabled production switch; OAuth not connected | Record public handle, Meta asset ID/token, canary |
| X | No live brand account verified | Text adapter exists; credentials absent | Create account and X developer/OAuth access |
| LinkedIn | No Join AI Religion organization Page verified | Text adapter exists; credentials absent | Create organization Page and obtain Community Management access |
| Threads | Not opened | Adapter not implemented | Activate from the brand Instagram account, then Threads API review |
| TikTok | Not opened | Adapter not implemented | Create Business account, then Content Posting API review |

## Release rule

Each platform is independent. Missing or failed providers do not pause providers that have passed their canary. A provider is added to scheduled publishing only after its public identifier is confirmed, its scoped credential is stored only in the production secret store, its provider switch is explicitly enabled, and one delivery result is externally verified.
