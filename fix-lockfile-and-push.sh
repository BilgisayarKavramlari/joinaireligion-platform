#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# fix-lockfile-and-push.sh
#
# package-lock.json'u package.json ile senkronize eder ve GitHub'a push eder.
# Docker build'in "npm ci" hatası bununla çözülür.
#
# Çalıştırma: bash fix-lockfile-and-push.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
trap 'echo ""; echo "❌ Hata oluştu — terminal çıktısını paylaşın."; exit 1' ERR

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     joinaireligion — Lock File Sync & Push           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 0. Stale git lock'ları temizle ───────────────────────────────────────────
for lock in .git/index.lock .git/HEAD.lock; do
  [ -f "$lock" ] && rm -f "$lock" && echo "🔓 $lock temizlendi"
done

# ── 1. npm install — lock dosyasını yenile ────────────────────────────────────
echo "📦 npm install çalışıyor (bu 1-2 dakika sürebilir)..."
npm install
echo "   ✓ package-lock.json güncellendi."

# ── 2. Remote'dan güncel kodu al ─────────────────────────────────────────────
echo ""
echo "📡 Remote değişiklikler alınıyor..."
git fetch origin main

# Eğer diverge edildiyse merge et (önceki sync'ten kalabilir)
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base HEAD origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "   ✓ Zaten güncel, fetch yeterli."
elif [ "$LOCAL" = "$BASE" ]; then
  echo "   Remote önde — hızlı ileri sarılıyor..."
  git merge origin/main --ff-only
  echo "   ✓ Fast-forward tamamlandı."
else
  echo "   Diverge durumu — merge yapılıyor (yerel öncelikli)..."
  git merge origin/main -X ours --no-edit \
    -m "merge: sync remote before lock file update"
  echo "   ✓ Merge tamamlandı."
fi

# ── 3. Lock dosyasını commit et ───────────────────────────────────────────────
echo ""
echo "💾 package-lock.json commit ediliyor..."

# Sadece package-lock.json değiştiyse commit yap
if git diff --quiet package-lock.json 2>/dev/null; then
  echo "   ℹ️  Lock dosyası zaten güncel, commit atlanıyor."
else
  git add package-lock.json
  git commit -m "fix: sync package-lock.json with package.json (ts-node + deps)

  Docker 'npm ci' hatasını çözer.
  Eksik paketler: ts-node@10.9.2 ve geçişli bağımlılıkları."
  echo "   ✓ Commit oluşturuldu."
fi

# ── 4. Push ───────────────────────────────────────────────────────────────────
echo ""
echo "🚀 GitHub'a push ediliyor..."
git push origin main
echo "   ✓ Push tamamlandı."

# ── 5. Docker rebuild (opsiyonel) ─────────────────────────────────────────────
echo ""
read -p "🐳 Docker container'ı şimdi yeniden build etmek ister misiniz? [E/h] " rebuild
if [[ "$rebuild" =~ ^[Ee]$ ]] || [[ -z "$rebuild" ]]; then
  echo ""
  echo "🔨 Docker build başlıyor..."
  docker compose down 2>/dev/null || true
  docker compose build --no-cache
  docker compose up -d
  echo ""
  echo "⏳ Container'ların ayağa kalkması bekleniyor (15 sn)..."
  sleep 15
  echo ""
  echo "📋 Container durumu:"
  docker compose ps
  echo ""
  echo "🌐 Uygulama: http://localhost:3000"
else
  echo ""
  echo "   Docker build atlandı."
  echo "   Sonra başlatmak için: docker compose down && docker compose build --no-cache && docker compose up -d"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Tamamlandı!                                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
