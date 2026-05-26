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
