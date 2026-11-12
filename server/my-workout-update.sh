#!/usr/bin/env bash
set -euo pipefail

REPO=/var/www/workout-copy
BRANCH=main

cd "$REPO"

# Do not overwrite manual server-side edits.
CHANGES=$(git status --porcelain | grep -vE "^\?\? videos(/|$)" || true)
if [[ -n "$CHANGES" ]]; then
  echo "my-workout-update: working tree is not clean; skipping update"
  exit 0
fi

git fetch --quiet origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [[ "$LOCAL" == "$REMOTE" ]]; then
  echo "my-workout-update: already up to date ($LOCAL)"
  exit 0
fi

# Only accept a fast-forward update from the tracked branch.
if ! git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
  echo "my-workout-update: refusing non-fast-forward update" >&2
  exit 1
fi

git merge --ff-only --quiet "origin/$BRANCH"

# Keep the public HTTPS endpoint available after deployments. The certificate
# is installed separately by acme.sh and is only referenced when present.
CERT_DIR=/etc/ssl/impik81.online
NGINX_SITE=/etc/nginx/sites-enabled/workout-copy
if [[ -f "$CERT_DIR/fullchain.pem" && -f "$CERT_DIR/privkey.pem" && -d /etc/nginx ]]; then
  cat > "$NGINX_SITE" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name impik81.online www.impik81.online;
    root /var/www/workout-copy;

    location /.well-known/acme-challenge/ { try_files $uri =404; }
    location / { return 301 https://impik81.online$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.impik81.online;
    ssl_certificate /etc/ssl/impik81.online/fullchain.pem;
    ssl_certificate_key /etc/ssl/impik81.online/privkey.pem;
    location / { return 301 https://impik81.online$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name impik81.online;
    root /var/www/workout-copy;
    index index.html;
    ssl_certificate /etc/ssl/impik81.online/fullchain.pem;
    ssl_certificate_key /etc/ssl/impik81.online/privkey.pem;
    client_max_body_size 125M;

    location /.well-known/acme-challenge/ { try_files $uri =404; }
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 180s;
    }
    location /videos/ { try_files $uri =404; }
    location / { try_files $uri $uri/ /index.html; }
}
NGINX
  if nginx -t; then
    systemctl reload nginx
    echo "my-workout-update: HTTPS configuration checked and reloaded"
  else
    echo "my-workout-update: invalid nginx configuration; leaving service unchanged" >&2
    exit 1
  fi
fi

systemctl restart my-workout
echo "my-workout-update: updated to $(git rev-parse --short HEAD) and restarted my-workout"
