#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-and-push.sh
#
# Remote ile yerel kodu birleştirir; çakışmalarda yerel (Phase 2+3) kazanır.
# Herhangi bir adımda hata olursa durur ve kurtarma talimatı verir.
#
# Çalıştırma: bash sync-and-push.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
trap 'echo ""; echo "❌ Bir hata oluştu. Kurtarmak için: git rebase --abort || git merge --abort || git checkout main"; exit 1' ERR

cd "$(dirname "$0")"

BRANCH="main"
BACKUP="backup-local-$(date +%Y%m%d-%H%M%S)"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          joinaireligion — Sync & Push Script         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 0. Stale lock dosyalarını temizle ─────────────────────────────────────────
for lock in .git/index.lock .git/HEAD.lock .git/MERGE_HEAD.lock; do
  if [ -f "$lock" ]; then
    echo "🔓 Stale lock temizleniyor: $lock"
    rm -f "$lock"
  fi
done

# ── 1. Devam eden rebase / merge / cherry-pick'i durdur ──────────────────────
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
  echo "⏹  Devam eden rebase durduruluyor..."
  git rebase --abort
  echo "   ✓ Rebase durduruldu."
fi

if [ -f ".git/MERGE_HEAD" ]; then
  echo "⏹  Devam eden merge durduruluyor..."
  git merge --abort
  echo "   ✓ Merge durduruldu."
fi

# ── 2. Yerel kodu backup branch'e al (geri dönüş garantisi) ──────────────────
echo ""
echo "💾 Yerel durum yedekleniyor → $BACKUP"
git branch "$BACKUP"
echo "   ✓ Yedek oluşturuldu. Geri dönmek için: git checkout $BACKUP"

# ── 3. Remote'u fetch et ──────────────────────────────────────────────────────
echo ""
echo "📡 Remote güncel bilgiler alınıyor..."
git fetch origin "$BRANCH"
echo "   ✓ Fetch tamamlandı."

# ── 4. Merge — çakışmalarda yerel kod kazanır (-X ours) ──────────────────────
echo ""
echo "🔀 Remote değişiklikler birleştiriliyor (yerel Phase 2+3 öncelikli)..."
echo "   Strateji: çakışmalarda yerel dosya korunur, remote'a özgü"
echo "   değişiklikler (çakışmasız dosyalar) otomatik eklenir."
echo ""

git merge "origin/$BRANCH" -X ours --no-edit \
  -m "merge: integrate remote + Phase 2+3 local changes (local priority on conflicts)"

echo "   ✓ Merge tamamlandı."

# ── 5. Merge sonrası özet ─────────────────────────────────────────────────────
echo ""
echo "📋 Son commit durumu:"
git log --oneline -5

# ── 6. Push ───────────────────────────────────────────────────────────────────
echo ""
echo "🚀 GitHub'a push ediliyor..."
git push origin "$BRANCH"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Başarıyla tamamlandı!                          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "   Yedek branch: $BACKUP"
echo "   Artık backup'ı silebilirsiniz:"
echo "   git branch -d $BACKUP"
echo ""
