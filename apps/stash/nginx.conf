server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Don't advertise the exact nginx version.
    server_tokens off;

    # Hashed build assets are immutable; index.html must never be cached or
    # clients pin themselves to a stale bundle after a deploy.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
