# Pinterest production activation and token rotation

This runbook is the production contract for the owner-operated `joinaireligion` Pinterest account. It contains no secret values. Trial entities are creator-only; public scheduled publishing remains disabled until Pinterest grants Standard Access and a public canary succeeds.

## Configuration contract

| Variable | Secret | Required for publishing | Purpose |
| --- | --- | --- | --- |
| `PINTEREST_APP_ID` | No | Token rotation | Pinterest application identifier |
| `PINTEREST_APP_SECRET` | Yes | Token rotation | OAuth client authentication; never pass on a command line |
| `PINTEREST_ACCESS_TOKEN` | Yes | Yes | Current `pina...` bearer token |
| `PINTEREST_REFRESH_TOKEN` | Yes | Rotation | Current continuous `pinr...` refresh token |
| `PINTEREST_BOARD_ID` | No | Yes | English-first target board ID |
| `PINTEREST_PUBLISHING_ENABLED` | No | Yes | Exact string `true`; keep `false` through Trial and canary preparation |
| `PINTEREST_ACTIVATED_AT` | No | Yes | Exact UTC ISO-8601 timestamp with milliseconds and `Z` |

The application is fail-closed. Pinterest is not a configured provider unless the access token, board ID, enabled switch, and valid activation timestamp are all present. The adapter also rejects direct publication without the activation timestamp.

## Activation watermark

Set `PINTEREST_ACTIVATED_AT` to the current UTC instant immediately before the permanent provider switch. Use an exact value equivalent to JavaScript `new Date().toISOString()`, such as:

```dotenv
PINTEREST_PUBLISHING_ENABLED="true"
PINTEREST_ACTIVATED_AT="2026-07-29T12:00:00.000Z"
```

Do not reuse the example timestamp. Packages created before the configured instant receive an auditable `SKIPPED` delivery with reason `before_provider_activation` and the activation timestamp. They are treated as complete without creating a Pin. Packages at or after the watermark remain eligible for the normal safety, locale, and publication gates.

Activation order:

1. Keep permanent publishing `false` while obtaining OAuth credentials and the board ID.
2. With Trial Access, create only the creator-visible demonstration Pin required for Standard review.
3. After Standard Access, run one isolated English public canary only through a dedicated owner-triggered path while the scheduled switch remains off. The current scheduled adapter is not that path because it requires `PINTEREST_PUBLISHING_ENABLED=true`; do not toggle it merely to force a canary or it may race the scheduler.
4. Verify the Pin ID, public URL in a logged-out session, English copy, 1000×1500 image, alt text, source link, and target board.
5. Reconcile any network/5xx or missing-Pin-ID outcome as terminal ambiguity before another attempt. Then audit READY social-package depth, set a new current `PINTEREST_ACTIVATED_AT`, set the provider switch to `true`, and recreate the app container.
6. Confirm earlier READY packages are recorded as activation skips and that only post-watermark packages create Pins.

## Continuous token rotation

Pinterest access tokens expire in about 30 days. Continuous refresh tokens must themselves be used within their validity window and are rotated by the refresh response. The systemd timer runs weekly, with a randomized delay, so both tokens remain current without recurring owner authorization.

Files:

- `/usr/local/sbin/joinai-pinterest-token-refresh`
- `joinai-pinterest-token-refresh.service`
- `joinai-pinterest-token-refresh.timer`
- Production secret file: `/opt/apps/joinaireligion/.env`, required mode `0600`

The rotation command:

1. Acquires a non-blocking process lock.
2. Validates required values without printing them.
3. Sends the app credential and refresh token through a root-only temporary curl configuration, never command-line arguments.
4. Does not retry the OAuth request automatically because a successful refresh may rotate the refresh token even if the response is lost.
5. Rejects non-200 responses and malformed token payloads without logging response bodies.
6. Builds a mode-`0600` replacement in the same directory, flushes it, and renames it over `.env` atomically.
7. Recreates the app container only when Pinterest scheduled publishing is already enabled.

On any failure the existing `.env` is left unchanged and the service exits non-zero. Never paste access tokens, refresh tokens, app secrets, OAuth codes, curl configurations, response files, or environment-file contents into chat, tickets, CI output, or operator logs.

## Installation and verification

The operations-runtime installer installs and enables the weekly timer. Its service condition safely skips execution until the three OAuth configuration lines exist.

Existence-only checks:

```bash
sudo bash -c '
  file=/opt/apps/joinaireligion/.env
  for key in PINTEREST_APP_ID PINTEREST_APP_SECRET PINTEREST_ACCESS_TOKEN PINTEREST_REFRESH_TOKEN PINTEREST_BOARD_ID PINTEREST_ACTIVATED_AT; do
    grep -q "^${key}=.." "$file" && printf "%s: set\n" "$key" || printf "%s: MISSING\n" "$key"
  done
'
sudo systemctl status joinai-pinterest-token-refresh.timer --no-pager
sudo systemctl list-timers joinai-pinterest-token-refresh.timer --no-pager
```

Manual rotation after credentials are installed:

```bash
sudo systemctl start joinai-pinterest-token-refresh.service
sudo systemctl show joinai-pinterest-token-refresh.service \
  --property=Result,ExecMainStatus,ActiveState,SubState --no-pager
```

The journal must contain only lifecycle status and sanitized errors:

```bash
sudo journalctl -u joinai-pinterest-token-refresh.service --since "24 hours ago" --no-pager
```

If the endpoint returns HTTP 401 or Pinterest reports credential invalidation, keep the provider switch off, revoke/replace the affected credential through the owner OAuth flow, and do not attempt to recover token values from logs.
