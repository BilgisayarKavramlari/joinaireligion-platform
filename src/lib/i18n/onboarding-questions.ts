/**
 * Localised onboarding question definitions.
 *
 * Design principles
 * -----------------
 * 1. Each select option carries a stable `value` — the English identifier that
 *    is persisted to the database regardless of the user's display language.
 * 2. The `label` is the locale-specific display string shown in the UI.
 * 3. `text` and `hint` are fully localised per language.
 * 4. Languages without a full translation fall back to English.
 * 5. The language-selector and acknowledge questions are handled inline in the
 *    page component and are not defined here.
 *
 * Adding a new language
 * ----------------------
 * Add an entry to TRANSLATIONS with the same keys as `en`. Only the keys you
 * provide override the English fallback; missing keys remain in English.
 */

import type { LangCode } from "@/lib/i18n/dict";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  /** Stable English identifier — saved to the database. Never changes. */
  value: string;
  /** Locale-specific display label shown in the UI. */
  label: string;
}

export interface QuestionDef {
  key: string;
  type: "select" | "textarea";
  text: string;
  hint: string;
  options?: SelectOption[];
}

export const REQUIRED_ONBOARDING_QUESTION_KEYS = [
  "tradition",
  "relationship",
  "draw",
  "preferred_language",
  "conflict",
  "higher_power",
  "practice",
  "obstacle",
  "awakening",
  "silence",
  "community",
  "meaning_channel",
  "question",
  "intent",
  "practice_style",
  "sensitivity_boundaries",
  "email_cadence_consent",
  "safety_acknowledgement",
] as const;

// ─── Stable option values (English, saved to DB) ──────────────────────────────

const OPTIONS = {
  tradition: [
    "Christianity", "Islam", "Judaism", "Buddhism", "Hinduism", "Taoism",
    "Sufism", "Hermeticism / Esotericism", "Shamanism / Indigenous",
    "Rationalism / Secular", "Agnostic / Uncertain", "Atheism", "Other / Eclectic",
  ],
  relationship: [
    "Deeply committed and practicing",
    "Curious but not yet committed",
    "Questioning my inherited tradition",
    "Exploring new perspectives",
    "Skeptical but open",
    "Disconnected — looking for meaning",
    "Returning after a period away",
    "Just starting for the first time",
  ],
  conflict: [
    "Seek solitude and reflect",
    "Talk it through with someone I trust",
    "Distract myself with activity",
    "Pray, meditate, or engage in practice",
    "Analyze the situation logically",
    "Push through and keep moving",
    "Seek guidance from a text or teaching",
    "Surrender to what is",
  ],
  practice: [
    "Daily meditation or contemplation",
    "Regular prayer or devotion",
    "Journaling or self-reflection writing",
    "Study of sacred or philosophical texts",
    "Yoga or body-based practice",
    "Community ritual or worship",
    "None yet — I am beginning",
    "Multiple practices",
  ],
  silence: [
    "Very comfortable — I seek it",
    "Somewhat comfortable",
    "Neutral",
    "Slightly uncomfortable — my mind races",
    "Quite uncomfortable",
    "I actively avoid it",
  ],
  community: [
    "Central — I cannot grow without others",
    "Important but not essential",
    "Nice to have occasionally",
    "Not important for my path",
    "I prefer to walk alone",
    "I have not yet found my community",
  ],
  meaning_channel: [
    "Through reason, logic and inquiry",
    "Through emotion and felt experience",
    "Through the body — sensation, movement",
    "Through imagination, symbols and dreams",
    "Through direct silence or awareness",
    "Through relationships and love",
    "Through nature and the cosmos",
    "Through creative expression",
  ],
  intent: [
    "Learning — I want to understand traditions and teachings",
    "Reflection — I want to turn inward and examine my life",
    "Meditation — I want to develop stillness and awareness",
    "Comparison — I want to explore multiple traditions side by side",
    "Self-discovery — I want to understand who I am at a deeper level",
    "All of the above — I am open to the full journey",
  ],
  practice_style: [
    "Reading — I engage most through text, stories and teachings",
    "Journaling — I process through writing and self-reflection",
    "Meditation — I find clarity in silence and awareness",
    "Prayer-like reflection — I prefer devotional or contemplative forms",
    "Philosophical inquiry — I thrive when questioning and reasoning",
    "Mixed — I want variety depending on the day",
  ],
  sensitivity_boundaries: [
    "No boundaries — I am open to all content",
    "Please avoid strong claims about God's existence",
    "Please avoid content involving death and afterlife imagery",
    "Please avoid content that may trigger grief or loss",
    "Please avoid content referencing trauma or abuse",
    "Please keep practices secular-adjacent — minimal religious language",
    "Other (I will describe in my first dialogue)",
  ],
  email_cadence_consent: [
    "Daily — I want a practice every morning",
    "Weekly — I prefer one thoughtful practice each week",
    "I prefer not to receive email practices (I will log in directly)",
  ],
} as const;

// ─── Translations ─────────────────────────────────────────────────────────────

interface QuestionTranslation {
  text: string;
  hint: string;
  options?: string[]; // parallel to OPTIONS[key]; same length
}

type TranslationMap = Partial<Record<keyof typeof OPTIONS | "draw" | "higher_power" | "obstacle" | "awakening" | "question", QuestionTranslation>>;

const TRANSLATIONS: Partial<Record<LangCode, TranslationMap>> = {
  en: {
    tradition: {
      text: "What is your spiritual background or primary tradition?",
      hint: "Select the path closest to your upbringing or current orientation.",
      options: [
        "Christianity", "Islam", "Judaism", "Buddhism", "Hinduism", "Taoism",
        "Sufism", "Hermeticism / Esotericism", "Shamanism / Indigenous",
        "Rationalism / Secular", "Agnostic / Uncertain", "Atheism", "Other / Eclectic",
      ],
    },
    relationship: {
      text: "How would you describe your relationship with spirituality right now?",
      hint: "Be honest — there is no wrong answer here.",
      options: [
        "Deeply committed and practicing",
        "Curious but not yet committed",
        "Questioning my inherited tradition",
        "Exploring new perspectives",
        "Skeptical but open",
        "Disconnected — looking for meaning",
        "Returning after a period away",
        "Just starting for the first time",
      ],
    },
    draw: {
      text: "What draws you to explore this path at this moment in your life?",
      hint: "Write freely — this is for your eyes and your guide.",
    },
    conflict: {
      text: "When you face inner conflict or difficulty, what is your first instinct?",
      hint: "Think of a real recent example if it helps.",
      options: [
        "Seek solitude and reflect",
        "Talk it through with someone I trust",
        "Distract myself with activity",
        "Pray, meditate, or engage in practice",
        "Analyze the situation logically",
        "Push through and keep moving",
        "Seek guidance from a text or teaching",
        "Surrender to what is",
      ],
    },
    higher_power: {
      text: "How do you relate to the concept of a higher power, source, or ultimate reality?",
      hint: "Express this in your own terms — there is no required answer.",
    },
    practice: {
      text: "What practice or discipline, if any, do you already maintain?",
      hint: "Meditation, prayer, journaling, ritual, exercise, study — anything counts.",
      options: [
        "Daily meditation or contemplation",
        "Regular prayer or devotion",
        "Journaling or self-reflection writing",
        "Study of sacred or philosophical texts",
        "Yoga or body-based practice",
        "Community ritual or worship",
        "None yet — I am beginning",
        "Multiple practices",
      ],
    },
    obstacle: {
      text: "What is the greatest obstacle in your inner life that you wish to overcome?",
      hint: "Doubt, fear, restlessness, pride, grief, confusion — name it honestly.",
    },
    awakening: {
      text: "What does 'awakening' or 'inner growth' mean to you in your own words?",
      hint: "Your definition matters — not any tradition's definition.",
    },
    silence: {
      text: "How comfortable are you with silence and solitude?",
      hint: "Consider how you feel when left alone without distraction.",
      options: [
        "Very comfortable — I seek it",
        "Somewhat comfortable",
        "Neutral",
        "Slightly uncomfortable — my mind races",
        "Quite uncomfortable",
        "I actively avoid it",
      ],
    },
    community: {
      text: "What role does community and shared ritual play in your life?",
      hint: "Community does not need to be religious — it can be any gathering of meaning.",
      options: [
        "Central — I cannot grow without others",
        "Important but not essential",
        "Nice to have occasionally",
        "Not important for my path",
        "I prefer to walk alone",
        "I have not yet found my community",
      ],
    },
    meaning_channel: {
      text: "How do you most naturally experience meaning or truth?",
      hint: "Which channel feels most alive for you?",
      options: [
        "Through reason, logic and inquiry",
        "Through emotion and felt experience",
        "Through the body — sensation, movement",
        "Through imagination, symbols and dreams",
        "Through direct silence or awareness",
        "Through relationships and love",
        "Through nature and the cosmos",
        "Through creative expression",
      ],
    },
    question: {
      text: "What is the one question about existence, purpose, or the sacred that you most want to explore on this journey?",
      hint: "Write your deepest, most honest question. This will guide your entire path.",
    },
    intent: {
      text: "What are you primarily seeking through this practice platform?",
      hint: "This shapes the type of content and practices you receive.",
      options: [
        "Learning — I want to understand traditions and teachings",
        "Reflection — I want to turn inward and examine my life",
        "Meditation — I want to develop stillness and awareness",
        "Comparison — I want to explore multiple traditions side by side",
        "Self-discovery — I want to understand who I am at a deeper level",
        "All of the above — I am open to the full journey",
      ],
    },
    practice_style: {
      text: "Which style of practice resonates most with you?",
      hint: "Your practices will be designed around your preferred mode of engagement.",
      options: [
        "Reading — I engage most through text, stories and teachings",
        "Journaling — I process through writing and self-reflection",
        "Meditation — I find clarity in silence and awareness",
        "Prayer-like reflection — I prefer devotional or contemplative forms",
        "Philosophical inquiry — I thrive when questioning and reasoning",
        "Mixed — I want variety depending on the day",
      ],
    },
    sensitivity_boundaries: {
      text: "Are there any topics or approaches you would prefer to avoid in your practice content?",
      hint: "For example: graphic descriptions of death, strong theological claims, trauma-adjacent content. Your boundaries are respected.",
      options: [
        "No boundaries — I am open to all content",
        "Please avoid strong claims about God's existence",
        "Please avoid content involving death and afterlife imagery",
        "Please avoid content that may trigger grief or loss",
        "Please avoid content referencing trauma or abuse",
        "Please keep practices secular-adjacent — minimal religious language",
        "Other (I will describe in my first dialogue)",
      ],
    },
    email_cadence_consent: {
      text: "How often would you like to receive practice messages by email?",
      hint: "You can change this any time from your account settings.",
      options: [
        "Daily — I want a practice every morning",
        "Weekly — I prefer one thoughtful practice each week",
        "I prefer not to receive email practices (I will log in directly)",
      ],
    },
  },

  tr: {
    tradition: {
      text: "Ruhsal geçmişiniz veya birincil geleneğiniz nedir?",
      hint: "Yetiştiğiniz ortama veya mevcut yöneliminize en yakın yolu seçin.",
      options: [
        "Hristiyanlık", "İslam", "Yahudilik", "Budizm", "Hinduizm", "Taoizm",
        "Sufizm", "Hermetizm / Ezoterizm", "Şamanizm / Yerli Gelenekler",
        "Akılcılık / Laik", "Agnostik / Belirsiz", "Ateizm", "Diğer / Eklektik",
      ],
    },
    relationship: {
      text: "Şu anda ruhsallıkla ilişkinizi nasıl tanımlarsınız?",
      hint: "Dürüst olun — burada yanlış bir cevap yoktur.",
      options: [
        "Derinden bağlı ve pratik yapıyorum",
        "Meraklıyım ama henüz bağlı değilim",
        "Miras aldığım geleneği sorgulamaktayım",
        "Yeni bakış açıları keşfediyorum",
        "Şüpheciyim ama açığım",
        "Kopmuş hissediyorum — anlam arıyorum",
        "Bir süre uzak kaldıktan sonra geri dönüyorum",
        "İlk kez başlıyorum",
      ],
    },
    draw: {
      text: "Hayatınızın bu anında bu yolu keşfetmeye sizi ne çekiyor?",
      hint: "Özgürce yazın — bu sizin ve rehberiniz içindir.",
    },
    conflict: {
      text: "İç çatışma veya zorluklarla karşılaştığınızda ilk içgüdünüz ne oluyor?",
      hint: "Yardımcı oluyorsa yakın zamandan gerçek bir örnek düşünün.",
      options: [
        "Yalnızlık arayıp düşünmek",
        "Güvendiğim biriyle konuşmak",
        "Etkinliklerle dikkatimi dağıtmak",
        "Dua etmek, meditasyon yapmak veya pratikle meşgul olmak",
        "Durumu mantıksal olarak analiz etmek",
        "İleriye devam etmek",
        "Bir metinden veya öğretiden rehberlik aramak",
        "Olana teslim olmak",
      ],
    },
    higher_power: {
      text: "Yüce güç, kaynak veya nihai gerçeklik kavramıyla nasıl ilişki kuruyorsunuz?",
      hint: "Bunu kendi terimlerinizle ifade edin — zorunlu bir cevap yoktur.",
    },
    practice: {
      text: "Varsa, hâlihazırda sürdürdüğünüz pratik veya disiplin nedir?",
      hint: "Meditasyon, dua, günlük tutma, ritüel, egzersiz, çalışma — her şey geçerli.",
      options: [
        "Günlük meditasyon veya tefekkür",
        "Düzenli dua veya ibadet",
        "Günlük tutma veya öz-yansıma yazısı",
        "Kutsal veya felsefi metinlerin incelenmesi",
        "Yoga veya beden temelli pratik",
        "Topluluk ritüeli veya ibadet",
        "Henüz yok — başlıyorum",
        "Birden fazla pratik",
      ],
    },
    obstacle: {
      text: "İç dünyanızdaki aşmak istediğiniz en büyük engel nedir?",
      hint: "Şüphe, korku, huzursuzluk, gurur, keder, karışıklık — dürüstçe adlandırın.",
    },
    awakening: {
      text: "'Uyanış' veya 'iç büyüme' sizin için kendi sözlerinizle ne anlama geliyor?",
      hint: "Sizin tanımınız önemlidir — herhangi bir geleneğin tanımı değil.",
    },
    silence: {
      text: "Sessizlik ve yalnızlıkla ne kadar rahat hissediyorsunuz?",
      hint: "Dikkat dağıtıcı unsurlar olmadan yalnız bırakıldığınızda nasıl hissettiğinizi düşünün.",
      options: [
        "Çok rahat — bunu arıyorum",
        "Oldukça rahat",
        "Nötr",
        "Biraz rahatsız — zihnin dağılıyor",
        "Oldukça rahatsız",
        "Aktif olarak bundan kaçınıyorum",
      ],
    },
    community: {
      text: "Topluluk ve ortak ritüel hayatınızda ne rol oynuyor?",
      hint: "Topluluk dinî olmak zorunda değil — anlam taşıyan herhangi bir buluşma olabilir.",
      options: [
        "Merkezi — başkalar olmadan büyüyemem",
        "Önemli ama zorunlu değil",
        "Zaman zaman güzel",
        "Yolum için önemli değil",
        "Yalnız yürümeyi tercih ederim",
        "Henüz topluluğumu bulamadım",
      ],
    },
    meaning_channel: {
      text: "Anlam veya gerçeği en doğal olarak nasıl deneyimliyorsunuz?",
      hint: "Hangi kanal sizin için en canlı hissettiriyor?",
      options: [
        "Akıl, mantık ve sorgulama yoluyla",
        "Duygu ve hissedilen deneyim yoluyla",
        "Beden yoluyla — duyum, hareket",
        "Hayal gücü, semboller ve rüyalar yoluyla",
        "Doğrudan sessizlik veya farkındalık yoluyla",
        "İlişkiler ve sevgi yoluyla",
        "Doğa ve kozmos yoluyla",
        "Yaratıcı ifade yoluyla",
      ],
    },
    question: {
      text: "Bu yolculukta en çok keşfetmek istediğiniz varoluş, amaç veya kutsalla ilgili tek soru nedir?",
      hint: "En derin, en dürüst sorunuzu yazın. Bu tüm yolunuza rehberlik edecek.",
    },
    intent: {
      text: "Bu pratik platformda öncelikle ne arıyorsunuz?",
      hint: "Bu, alacağınız içerik ve pratik türünü şekillendirir.",
      options: [
        "Öğrenme — gelenekleri ve öğretileri anlamak istiyorum",
        "Yansıma — içe dönmek ve hayatımı incelemek istiyorum",
        "Meditasyon — durgunluk ve farkındalık geliştirmek istiyorum",
        "Karşılaştırma — birden fazla geleneği yan yana keşfetmek istiyorum",
        "Öz-keşif — daha derin bir düzeyde kim olduğumu anlamak istiyorum",
        "Hepsi — tam yolculuğa açığım",
      ],
    },
    practice_style: {
      text: "Hangi pratik stili sizin için en çok yankı uyandırıyor?",
      hint: "Pratikleriniz tercih ettiğiniz katılım moduna göre tasarlanacak.",
      options: [
        "Okuma — en çok metin, hikâye ve öğretiler aracılığıyla bağlanıyorum",
        "Günlük tutma — yazma ve öz-yansıma yoluyla işliyorum",
        "Meditasyon — sessizlik ve farkındalıkta netlik buluyorum",
        "Duaya benzer yansıma — adanmış veya tefekkür biçimlerini tercih ederim",
        "Felsefi sorgulama — sorgulama ve akıl yürütürken gelişiyorum",
        "Karışık — güne göre çeşitlilik istiyorum",
      ],
    },
    sensitivity_boundaries: {
      text: "Pratik içeriğinizde kaçınmayı tercih edeceğiniz konular veya yaklaşımlar var mı?",
      hint: "Örneğin: ölümün grafik açıklamaları, güçlü teolojik iddialar, travma bağlantılı içerik. Sınırlarınıza saygı duyulur.",
      options: [
        "Sınır yok — tüm içeriğe açığım",
        "Lütfen Tanrı'nın varlığıyla ilgili güçlü iddialardan kaçının",
        "Lütfen ölüm ve ahiret görüntüleri içeren içerikten kaçının",
        "Lütfen yas veya kayıpla ilgili içerikten kaçının",
        "Lütfen travma veya istismara atıfta bulunan içerikten kaçının",
        "Lütfen pratikleri laik ağırlıklı tutun — minimal dini dil",
        "Diğer (ilk diyalogumda açıklayacağım)",
      ],
    },
    email_cadence_consent: {
      text: "E-posta ile pratik mesajlarını ne sıklıkla almak istersiniz?",
      hint: "Bunu hesap ayarlarınızdan istediğiniz zaman değiştirebilirsiniz.",
      options: [
        "Günlük — her sabah bir pratik istiyorum",
        "Haftalık — haftada bir düşünceli pratik tercih ederim",
        "E-posta pratikleri almamayı tercih ederim (doğrudan giriş yapacağım)",
      ],
    },
  },
};

// ─── Fallback helper ──────────────────────────────────────────────────────────

function getTranslation(lang: LangCode, key: string): QuestionTranslation | undefined {
  const t = TRANSLATIONS[lang];
  if (t) {
    const entry = (t as Record<string, QuestionTranslation | undefined>)[key];
    if (entry) return entry;
  }
  // Fall back to English
  const en = TRANSLATIONS.en;
  if (en) return (en as Record<string, QuestionTranslation | undefined>)[key];
  return undefined;
}

// ─── Build localised option list ──────────────────────────────────────────────

function buildOptions(
  optionValues: readonly string[],
  localLabels: string[] | undefined,
): SelectOption[] {
  return optionValues.map((value, i) => ({
    value,
    label: localLabels?.[i] ?? value,
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns the full onboarding question list localised to `lang`.
 * The language-selector and safety-acknowledgement questions are handled
 * separately in the page component and are not included here.
 *
 * Option `value` fields are always stable English identifiers.
 * Option `label` fields are the locale-specific display strings.
 */
export function getQuestions(lang: LangCode): QuestionDef[] {
  function q(
    key: string,
    type: QuestionDef["type"],
    optionValues?: readonly string[],
  ): QuestionDef {
    const t = getTranslation(lang, key);
    const text = t?.text ?? key;
    const hint = t?.hint ?? "";

    if (type === "select" && optionValues) {
      return {
        key, type, text, hint,
        options: buildOptions(optionValues, t?.options),
      };
    }
    return { key, type, text, hint };
  }

  return [
    q("tradition",             "select",   OPTIONS.tradition),
    q("relationship",          "select",   OPTIONS.relationship),
    // language question inserted by the page after "relationship"
    q("draw",                  "textarea"),
    q("conflict",              "select",   OPTIONS.conflict),
    q("higher_power",          "textarea"),
    q("practice",              "select",   OPTIONS.practice),
    q("obstacle",              "textarea"),
    q("awakening",             "textarea"),
    q("silence",               "select",   OPTIONS.silence),
    q("community",             "select",   OPTIONS.community),
    q("meaning_channel",       "select",   OPTIONS.meaning_channel),
    q("question",              "textarea"),
    q("intent",                "select",   OPTIONS.intent),
    q("practice_style",        "select",   OPTIONS.practice_style),
    q("sensitivity_boundaries","select",   OPTIONS.sensitivity_boundaries),
    q("email_cadence_consent", "select",   OPTIONS.email_cadence_consent),
    // safety_acknowledgement question inserted by the page at the end
  ];
}
