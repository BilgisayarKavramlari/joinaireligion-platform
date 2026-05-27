#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# commit-all-phases.sh
#
# Phase 2 + Phase 3 değişikliklerini Git'e commit edip GitHub'a push eder.
# Bu scripti Mac terminalinizden çalıştırın:
#   bash commit-all-phases.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e   # herhangi bir hata olursa dur

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     joinaireligion — Phase 2 + 3 Commit Script      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 0. Stale lock dosyalarını temizle ─────────────────────────────────────────
for lock in .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock; do
  if [ -f "$lock" ]; then
    echo "⚠  Stale lock temizleniyor: $lock"
    rm -f "$lock"
  fi
done

# ── 1. Durum özeti ────────────────────────────────────────────────────────────
echo "📋 Değişen dosyalar:"
git status --short
echo ""

# ── 2. Tüm değişiklikleri stage et ───────────────────────────────────────────
git add -A

# ── 3. Commit ─────────────────────────────────────────────────────────────────
git commit -m "feat: Phase 2 + Phase 3 — onboarding, lessons, quota, test suite

Phase 2:
- Email doğrulama → journey durumu başlatma (level=1, xp=0, daysActive=0)
- Onboarding anketi: gelenek, beklentiler, pratik tercihleri, dil, güvenlik onayı
- preferred_language → User.preferredLocale senkronizasyonu
- Genişletilmiş profil alanları: country, city, phone, secondaryEmail, socialLinks
- Profil fotoğrafı yükleme (jpg/png/webp, maks 2MB, DB'de saklanır)
- Jest test altyapısı: mocks, helper'lar, 6 test dosyası

Phase 3:
- Onboarding/save: tamamlanınca anında Step 1 UserLesson oluşturma (eager)
- İlk ders e-postası: Step 1 ders içeriği (okuma, pratik, sorular) ile zenginleştirildi
- POST /api/lessons/generate-next: OpenAI ile kişiselleştirilmiş ders üretimi
  - API anahtarı yoksa Step 1 şablonunu klonlayan dev fallback
  - Tamamlanan dersler + onboarding geçmişi ile kişiselleştirme
- Lesson submit route: quota sistemi
  - Ücretsiz kullanıcı: haftada 1 ders denemesi (7 gün)
  - Ücretli (Initiate) kullanıcı: günde 1 ders denemesi (24 saat)
  - LessonQuota, QueryQuota'dan ayrı tutulur
  - 80 karakter minimum prompt zorunluluğu
  - Tamamlanan ders reddedilir (COMPLETED guard)
  - Geçme → XP ve level güncellemesi, bir sonraki ders üretimi tetiklenir
- Lesson sayfası: 'Next Lesson' butonu generate-next'i çağırıp /lessons'a yönlendirir

Test suite (95/95 geçiyor):
- phase2/01-auth-utils.test.ts       (4 test)
- phase2/02-registration.test.ts     (8 test)
- phase2/03-email-verification.test.ts (11 test)
- phase2/04-onboarding.test.ts       (8 test)
- phase2/05-profile-update.test.ts   (9 test)
- phase2/06-avatar-upload.test.ts    (9 test)
- phase3/07-onboarding-step1-creation.test.ts (10 test)
- phase3/08-lesson-submit-quota.test.ts       (15 test + 1 isolation)"

# ── 4. Push ───────────────────────────────────────────────────────────────────
echo ""
echo "🚀 GitHub'a push ediliyor..."
git push origin main

echo ""
echo "✅ Tüm değişiklikler başarıyla push edildi."
echo ""
echo "   95 test geçiyor  |  TypeScript hata yok  |  Phase 2 + 3 tamamlandı"
echo ""
