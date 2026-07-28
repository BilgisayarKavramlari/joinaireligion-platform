#!/bin/bash
# ============================================================
# joinaireligion-platform — Geliştirme Yardımcı Scripti
# Kullanım: bash dev.sh [komut]
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
GITHUB_USER="BilgisayarKavramlari"
REPO="joinaireligion-platform"

cd "$REPO_DIR"

case "${1:-help}" in

  # ---- Başlatma komutları ----
  up)
    echo "▶ Docker Compose başlatılıyor (dev)..."
    docker compose -f docker-compose.dev.yml up --build -d
    ;;
  down)
    echo "■ Docker Compose durduruluyor..."
    docker compose -f docker-compose.dev.yml down
    ;;
  restart)
    echo "↺ Docker Compose yeniden başlatılıyor..."
    docker compose -f docker-compose.dev.yml down
    docker compose -f docker-compose.dev.yml up --build -d
    ;;
  db-only)
    echo "▶ Sadece veritabanı başlatılıyor..."
    docker compose -f docker-compose.dev.yml up db -d
    ;;

  # ---- Log ve durum ----
  logs)
    docker compose -f docker-compose.dev.yml logs app -f --tail=100
    ;;
  logs-db)
    docker compose -f docker-compose.dev.yml logs db -f --tail=50
    ;;
  status)
    docker compose -f docker-compose.dev.yml ps
    ;;
  health)
    curl -s http://localhost:3001/api/health | python3 -m json.tool || \
    echo "Uygulama ayakta değil veya health endpoint yanıt vermiyor."
    ;;

  # ---- Prisma komutları ----
  prisma-push)
    echo "→ Prisma DB push yapılıyor..."
    docker compose -f docker-compose.dev.yml exec -u root app npx prisma generate
    docker compose -f docker-compose.dev.yml exec app npx prisma db push
    ;;
  prisma-studio)
    echo "→ Prisma Studio açılıyor (localhost:5555)..."
    docker compose -f docker-compose.dev.yml exec app npx prisma studio
    ;;
  db-shell)
    echo "→ PostgreSQL shell açılıyor..."
    docker compose -f docker-compose.dev.yml exec db psql -U postgres -d joinaireligion
    ;;
  db-tables)
    echo "→ Veritabanı tabloları:"
    docker compose -f docker-compose.dev.yml exec db psql -U postgres -d joinaireligion -c "\dt"
    ;;

  # ---- Git komutları ----
  pull)
    echo "↓ GitHub'dan güncel kod çekiliyor..."
    git pull origin main
    ;;
  push)
    MSG="${2:-feat: update joinaireligion platform}"
    echo "↑ GitHub'a gönderiliyor: '$MSG'"
    git status --short
    git add .
    git commit -m "$MSG"
    git push origin main
    ;;
  status-git)
    git status
    ;;

  # ---- Deploy (VPS) ----
  deploy)
    echo "🚀 VPS'ye deploy başlatılıyor..."
    echo "Adım 1: GitHub'a push ediliyor..."
    git add .
    git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "(değişiklik yok)"
    git push origin main

    echo ""
    echo "Adım 2: VPS'de güncelleme yapılıyor..."
    echo "Aşağıdaki komutu VPS'de çalıştırın:"
    echo ""
    echo "  ssh root@joinaireligion.com 'cd /opt/apps/joinaireligion && git pull && docker compose up -d --build'"
    echo ""
    ;;

  # ---- npm dev (Docker olmadan, sadece DB Docker'da) ----
  npm-dev)
    echo "▶ Sadece DB Docker'da başlatılıyor..."
    docker compose -f docker-compose.dev.yml up db -d
    echo "DB ayakta. npm run dev başlatılıyor..."
    cp .env.local .env.local.active 2>/dev/null || true
    NODE_ENV=development npx prisma generate 2>/dev/null || true
    npm run dev
    ;;

  # ---- Yardım ----
  help|*)
    echo ""
    echo "joinaireligion-platform — Geliştirme Scripti"
    echo ""
    echo "KULLANIM: bash dev.sh [komut]"
    echo ""
    echo "Docker Komutları:"
    echo "  up          → Tüm stack'i başlat (build ile)"
    echo "  down        → Stack'i durdur"
    echo "  restart     → Yeniden başlat"
    echo "  db-only     → Sadece veritabanını başlat"
    echo ""
    echo "İzleme:"
    echo "  logs        → App loglarını takip et"
    echo "  logs-db     → DB loglarını takip et"
    echo "  status      → Container durumu"
    echo "  health      → /api/health endpoint testi"
    echo ""
    echo "Prisma / DB:"
    echo "  prisma-push → Schema'yı DB'ye uygula"
    echo "  prisma-studio → Prisma Studio aç"
    echo "  db-shell    → PostgreSQL CLI'ye gir"
    echo "  db-tables   → Tabloları listele"
    echo ""
    echo "Git:"
    echo "  pull           → GitHub'dan çek"
    echo "  push [mesaj]   → GitHub'a gönder"
    echo "  status-git     → Git durumu"
    echo ""
    echo "Deploy:"
    echo "  deploy      → GitHub'a push + VPS deploy talimatı"
    echo ""
    ;;
esac
