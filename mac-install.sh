#!/bin/bash
# ================================================================
# joinaireligion-platform — macOS Tam Kurulum Scripti
# Homebrew + Node.js + PostgreSQL kurar, projeyi başlatır.
# Kullanım: bash mac-install.sh
# ================================================================

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
info() { echo -e "${CYAN}  → $1${NC}"; }
err()  { echo -e "${RED}  ✗ $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   joinaireligion-platform  —  macOS Kurulum Sihirbazı   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Dizin: $REPO_DIR"
echo ""

# ── 1. Homebrew ────────────────────────────────────────────────
echo "[ 1 / 7 ]  Homebrew kontrol ediliyor..."

if ! command -v brew &>/dev/null; then
  info "Homebrew kuruluyor (Xcode CLT dahil)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Apple Silicon path
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    ok "Apple Silicon: /opt/homebrew path ayarlandı"
  fi
  # Intel Mac path
  if [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
    ok "Intel Mac: /usr/local path ayarlandı"
  fi
  ok "Homebrew kuruldu"
else
  # Mevcut kurulumda PATH'i ayarla
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  ok "Homebrew zaten mevcut: $(brew --version | head -1)"
fi

# ── 2. Node.js ────────────────────────────────────────────────
echo ""
echo "[ 2 / 7 ]  Node.js kontrol ediliyor..."

if ! command -v node &>/dev/null; then
  info "Node.js 20 LTS kuruluyor..."
  brew install node@20
  brew link node@20 --force --overwrite 2>/dev/null || true
  ok "Node.js kuruldu: $(node --version)"
else
  NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    warn "Node.js $NODE_VER eski. v20 kuruluyor..."
    brew install node@20
    brew link node@20 --force --overwrite 2>/dev/null || true
  fi
  ok "Node.js: $(node --version)"
fi

# ── 3. PostgreSQL ─────────────────────────────────────────────
echo ""
echo "[ 3 / 7 ]  PostgreSQL kontrol ediliyor..."

if ! command -v psql &>/dev/null; then
  info "PostgreSQL 16 kuruluyor..."
  brew install postgresql@16
  ok "PostgreSQL 16 kuruldu"
else
  ok "PostgreSQL mevcut: $(psql --version | head -1)"
fi

# PATH'e ekle
export PATH="/opt/homebrew/opt/postgresql@16/bin:/usr/local/opt/postgresql@16/bin:$PATH"

# Servisi başlat
info "PostgreSQL servisi başlatılıyor..."
brew services start postgresql@16 2>/dev/null || true
sleep 3
ok "PostgreSQL servisi aktif"

# ── 4. Veritabanı ve Kullanıcı Kurulumu ──────────────────────
echo ""
echo "[ 4 / 7 ]  Veritabanı hazırlanıyor..."

# 'postgres' rolü oluştur (macOS'ta varsayılan kullanıcı adınızdır)
info "'postgres' rolü oluşturuluyor (zaten varsa atlanır)..."
psql postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';" 2>/dev/null \
  && ok "'postgres' rolü oluşturuldu" \
  || ok "'postgres' rolü zaten mevcut"

# Veritabanı oluştur
psql postgres -U postgres -c "CREATE DATABASE joinaireligion;" 2>/dev/null \
  && ok "'joinaireligion' veritabanı oluşturuldu" \
  || ok "'joinaireligion' veritabanı zaten mevcut"

# ── 5. .env.local Kurulumu ────────────────────────────────────
echo ""
echo "[ 5 / 7 ]  Ortam değişkenleri (.env.local) ayarlanıyor..."

cd "$REPO_DIR"

if [ ! -f ".env.local" ]; then
  warn ".env.local bulunamadı, .env.example'dan oluşturuluyor..."
  cp .env.example .env.local
  # DATABASE_URL'i localhost olarak ayarla
  sed -i '' 's|@db:|@localhost:|g' .env.local 2>/dev/null || \
  sed -i 's|@db:|@localhost:|g' .env.local 2>/dev/null || true
fi

# Next.js .env.local'ı otomatik okur, ekstra kopya gerekmez
ok ".env.local hazır"

# ── 6. npm install + Prisma ───────────────────────────────────
echo ""
echo "[ 6 / 7 ]  npm bağımlılıkları ve Prisma kuruluyor..."

info "npm install çalışıyor..."
npm install

info "Prisma client generate ediliyor..."
npx prisma generate

info "Prisma schema veritabanına uygulanıyor..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/joinaireligion?schema=public" \
  npx prisma db push --accept-data-loss 2>/dev/null || true

ok "npm + Prisma kurulumu tamamlandı"

# ── 7. Başlatma ───────────────────────────────────────────────
echo ""
echo "[ 7 / 7 ]  Proje başlatılıyor..."
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  KURULUM TAMAMLANDI! 🎉                 ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Uygulama:  http://localhost:3000                        ║"
echo "║  API:       http://localhost:3000/api/health             ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Durdurmak için: Ctrl + C                               ║"
echo "║  Tekrar başlatmak için: npm run dev                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Next.js dev server'ı başlat
npm run dev
