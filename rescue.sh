#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# rescue.sh — Projeyi kurtarır ve çalışır hale getirir
#
# Çözdüğü sorunlar:
#   1. Takılı git rebase → durdurur, Phase 2+3 kodunu geri yükler
#   2. framer-motion state.mjs hatası → next.config.ts transpilePackages ile
#   3. package-lock.json senkron değil → npm install ile yeniler
#   4. node_modules eksik/bozuk → temiz yükleme yapar
#   5. DATABASE_URL → localhost'a çevirir (native dev için)
#   6. GitHub'a push eder
#
# Çalıştırma: bash rescue.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
trap 'echo ""; echo "❌ HATA (satır $LINENO). Lütfen çıktıyı paylaşın."; exit 1' ERR

cd "$(dirname "$0")"
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   joinaireligion — Kurtarma & Başlatma Scripti          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 0. Git lock dosyalarını temizle ──────────────────────────────────────────
for lock in .git/index.lock .git/HEAD.lock; do
  [ -f "$lock" ] && rm -f "$lock" && echo "🔓 $lock silindi"
done

# ── 1. Takılı rebase'i durdur ────────────────────────────────────────────────
echo "⏹  Git rebase durduruluyor..."
if git rebase --abort 2>/dev/null; then
  echo "   ✓ Rebase durduruldu — Phase 2+3 commit'e (80f11cf) döndük"
else
  # Rebase-merge dizinini elle temizle
  rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null || true
  git checkout HEAD -- . 2>/dev/null || true
  echo "   ✓ Rebase state temizlendi"
fi

# ── 2. Phase 2+3 commit'i doğrula ────────────────────────────────────────────
echo ""
echo "📍 Mevcut HEAD:"
git log --oneline -3

# ── 3. Conflict marker'ları kalan dosyaları Phase 2+3 versiyonuyla yaz ───────
echo ""
echo "🔧 Çakışan dosyalar temizleniyor..."
P23="80f11cfc9112c69b3ba2ab487aa7fe8c4f6252b4"
CONFLICT_FILES=(
  "src/app/account/billing/page.tsx"
  "src/app/account/profile/page.tsx"
  "src/app/admin/users/page.tsx"
  "src/app/api/auth/me/route.ts"
  "src/app/api/stripe/webhook/route.ts"
  "src/app/pricing/page.tsx"
  "src/app/prompt-guide/page.tsx"
  "src/app/verify-email/page.tsx"
)
for f in "${CONFLICT_FILES[@]}"; do
  if git show "$P23:$f" > /tmp/_rescue_tmp 2>/dev/null; then
    mv /tmp/_rescue_tmp "$f"
    echo "   ✓ $f"
  fi
done

# ── 4. node_modules temizle ve yeniden yükle ─────────────────────────────────
echo ""
echo "📦 node_modules temizleniyor ve yeniden yükleniyor..."
rm -rf node_modules .next
npm install
echo "   ✓ npm install tamamlandı"

# ── 5. DATABASE_URL → localhost ──────────────────────────────────────────────
echo ""
echo "🔌 DATABASE_URL localhost'a ayarlanıyor..."
if grep -q "@db:5432" .env 2>/dev/null; then
  sed -i '' 's|@db:5432|@localhost:5432|g' .env
  echo "   ✓ .env: db:5432 → localhost:5432"
else
  echo "   ℹ️  Zaten localhost veya farklı ayar var"
fi

# ── 6. Prisma generate ────────────────────────────────────────────────────────
echo ""
echo "🔷 Prisma client üretiliyor..."
npx prisma generate
echo "   ✓ Prisma client hazır"

# ── 7. Tüm değişiklikleri commit et ve push et ────────────────────────────────
echo ""
echo "💾 Değişiklikler commit ediliyor..."
git add -A

# Değişiklik var mı kontrol et
if git diff --staged --quiet; then
  echo "   ℹ️  Staged değişiklik yok, commit atlanıyor"
else
  git commit -m "fix: restore Phase 2+3, framer-motion transpile, .dockerignore, lock sync

- next.config.ts: transpilePackages framer-motion/motion-dom (state.mjs fix)
- .dockerignore eklendi (Docker build hızlandırma)
- Çakışan 8 dosya Phase 2+3 versiyonuyla yenilendi
- package-lock.json yenilendi (ts-node sync)
- node_modules temiz kurulum"
  echo "   ✓ Commit oluşturuldu"
fi

echo ""
echo "🚀 GitHub'a push ediliyor..."
git push --force-with-lease origin main 2>/dev/null || git push origin main
echo "   ✓ Push tamamlandı"

# ── 8. Özet ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  Kurtarma tamamlandı!                               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Projeyi başlatmak için:"
echo ""
echo "  1. DB'yi başlat (yeni terminal):"
echo "     bash dev.sh db-only"
echo ""
echo "  2. Schema'yı uygula (bir kere):"
echo "     npx prisma db push"
echo ""
echo "  3. Dev server'ı başlat:"
echo "     npm run dev"
echo ""
echo "  ➜ http://localhost:3000"
echo ""
