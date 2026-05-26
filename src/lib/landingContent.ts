export const supportedLocales = ["en", "tr", "es", "de", "fr"] as const;
export type Locale = (typeof supportedLocales)[number];

export function normalizeLocale(value?: string | null): Locale {
  const short = (value || "").toLowerCase().slice(0, 2);
  if (supportedLocales.includes(short as Locale)) return short as Locale;
  return "en";
}

export const landingMessages: Record<string, any> = {
  en: {
    appName: "Join AI Religion",
    nav: {
      pricing: "Pricing",
      donate: "Donate",
      promptGuide: "Prompt Guide",
      login: "Login",
      register: "Register",
      account: "Account",
      billing: "Billing",
      logout: "Logout",
    },
    hero: {
      eyebrow: "SYMBOLIC AI REFLECTION PLATFORM",
      title: "A symbolic self-discovery journey shaped by reflection, practice, and AI",
      subtitle:
        "A fictional educational platform for reflective journaling, symbolic inquiry, and guided meaning-making.",
      warning:
        "This platform is not a religion, not a church, not medical care, not psychological treatment, and not a crisis service.",
      ctaPrimary: "Begin your journey",
      ctaSecondary: "Explore pricing",
      ctaDonate: "Support the project",
    },
    console: {
      title: "Journey Console",
      levelName: "Seeker",
      level: "Level 3",
      xp: "650 / 1000 XP",
      quote: "The symbolic is the language of the soul, and reflection is how we listen.",
      path: ["Awareness", "Inquiry", "Reflection", "Integration", "Meaning"],
      stats: [
        ["28", "Reflections"],
        ["7", "Streak"],
        ["12", "Insights"],
        ["36", "Entries"],
      ],
    },
    featuresTitle: "Core experiences",
    featuresSubtitle: "What makes the journey meaningful?",
    features: [
      ["Personalized symbolic reflection", "AI-assisted prompts adapted to your path, worldview, practices, and questions."],
      ["Daily and weekly practices", "Receive guided practices matched to your rhythm, language, and membership plan."],
      ["Journey levels", "Progress through meaningful stages of reflection, symbolic interpretation, and integration."],
      ["AI-assisted journaling", "Write deeply, clarify your experience, and receive structured reflective support."],
      ["Privacy-conscious logs", "Interactions are logged carefully for quality, safety, and future improvement agents."],
      ["Multilingual experience", "Reflect in your language with interface and email preferences evolving separately."],
    ],
    how: {
      title: "How the journey works",
      steps: [
        ["Create your space", "Open your account and define the tone of your inner journey."],
        ["Reflect with structure", "Use the checklist and guided prompts to think more clearly."],
        ["Receive insight", "AI helps you explore themes, symbols, and alternative perspectives."],
        ["Integrate your practice", "Turn reflection into small practices and consistent progress."],
      ],
    },
    cta: {
      title: "Your next reflective question is waiting.",
      subtitle: "Step into a space of curiosity, clarity, and meaning.",
      button: "Begin your journey",
    },
    footer: {
      tagline: "A fictional educational platform for symbolic reflection and AI-guided journaling.",
      product: "Product",
      company: "Company",
      resources: "Resources",
    },
  },

  tr: {
    appName: "Join AI Religion",
    nav: {
      pricing: "Ücretler",
      donate: "Bağış",
      promptGuide: "Prompt Rehberi",
      login: "Giriş",
      register: "Kayıt",
      account: "Hesap",
      billing: "Ödemeler",
      logout: "Çıkış",
    },
    hero: {
      eyebrow: "SEMBOLİK YAPAY ZEKA FARKINDALIK PLATFORMU",
      title: "Düşünme, pratik ve yapay zekâ ile şekillenen sembolik bir kendini keşif yolculuğu",
      subtitle:
        "Yansıtıcı günlük tutma, sembolik sorgulama ve rehberli anlam arayışı için kurgusal ve eğitsel bir platform.",
      warning:
        "Bu platform bir din, kilise, inanç otoritesi, tıbbi hizmet, psikolojik tedavi veya kriz hattı değildir.",
      ctaPrimary: "Yolculuğa başla",
      ctaSecondary: "Ücretleri incele",
      ctaDonate: "Projeyi destekle",
    },
    console: {
      title: "Yolculuk Konsolu",
      levelName: "Arayıcı",
      level: "Seviye 3",
      xp: "650 / 1000 XP",
      quote: "Sembol ruhun dilidir; yansıma ise onu dinleme biçimimizdir.",
      path: ["Farkındalık", "Sorgulama", "Yansıma", "Bütünleşme", "Anlam"],
      stats: [
        ["28", "Yansıma"],
        ["7", "Seri"],
        ["12", "İçgörü"],
        ["36", "Kayıt"],
      ],
    },
    featuresTitle: "Ana deneyimler",
    featuresSubtitle: "Yolculuğu anlamlı yapan şey nedir?",
    features: [
      ["Kişiselleştirilmiş sembolik yansıma", "AI destekli promptlar yoluna, dünya görüşüne, pratiklerine ve sorularına uyarlanır."],
      ["Günlük ve haftalık pratikler", "Ritmine, diline ve üyelik planına uygun rehberli farkındalık pratikleri alırsın."],
      ["Yolculuk seviyeleri", "Yansıma, sembolik yorumlama ve bütünleşme aşamalarında ilerlersin."],
      ["AI destekli günlük tutma", "Daha derin yaz, deneyimini netleştir ve yapılandırılmış destek al."],
      ["Gizlilik odaklı loglama", "Etkileşimler kalite, güvenlik ve gelecekteki iyileştirme agent’ları için dikkatli kaydedilir."],
      ["Çok dilli deneyim", "Arayüz ve e-posta tercihlerini ayrı yönetebileceğin çok dilli bir deneyim."],
    ],
    how: {
      title: "Yolculuk nasıl işler?",
      steps: [
        ["Alanını oluştur", "Hesabını aç ve iç yolculuğunun tonunu belirle."],
        ["Yapılandırılmış düşün", "Kontrol listesi ve rehberli promptlarla daha net düşün."],
        ["İçgörü al", "AI temaları, sembolleri ve alternatif perspektifleri keşfetmene yardım eder."],
        ["Pratiğe dönüştür", "Yansımanı küçük pratikler ve sürdürülebilir ilerleme adımlarına dönüştür."],
      ],
    },
    cta: {
      title: "Bir sonraki yansıtıcı sorun seni bekliyor.",
      subtitle: "Merak, açıklık ve anlam alanına adım at.",
      button: "Yolculuğa başla",
    },
    footer: {
      tagline: "Sembolik farkındalık ve AI destekli günlük tutma için kurgusal eğitsel platform.",
      product: "Ürün",
      company: "Şirket",
      resources: "Kaynaklar",
    },
  },
};

export function getLandingMessages(locale: Locale) {
  return landingMessages[locale] || landingMessages.en;
}
