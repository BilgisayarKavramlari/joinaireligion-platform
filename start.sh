#!/bin/bash
# ============================================================
# joinaireligion-platform — Hızlı Başlatma Scripti
# Mac'te Docker olmadan çalıştırır (Homebrew PostgreSQL ile)
#
# İLK KEZ: bash start.sh setup
# SONRAKI:  bash start.sh
# ============================================================

set -e
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}▶ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
error()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ---- PostgreSQL kontrol ve başlat ----
ensure_postgres() {
  if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    success "PostgreSQL çalışıyor (localhost:5432)"
    return
  fi

  info "PostgreSQL başlatılıyor..."

  # Homebrew servis dene
  if command -v brew &>/dev/null; then
    brew services start postgresql@16 2>/dev/null || \
    brew services start postgresql 2>/dev/null || true
    sleep 2
  fi

  # Sistem pg_ctl dene
  if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    PG_DATA=$(brew --prefix 2>/dev/null)/var/postgresql@16
    if [ -d "$PG_DATA" ]; then
      pg_ctl -D "$PG_DATA" start -l /tmp/pg.log 2>/dev/null || true
      sleep 2
    fi
  fi

  if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    success "PostgreSQL başlatıldı"
  else
    error "PostgreSQL başlatılamadı. 'brew services start postgresql@16' ile manuel başlatın."
  fi
}

# ---- Veritabanı oluştur ----
ensure_db() {
  if psql -h localhost -U postgres -lqt 2>/dev/null | cut -d\| -f1 | grep -qw joinaireligion; then
    success "Veritabanı 'joinaireligion' mevcut"
    return
  fi

  info "Veritabanı oluşturuluyor..."
  psql -h localhost -U postgres -c "CREATE DATABASE joinaireligion;" 2>/dev/null || \
  createdb -h localhost -U postgres joinaireligion 2>/dev/null || \
  warn "Veritabanı zaten mevcut olabilir"
  success "Veritabanı hazır"
}

# ---- Bağımlılıklar ----
ensure_deps() {
  if [ -d "node_modules/.bin/next" ]; then
    success "node_modules mevcut"
    return
  fi
  info "npm install çalıştırılıyor..."
  npm install
  success "Bağımlılıklar kuruldu"
}

# ---- Prisma ----
ensure_prisma() {
  info "Prisma generate + db push..."
  npx prisma generate 2>/dev/null || warn "Prisma generate uyarıyla tamamlandı"
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/joinaireligion?schema=public" \
    npx prisma db push --accept-data-loss 2>/dev/null || \
    warn "Prisma db push uyarı verdi (tablo zaten varsa normal)"
  success "Prisma şeması uygulandı"
}

# ============================================================
case "${1:-dev}" in

  setup)
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  joinaireligion — İlk Kurulum        ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
    ensure_postgres
    ensure_db
    ensure_deps
    ensure_prisma
    echo ""
    success "Kurulum tamamlandı! 'bash start.sh' ile başlatabilirsiniz."
    echo ""
    ;;

  dev|"")
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  joinaireligion — Dev Server         ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
    ensure_postgres
    ensure_db

    if [ ! -d "node_modules/.bin/next" ]; then
      warn "node_modules bulunamadı. Önce 'bash start.sh setup' çalıştırın."
      ensure_deps
      ensure_prisma
    fi

    echo ""
    info "Dev server başlatılıyor → http://localhost:3000"
    echo ""
    NODE_ENV=development npm run dev
    ;;

  prisma-studio)
    ensure_postgres
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/joinaireligion?schema=public" \
      npx prisma studio
    ;;

  db-reset)
    warn "Veritabanı sıfırlanıyor (TÜM VERİLER SİLİNECEK)..."
    read -p "Devam etmek istiyor musunuz? (evet/hayır): " confirm
    [ "$confirm" != "evet" ] && echo "İptal edildi." && exit 0
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/joinaireligion?schema=public" \
      npx prisma db push --force-reset
    success "Veritabanı sıfırlandı"
    ;;

  stop-pg)
    info "PostgreSQL durduruluyor..."
    brew services stop postgresql@16 2>/dev/null || \
    brew services stop postgresql 2>/dev/null || true
    success "PostgreSQL durduruldu"
    ;;

  docker-up)
    info "Docker Compose (dev) başlatılıyor..."
    docker compose -f docker-compose.dev.yml up --build -d
    success "http://localhost:3001 adresinde çalışıyor"
    ;;

  docker-down)
    docker compose -f docker-compose.dev.yml down
    ;;

  docker-logs)
    docker compose -f docker-compose.dev.yml logs app -f --tail=100
    ;;

  help|*)
    echo ""
    echo "joinaireligion-platform — Başlatma Scripti"
    echo ""
    echo "KULLANIM:"
    echo "  bash start.sh setup        → İlk kurulum (npm install + prisma + db)"
    echo "  bash start.sh              → Dev server başlat (localhost:3000)"
    echo "  bash start.sh dev          → Aynı (dev takma adı)"
    echo "  bash start.sh prisma-studio→ Prisma Studio aç (localhost:5555)"
    echo "  bash start.sh db-reset     → Veritabanını sıfırla (dikkatli!)"
    echo "  bash start.sh stop-pg      → PostgreSQL durdur"
    echo "  bash start.sh docker-up    → Docker Compose ile başlat (localhost:3001)"
    echo "  bash start.sh docker-down  → Docker Compose durdur"
    echo "  bash start.sh docker-logs  → Docker logları izle"
    echo ""
    echo "Gereksinimler: Node.js 20+, PostgreSQL 16 (Homebrew), npm"
    echo ""
    ;;
esac
