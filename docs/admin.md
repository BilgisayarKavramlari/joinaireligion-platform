# Admin Dashboard (MVP)

Admin routes are read-only and protected by a server-side placeholder guard using `ADMIN_EMAILS`.

Routes:
- /admin
- /admin/users
- /admin/users/[id]
- /admin/subscriptions
- /admin/activity
- /admin/dialogues
- /admin/stats

Internal review endpoints (key-protected):
- /api/internal/activity-summary
- /api/internal/dialogue-summary

Auth pages now include registration, login, forgot/reset password, and verify-email flows.

## Safe admin bootstrap

- No default admin password exists.
- Add initial allowlist with `ADMIN_EMAILS` in VPS `.env`.
- Register with allowlisted email, then optionally set `User.role = ADMIN` or `SUPER_ADMIN` in DB.
