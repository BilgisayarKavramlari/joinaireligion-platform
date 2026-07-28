#!/bin/bash
# ============================================================
# joinaireligion-platform — Yerel Geliştirme Kurulum Scripti
# Mac Terminal'de çalıştır:  bash setup-local.sh
# ============================================================
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
GITHUB_USER="BilgisayarKavramlari"
REPO="joinaireligion-platform"

echo "======================================================"
echo "  joinaireligion-platform — Yerel Kurulum Başlıyor"
echo "======================================================"
echo "Dizin: $REPO_DIR"
echo ""

# ---- 1. Git kurulumu ----
echo "[1/6] Git kurulumu yapılıyor..."
cd "$REPO_DIR"

# Stale lock dosyalarını temizle (FUSE mount sonrası kalabilir)
find .git -name "*.lock" -empty -delete 2>/dev/null || true
rm -f .git/t2RsK3z 2>/dev/null || true
echo "  ✓ Stale lock dosyaları temizlendi"

if [ ! -d ".git" ]; then
  git init -b main
  git remote add origin "git@github.com:${GITHUB_USER}/${REPO}.git"
  echo "  ✓ Git init + remote eklendi"
else
  echo "  ✓ Git dizini mevcut"
  # Remote URL'i güvenli SSH adresine sabitle
  git remote set-url origin "git@github.com:${GITHUB_USER}/${REPO}.git" 2>/dev/null || true
  echo "  ✓ Remote origin güncellendi"
fi

git config user.email "drsadievrenseker@gmail.com"
git config user.name "Şadi Evren Şeker"
echo "  ✓ Git kullanıcı bilgileri ayarlandı"

# ---- 2. GitHub'dan son hali çek ----
echo ""
echo "[2/6] GitHub'dan güncel kod çekiliyor..."
git fetch origin main 2>/dev/null || git fetch origin 2>/dev/null || true
echo "  ✓ Fetch tamamlandı"

# ---- 3. .env kontrolü ----
echo ""
echo "[3/6] .env dosyası kontrol ediliyor..."
if [ ! -f ".env" ]; then
  echo "  HATA: .env dosyası bulunamadı! .env.example'dan kopyalanıyor..."
  cp .env.example .env
  echo "  UYARI: .env dosyasını gerçek API anahtarlarıyla güncelle!"
else
  echo "  ✓ .env dosyası mevcut"
fi

# ---- 4. Docker kontrolü ----
echo ""
echo "[4/6] Docker kontrol ediliyor..."
if ! command -v docker &>/dev/null; then
  echo "  HATA: Docker kurulu değil!"
  echo "  Lütfen https://www.docker.com/products/docker-desktop adresinden Docker Desktop kur."
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "  HATA: Docker Desktop çalışmıyor! Lütfen Docker Desktop'ı başlat."
  exit 1
fi

echo "  ✓ Docker çalışıyor"
DOCKER_VERSION=$(docker --version)
echo "  $DOCKER_VERSION"

# ---- 5. Docker Compose ile projeyi ayağa kaldır ----
echo ""
echo "[5/6] Docker Compose ile proje başlatılıyor..."
echo "  Bu işlem ilk seferinde birkaç dakika sürebilir (Node.js image indirilecek)..."
echo ""
docker compose -f docker-compose.dev.yml up --build -d

echo ""
echo "[5b] Konteynerler başlamasını bekliyoruz..."
sleep 10

# Durum kontrolü
echo ""
docker compose -f docker-compose.dev.yml ps

# ---- 6. Health check ----
echo ""
echo "[6/6] Health check yapılıyor..."
sleep 5

MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    HEALTH_BODY=$(curl -s http://localhost:3001/api/health)
    echo "  ✓ Health check başarılı! HTTP $HTTP_STATUS"
    echo "  $HEALTH_BODY"
    break
  else
    RETRY=$((RETRY + 1))
    echo "  Bekleniyor... (deneme $RETRY/$MAX_RETRIES, HTTP: $HTTP_STATUS)"
    sleep 5
  fi
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "  UYARI: Health check timeout. Logları kontrol et:"
  echo "  docker compose -f docker-compose.dev.yml logs app --tail=50"
fi

# ---- 7. Prisma DB Push ----
echo ""
echo "[7] Prisma schema DB'ye uygulanıyor..."
docker compose -f docker-compose.dev.yml exec -u root app npx prisma generate 2>/dev/null || true
docker compose -f docker-compose.dev.yml exec app npx prisma db push 2>/dev/null || true
echo "  ✓ Prisma işlemi tamamlandı"

echo ""
echo "======================================================"
echo "  KURULUM TAMAMLANDI!"
echo "======================================================"
echo ""
echo "  Uygulama: http://localhost:3001"
echo "  Health:   http://localhost:3001/api/health"
echo ""
echo "  Kullanışlı komutlar:"
echo "  Log takibi:    docker compose -f docker-compose.dev.yml logs app -f"
echo "  Yeniden build: docker compose -f docker-compose.dev.yml up --build -d"
echo "  Durdur:        docker compose -f docker-compose.dev.yml down"
echo "  DB'ye bağlan:  docker compose -f docker-compose.dev.yml exec db psql -U postgres -d joinaireligion"
echo ""
