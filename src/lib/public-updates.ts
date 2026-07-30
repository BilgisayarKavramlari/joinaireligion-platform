export type PublicUpdateLocale = "en" | "tr";
export type PublicUpdateStatus = "planned" | "released";

export type PublicUpdateCopy = {
  title: string;
  summary: string;
  highlights: string[];
};

export type PublicUpdate = {
  version: `v${number}.${number}.${number}`;
  status: PublicUpdateStatus;
  targetStart?: string;
  releasedAt?: string;
  targetWindow?: Record<PublicUpdateLocale, string>;
  copy: Record<PublicUpdateLocale, PublicUpdateCopy>;
};

/**
 * Append-only public release notes. Planned entries must stay visibly marked as
 * planned and may move to released only after production verification.
 */
export const publicUpdates: readonly PublicUpdate[] = [
  {
    version: "v0.2.1",
    status: "released",
    releasedAt: "2026-07-30",
    copy: {
      en: {
        title: "Personal journey tools and clear lesson timing",
        summary: "A privacy-focused release for planning personal practice and knowing exactly when the next reflection can be submitted.",
        highlights: [
          "A personal calendar combining lesson history, completed practices, and future plans",
          "Encrypted private notes with export, deletion, and configurable retention",
          "Quick check-ins for meditation, yoga, reading, and reflection",
          "A live day, hour, minute, and second countdown to the next lesson reflection submission",
        ],
      },
      tr: {
        title: "Kişisel yolculuk araçları ve net ders zamanlaması",
        summary: "Kişisel pratikleri planlamak ve sonraki yansımanın ne zaman gönderilebileceğini tam olarak görmek için gizlilik odaklı bir sürüm.",
        highlights: [
          "Ders geçmişini, tamamlanan pratikleri ve gelecek planlarını birleştiren kişisel takvim",
          "Dışa aktarma, silme ve ayarlanabilir saklama süresi sunan şifreli özel notlar",
          "Meditasyon, yoga, okuma ve düşünme için hızlı aktivite kayıtları",
          "Sonraki ders yansımasına gün, saat, dakika ve saniye gösteren canlı geri sayım",
        ],
      },
    },
  },
  {
    version: "v0.2.0",
    status: "released",
    releasedAt: "2026-07-29",
    copy: {
      en: {
        title: "Reliable access and clearer product updates",
        summary: "A focused release for dependable sign-in, payment confirmation, and transparent change tracking.",
        highlights: [
          "Consistent account state after sign-in and email verification",
          "Safer Checkout return confirmation and clearer USD/TRY presentation",
          "A public Updates page with short, versioned release notes",
          "Credit wallet foundation kept disabled until pricing and safety checks are complete",
        ],
      },
      tr: {
        title: "Güvenilir erişim ve daha açık ürün güncellemeleri",
        summary: "Oturum, ödeme doğrulama ve şeffaf değişiklik takibine odaklanan bir sürüm.",
        highlights: [
          "Giriş ve e-posta doğrulamasından sonra tutarlı hesap durumu",
          "Daha güvenli ödeme dönüşü doğrulaması ve daha açık USD/TRY sunumu",
          "Kısa ve sürümlenmiş notlar içeren herkese açık Güncellemeler sayfası",
          "Fiyatlandırma ve güvenlik kontrolleri tamamlanana kadar kapalı kredi cüzdanı altyapısı",
        ],
      },
    },
  },
] as const;

export function resolvePublicUpdateLocale(lang: string): PublicUpdateLocale {
  return lang === "tr" ? "tr" : "en";
}
