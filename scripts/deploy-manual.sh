#!/usr/bin/env sh
set -eu

APP_DIR="/opt/apps/joinaireligion"

printf "[1/6] Ensuring app directory exists at %s\n" "$APP_DIR"
mkdir -p "$APP_DIR"

printf "[2/6] Copy repository contents into app directory\n"
rsync -av --delete --exclude ".git" ./ "$APP_DIR"/

printf "[3/6] Move into app directory\n"
cd "$APP_DIR"

printf "[4/6] Ensure .env exists (copy from .env.example if needed)\n"
[ -f .env ] || cp .env.example .env

printf "[5/6] Build and start services\n"
docker compose pull || true
docker compose up --build -d

printf "[6/6] Deployment complete\n"
printf "Visit: https://joinaireligion.com (after DNS + reverse proxy are configured).\n"
