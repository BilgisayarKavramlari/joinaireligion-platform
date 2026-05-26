# Admin Dashboard (MVP)

Güvenlik nedeniyle repoya **default admin şifresi** yazılmaz.

## Güvenli ilk admin kurulumu
1. VPS `.env` içine `ADMIN_EMAILS="admin@shedai.net"` ekleyin.
2. Bu email ile normal register akışından kullanıcı oluşturun.
3. İsterseniz DB üzerinden rolü `ADMIN` / `SUPER_ADMIN` yapın.

Örnek SQL:
```sql
UPDATE "User" SET role='ADMIN' WHERE email='admin@shedai.net';
```

## Rotalar
- /admin
- /admin/users
- /admin/users/[id]
- /admin/subscriptions
- /admin/activity
- /admin/dialogues
- /admin/stats

Yetkisiz kullanıcılar `/forbidden` (403) sayfasına yönlendirilir.
