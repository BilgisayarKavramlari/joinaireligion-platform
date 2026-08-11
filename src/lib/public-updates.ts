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
    version: "v0.3.2",
    status: "planned",
    targetStart: "2026-08-11",
    targetWindow: { en: "Target: mid-August 2026", tr: "Hedef: Ağustos 2026 ortası" },
    copy: {
      en: {
        title: "Open distribution foundations",
        summary: "Independent, default-off integrations for publisher feeds, long-form platforms, opt-in messaging, approved communities, and decentralized relays.",
        highlights: [
          "Flipboard-ready RSS metadata with byline, fuller descriptions, and article imagery",
          "Canonical-source adapters for DEV, Apple News, Blogger, Tumblr, Hashnode, and Ghost",
          "Opt-in LINE broadcast plus approved-community locks for Lemmy, MediaWiki, and Fandom",
          "Nostr long-form events through an external signer and at least two relay acknowledgements",
        ],
      },
      tr: {
        title: "Açık dağıtım altyapısı",
        summary: "Yayıncı beslemeleri, uzun yazı platformları, izinli mesajlaşma, onaylı topluluklar ve merkeziyetsiz röleler için birbirinden bağımsız ve varsayılan olarak kapalı entegrasyonlar.",
        highlights: [
          "Yazar, daha uzun açıklama ve yazı görseli içeren Flipboard uyumlu RSS alanları",
          "DEV, Apple News, Blogger, Tumblr, Hashnode ve Ghost için ana kaynağı koruyan adaptörler",
          "İzinli LINE yayını ve Lemmy, MediaWiki ile Fandom için onaylı topluluk kilitleri",
          "Harici imzalayıcı ve en az iki röle onayı kullanan Nostr uzun yazı olayları",
        ],
      },
    },
  },
  {
    version: "v0.3.1",
    status: "released",
    releasedAt: "2026-08-11",
    copy: {
      en: {
        title: "Faster multilingual distribution with the same safety gates",
        summary: "A distribution release that lets administrators accelerate the existing reviewed content-to-social chain without weakening its limits.",
        highlights: [
          "One bounded action can run content drafting, independent publication review, social composition, and configured-provider delivery",
          "Every article keeps separate English, Turkish, Spanish, German, French, Arabic, Russian, and Simplified Chinese variants",
          "Daily publication limits, duplicate protection, provider switches, delivery logs, and no-engagement boundaries remain active",
          "Current autonomous destinations and setup-required channels are documented as separate queues",
        ],
      },
      tr: {
        title: "Aynı güvenlik kontrolleriyle daha hızlı çok dilli dağıtım",
        summary: "Mevcut incelenmiş içerikten sosyal kanallara uzanan zinciri sınırları zayıflatmadan hızlandıran dağıtım sürümü.",
        highlights: [
          "Tek bir sınırlı işlem; içerik taslağı, bağımsız yayın incelemesi, sosyal paketleme ve yapılandırılmış kanallara teslim adımlarını çalıştırabiliyor",
          "Her yazı İngilizce, Türkçe, İspanyolca, Almanca, Fransızca, Arapça, Rusça ve Basitleştirilmiş Çince ayrı sürümlerini koruyor",
          "Günlük yayın limiti, tekrar koruması, kanal anahtarları, teslimat kayıtları ve etkileşimsizlik sınırları aynen sürüyor",
          "Müdahalesiz hedefler ile kurulum gerektiren kanallar ayrı kuyruklar olarak belgelendi",
        ],
      },
    },
  },
  {
    version: "v0.3.0",
    status: "released",
    releasedAt: "2026-07-31",
    copy: {
      en: {
        title: "Private Meaning Map, installable PWA, and Reflective Video",
        summary: "A privacy-first reflection and media release designed for useful discovery without personal profiling.",
        highlights: [
          "An eight-language Meaning Map that works without an account and never sends answers or results to the server",
          "An installable PWA with a public offline shell that excludes account, private, authentication, and API routes",
          "A weekly Reflective Video agent that publishes only from reviewed public source material",
          "Mobile-safe navigation, direct MP4 playback, Media RSS, and a dedicated video sitemap",
        ],
      },
      tr: {
        title: "Özel Anlam Haritası, kurulabilir PWA ve Reflective Video",
        summary: "Kişisel profilleme yapmadan yararlı keşif sunmak için tasarlanan, gizlilik öncelikli düşünme ve medya sürümü.",
        highlights: [
          "Hesap gerektirmeyen ve yanıtları ya da sonuçları sunucuya göndermeyen sekiz dilli Anlam Haritası",
          "Hesap, özel alan, kimlik doğrulama ve API yollarını dışarıda bırakan herkese açık çevrimdışı kabuğa sahip kurulabilir PWA",
          "Yalnızca incelenmiş herkese açık kaynaklardan yayın yapan haftalık Reflective Video ajanı",
          "Mobil uyumlu gezinme, doğrudan MP4 oynatma, Media RSS ve özel video site haritası",
        ],
      },
    },
  },
  {
    version: "v0.2.3",
    status: "released",
    releasedAt: "2026-07-30",
    copy: {
      en: {
        title: "Personal themes, connected topics, and Reflective Audio",
        summary: "A visual and discovery release that makes the experience more personal and every published reflection easier to explore and hear.",
        highlights: [
          "Four device-persistent visual themes with accessible reduced-motion behavior",
          "A new responsive editorial hero image and calmer ambient animation layer",
          "Discover-ready large article images and public topic-cluster hubs",
          "A weekly Reflective Audio agent with a standards-based podcast RSS feed and explicit AI-voice disclosure",
        ],
      },
      tr: {
        title: "Kişisel temalar, bağlantılı konular ve Reflective Audio",
        summary: "Deneyimi kişiselleştiren; yayımlanan her düşünme yazısını keşfetmeyi ve dinlemeyi kolaylaştıran görsel ve içerik keşfi sürümü.",
        highlights: [
          "Cihazda kalıcı dört görsel tema ve erişilebilir hareket azaltma davranışı",
          "Yeni duyarlı editoryal ana görsel ve daha sakin ortam animasyonları",
          "Discover uyumlu büyük yazı görselleri ve herkese açık konu kümesi merkezleri",
          "Standartlara uygun podcast RSS’i ve açık AI-ses bildirimi sunan haftalık Reflective Audio ajanı",
        ],
      },
    },
  },
  {
    version: "v0.2.2",
    status: "released",
    releasedAt: "2026-07-30",
    copy: {
      en: {
        title: "Clear billing records and a steadier learning journey",
        summary: "A reliability and presentation release for payments, personalized lessons, multilingual insights, and social publishing.",
        highlights: [
          "Account payment history now shows real amounts, statuses, and Stripe receipts",
          "Personalized lessons are idempotent and historical duplicate steps appear only once",
          "Lesson headings, paragraphs, phases, and inline emphasis render cleanly",
          "Insights follow the selected language, while Instagram uses English-first 4:5 visual publishing",
        ],
      },
      tr: {
        title: "Açık ödeme kayıtları ve daha istikrarlı öğrenme yolculuğu",
        summary: "Ödemeler, kişiselleştirilmiş dersler, çok dilli içgörüler ve sosyal yayınlar için güvenilirlik ve sunum sürümü.",
        highlights: [
          "Hesap ödeme geçmişi artık gerçek tutarları, durumları ve Stripe makbuzlarını gösteriyor",
          "Kişiselleştirilmiş dersler tekilleştirildi; geçmişteki çift adımlar arayüzde yalnızca bir kez görünüyor",
          "Ders başlıkları, paragrafları, aşamaları ve satır içi vurgular temiz biçimde görüntüleniyor",
          "İçgörüler seçili dili izliyor; Instagram İngilizce öncelikli 4:5 görsellerle yayın yapıyor",
        ],
      },
    },
  },
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
