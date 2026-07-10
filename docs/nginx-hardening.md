# Nginx hardening for Hostinger/VPS production

Use this as the front proxy policy for the Next.js app on `127.0.0.1:3001`.

```nginx
limit_req_zone $binary_remote_addr zone=jair_auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=jair_api:10m rate=60r/m;

map $request_uri $blocked_probe {
  default 0;
  ~*^/(wp-login\.php|xmlrpc\.php|wp-admin|cgi-bin|shell|GponForm) 1;
}

server {
  listen 443 ssl http2;
  server_name joinaireligion.com www.joinaireligion.com;

  access_log /var/log/nginx/joinaireligion.access.log;
  error_log  /var/log/nginx/joinaireligion.error.log warn;
  access_log /var/log/nginx/joinaireligion.security.log combined if=$blocked_probe;

  client_max_body_size 3m;

  if ($blocked_probe) { return 444; }

  location ~* ^/(wp-login\.php|xmlrpc\.php|wp-admin|cgi-bin|shell|GponForm) {
    access_log /var/log/nginx/joinaireligion.security.log combined;
    return 444;
  }

  location ~ ^/api/auth/ {
    limit_req zone=jair_auth burst=10 nodelay;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /api/ {
    limit_req zone=jair_api burst=120 nodelay;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    limit_except GET HEAD POST { deny all; }
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
  }
}
```

After editing, run `nginx -t && systemctl reload nginx`. Keep blocked probe logs separate so Fail2Ban or provider abuse reports can be investigated without mixing normal traffic.
