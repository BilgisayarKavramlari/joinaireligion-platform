export const supportedLocales = ["en", "tr", "es", "de", "fr", "ru", "zh"] as const;
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
      promptGuide: "Your Journey",
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
      promptGuide: "Yolculuğunuz",
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

  ru: {
    appName: "Join AI Religion",
    nav: { pricing: "Тарифы", donate: "Поддержать", promptGuide: "Ваш путь", login: "Войти", register: "Регистрация", account: "Аккаунт", billing: "Платежи", logout: "Выйти" },
    hero: {
      eyebrow: "ПЛАТФОРМА СИМВОЛИЧЕСКОЙ РЕФЛЕКСИИ С ИИ",
      title: "Путь самопознания через размышление, практику и искусственный интеллект",
      subtitle: "Вымышленная образовательная платформа для рефлексивного дневника, символического исследования и осмысленного поиска.",
      warning: "Это не религия, не церковь, не медицинская помощь, не психологическое лечение и не кризисная служба.",
      ctaPrimary: "Начать путь", ctaSecondary: "Посмотреть тарифы", ctaDonate: "Поддержать проект",
    },
    console: {
      title: "Панель пути", levelName: "Исследователь", level: "Уровень 3", xp: "650 / 1000 XP",
      quote: "Символ — язык внутреннего опыта, а рефлексия помогает его услышать.",
      path: ["Осознание", "Исследование", "Рефлексия", "Интеграция", "Смысл"],
      stats: [["28", "Размышления"], ["7", "Дней подряд"], ["12", "Наблюдения"], ["36", "Записи"]],
    },
    featuresTitle: "Основные возможности", featuresSubtitle: "Что делает путь содержательным?",
    features: [
      ["Персонализированная рефлексия", "Подсказки с поддержкой ИИ учитывают ваш путь, мировоззрение, практики и вопросы."],
      ["Ежедневные и еженедельные практики", "Получайте практики, соответствующие вашему ритму, языку и плану."],
      ["Уровни пути", "Проходите этапы рефлексии, символической интерпретации и интеграции."],
      ["Дневник с поддержкой ИИ", "Пишите глубже, проясняйте опыт и получайте структурированную поддержку."],
      ["Конфиденциальность", "Взаимодействия аккуратно журналируются для качества, безопасности и улучшения."],
      ["Многоязычный опыт", "Отдельно управляйте языком интерфейса и электронной почты."],
    ],
    how: { title: "Как работает путь", steps: [["Создайте своё пространство", "Откройте аккаунт и задайте направление внутренней работы."], ["Размышляйте структурированно", "Используйте вопросы и подсказки, чтобы мыслить яснее."], ["Получайте наблюдения", "ИИ помогает исследовать темы, символы и альтернативные точки зрения."], ["Интегрируйте практику", "Превращайте размышления в небольшие устойчивые действия."]] },
    cta: { title: "Следующий вопрос для размышления уже ждёт вас.", subtitle: "Войдите в пространство любопытства, ясности и смысла.", button: "Начать путь" },
    footer: { tagline: "Вымышленная образовательная платформа для символической рефлексии и дневника с поддержкой ИИ.", product: "Продукт", company: "Компания", resources: "Ресурсы" },
  },

  zh: {
    appName: "Join AI Religion",
    nav: { pricing: "会员方案", donate: "支持项目", promptGuide: "你的旅程", login: "登录", register: "注册", account: "账户", billing: "账单", logout: "退出" },
    hero: {
      eyebrow: "AI 符号反思平台",
      title: "由反思、练习和人工智能塑造的自我探索旅程",
      subtitle: "一个用于反思性书写、符号探索和引导式意义建构的虚构教育平台。",
      warning: "本平台不是宗教、教会、医疗服务、心理治疗或危机干预服务。",
      ctaPrimary: "开始旅程", ctaSecondary: "查看方案", ctaDonate: "支持项目",
    },
    console: {
      title: "旅程面板", levelName: "探索者", level: "第 3 级", xp: "650 / 1000 XP",
      quote: "符号承载内在经验，而反思帮助我们倾听它。",
      path: ["觉察", "探究", "反思", "整合", "意义"],
      stats: [["28", "反思"], ["7", "连续天数"], ["12", "洞见"], ["36", "记录"]],
    },
    featuresTitle: "核心体验", featuresSubtitle: "是什么让这段旅程更有意义？",
    features: [
      ["个性化符号反思", "AI 辅助提示会根据你的道路、世界观、练习和问题进行调整。"],
      ["每日与每周练习", "获得符合你的节奏、语言和会员方案的引导练习。"],
      ["旅程等级", "逐步完成反思、符号理解和整合阶段。"],
      ["AI 辅助书写", "更深入地书写、澄清体验并获得结构化支持。"],
      ["注重隐私的记录", "仅为质量、安全和改进而谨慎记录必要信息。"],
      ["多语言体验", "分别管理界面语言和邮件语言。"],
    ],
    how: { title: "旅程如何进行", steps: [["创建你的空间", "开设账户并确定内在旅程的方向。"], ["进行结构化反思", "使用问题和引导提示让思考更清晰。"], ["获得新的观察", "AI 帮助你探索主题、符号和不同视角。"], ["将反思融入实践", "把思考转化为可持续的小练习和进步。"]] },
    cta: { title: "下一个反思问题正在等待你。", subtitle: "进入一个充满好奇、清晰与意义的空间。", button: "开始旅程" },
    footer: { tagline: "一个用于符号反思和 AI 辅助书写的虚构教育平台。", product: "产品", company: "公司", resources: "资源" },
  },
};

export function getLandingMessages(locale: Locale) {
  return landingMessages[locale] || landingMessages.en;
}
