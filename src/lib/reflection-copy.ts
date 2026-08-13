export type ReflectionLocale = "en" | "tr" | "es" | "de" | "fr" | "ar" | "ru" | "zh";

type ReflectionCopy = {
  nav: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  guestBody: string;
  lessonMode: string;
  lessonModeDesc: string;
  lifeMode: string;
  lifeModeDesc: string;
  privateByDefault: string;
  memberOnly: string;
  startFree: string;
  signIn: string;
  chooseLesson: string;
  questionPlaceholder: string;
  consent: string;
  send: string;
  sending: string;
  newSession: string;
  nextStepLabel: string;
  quota: string;
  sessionQuota: string;
  notAuthority: string;
  notMonitored: string;
  helpful: string;
  notHelpful: string;
  deleteHistory: string;
  deleteConfirm: string;
  deleted: string;
  upgrade: string;
  examples: Array<{ q: string; a: string }>;
};

const EN: ReflectionCopy = {
  nav: "Ask & Reflect",
  eyebrow: "REFLECTION COMPANION",
  title: "Ask what the lesson did not answer.",
  subtitle: "A private AI companion that helps you examine a question—not decide what you must believe.",
  guestBody: "Live questions are available only to verified members. Create a free account for one guided lesson session and three turns each day.",
  lessonMode: "Lesson Companion",
  lessonModeDesc: "Explore one of your lessons with grounded, guiding questions.",
  lifeMode: "Life Reflection",
  lifeModeDesc: "Clarify values, options, trade-offs, and a small reversible next step. Initiate only.",
  privateByDefault: "Your question and answer are not stored by Join AI Religion. Only text-free safety and usage metrics are retained.",
  memberOnly: "Member-only live questions",
  startFree: "Create a free account",
  signIn: "Sign in",
  chooseLesson: "Choose a lesson",
  questionPlaceholder: "What would you like to understand more clearly?",
  consent: "I understand that my question and the visible conversation context are sent to OpenAI to generate this response. Join AI Religion does not save the text; OpenAI may retain abuse-monitoring logs for up to 30 days under its API policy unless stronger account controls apply. This is not religious, medical, psychological, legal, or financial advice.",
  send: "Ask",
  sending: "Reflecting…",
  newSession: "New session",
  nextStepLabel: "Next step",
  quota: "Daily turns: {used}/{limit}",
  sessionQuota: "Guided sessions: {used}/{limit}",
  notAuthority: "AI-generated reflection · not a religious or professional authority",
  notMonitored: "Not monitored live. In immediate danger, contact local emergency services.",
  helpful: "Helpful",
  notHelpful: "Not helpful",
  deleteHistory: "Delete legacy AI history",
  deleteConfirm: "Delete all older stored AI questions and privacy-minimized dialogue metadata? This cannot be undone.",
  deleted: "AI history deleted.",
  upgrade: "Unlock Life Reflection with Initiate",
  examples: [
    { q: "How is uncertainty treated in this lesson?", a: "The companion points back to the lesson, separates evidence from interpretation, and asks one question that helps you form your own view." },
    { q: "How can I compare two perspectives without ranking them?", a: "It can surface assumptions, shared values, and meaningful differences without declaring one tradition superior." },
    { q: "I am stuck between two choices.", a: "Initiate members can use Life Reflection to clarify values and reversible next steps—without the AI making the decision." },
  ],
};

const COPIES: Record<ReflectionLocale, ReflectionCopy> = {
  en: EN,
  tr: {
    ...EN,
    nav: "Sor & Düşün", eyebrow: "REFLEKSİYON REHBERİ", title: "Dersin cevaplamadığı şeyi sor.",
    subtitle: "Neye inanmanız gerektiğini söylemeyen; sorunuzu daha dikkatli incelemenize yardımcı olan özel bir AI eşlikçisi.",
    guestBody: "Canlı sorular yalnızca doğrulanmış üyelere açıktır. Ücretsiz hesapla her gün bir ders oturumu ve üç mesaj kullanabilirsiniz.",
    lessonMode: "Ders Rehberi", lessonModeDesc: "Derslerinizden birini, kaynağa bağlı yönlendirici sorularla inceleyin.",
    lifeMode: "Hayat Refleksiyonu", lifeModeDesc: "Değerleri, seçenekleri, dengeleri ve küçük geri alınabilir bir adımı netleştirin. Yalnızca Initiate.",
    privateByDefault: "Sorunuz ve yanıtınız Join AI Religion tarafından saklanmaz. Yalnızca metin içermeyen güvenlik ve kullanım ölçümleri tutulur.",
    memberOnly: "Canlı sorular yalnızca üyelere açık", startFree: "Ücretsiz hesap oluştur", signIn: "Giriş yap",
    chooseLesson: "Bir ders seçin", questionPlaceholder: "Neyi daha açık anlamak istiyorsunuz?",
    consent: "Sorumu ve ekranda görünen konuşma bağlamını bu yanıtı üretmesi için OpenAI'a gönderdiğimi anlıyorum. Join AI Religion metni kaydetmez; OpenAI, daha güçlü hesap kontrolleri uygulanmıyorsa API politikası kapsamında kötüye kullanım izleme kayıtlarını 30 güne kadar tutabilir. Bu dini, tıbbi, psikolojik, hukuki veya finansal tavsiye değildir.",
    send: "Sor", sending: "Düşünüyor…", newSession: "Yeni oturum", nextStepLabel: "Sonraki adım", quota: "Günlük mesaj: {used}/{limit}", sessionQuota: "Yönlendirmeli oturum: {used}/{limit}",
    notAuthority: "AI üretimi refleksiyon · dini veya profesyonel otorite değildir", notMonitored: "Canlı izlenmez. Yakın tehlikede yerel acil hizmetlere başvurun.",
    helpful: "Yararlı", notHelpful: "Yararlı değil", deleteHistory: "Eski AI geçmişini sil", deleteConfirm: "Daha önce saklanmış tüm AI soruları ve metinsiz diyalog ölçümleri silinsin mi? Bu işlem geri alınamaz.",
    deleted: "AI geçmişi silindi.", upgrade: "Hayat Refleksiyonu için Initiate'a geç",
    examples: [
      { q: "Bu derste belirsizlik nasıl ele alınıyor?", a: "Rehber derse geri döner, kanıtla yorumu ayırır ve kendi görüşünüzü oluşturmanıza yardım eden tek bir soru sorar." },
      { q: "İki bakış açısını sıralamadan nasıl karşılaştırabilirim?", a: "Bir geleneği üstün ilan etmeden varsayımları, ortak değerleri ve anlamlı farkları görünür kılar." },
      { q: "İki seçim arasında kaldım.", a: "Initiate üyeleri, kararı AI'a bırakmadan değerleri ve geri alınabilir sonraki adımları netleştirebilir." },
    ],
  },
  es: { ...EN, nav: "Pregunta y reflexiona", eyebrow: "COMPAÑERO DE REFLEXIÓN", title: "Pregunta lo que la lección no respondió.", subtitle: "Un compañero privado de IA que te ayuda a examinar una pregunta, no a decidir qué debes creer.", guestBody: "Las preguntas en vivo son solo para miembros verificados. La cuenta gratuita incluye una sesión de lección y tres turnos diarios.", lessonMode: "Compañero de lección", lifeMode: "Reflexión vital", chooseLesson: "Elige una lección", questionPlaceholder: "¿Qué te gustaría comprender con más claridad?", send: "Preguntar", sending: "Reflexionando…", newSession: "Nueva sesión", nextStepLabel: "Siguiente paso", helpful: "Útil", notHelpful: "No útil", startFree: "Crear cuenta gratis", signIn: "Iniciar sesión" },
  de: { ...EN, nav: "Fragen & reflektieren", eyebrow: "REFLEXIONSBEGLEITER", title: "Frage, was die Lektion offenließ.", subtitle: "Ein privater KI-Begleiter, der beim Prüfen einer Frage hilft, ohne vorzuschreiben, was du glauben sollst.", guestBody: "Live-Fragen sind verifizierten Mitgliedern vorbehalten. Kostenlos gibt es täglich eine Lektionssitzung mit drei Beiträgen.", lessonMode: "Lektionsbegleiter", lifeMode: "Lebensreflexion", chooseLesson: "Lektion wählen", questionPlaceholder: "Was möchtest du klarer verstehen?", send: "Fragen", sending: "Reflektiert…", newSession: "Neue Sitzung", nextStepLabel: "Nächster Schritt", helpful: "Hilfreich", notHelpful: "Nicht hilfreich", startFree: "Kostenloses Konto", signIn: "Anmelden" },
  fr: { ...EN, nav: "Questionner", eyebrow: "COMPAGNON DE RÉFLEXION", title: "Posez la question laissée ouverte par la leçon.", subtitle: "Un compagnon IA privé qui aide à examiner une question sans dicter ce qu'il faut croire.", guestBody: "Les questions en direct sont réservées aux membres vérifiés. Le compte gratuit offre une séance de leçon et trois échanges par jour.", lessonMode: "Compagnon de leçon", lifeMode: "Réflexion de vie", chooseLesson: "Choisir une leçon", questionPlaceholder: "Que souhaitez-vous comprendre plus clairement ?", send: "Demander", sending: "Réflexion…", newSession: "Nouvelle séance", nextStepLabel: "Prochaine étape", helpful: "Utile", notHelpful: "Peu utile", startFree: "Créer un compte gratuit", signIn: "Se connecter" },
  ar: { ...EN, nav: "اسأل وتأمل", eyebrow: "رفيق التأمل", title: "اسأل عمّا لم تجب عنه الدرس.", subtitle: "رفيق ذكاء اصطناعي خاص يساعدك على فحص السؤال، لا على تحديد ما يجب أن تؤمن به.", guestBody: "الأسئلة المباشرة للأعضاء الموثقين فقط. يتيح الحساب المجاني جلسة درس واحدة وثلاث رسائل يومياً.", lessonMode: "رفيق الدرس", lifeMode: "تأمل الحياة", chooseLesson: "اختر درساً", questionPlaceholder: "ما الذي تريد فهمه بوضوح أكبر؟", send: "اسأل", sending: "جارٍ التأمل…", newSession: "جلسة جديدة", nextStepLabel: "الخطوة التالية", helpful: "مفيد", notHelpful: "غير مفيد", startFree: "أنشئ حساباً مجانياً", signIn: "تسجيل الدخول" },
  ru: { ...EN, nav: "Спросить", eyebrow: "ПОМОЩНИК ДЛЯ РЕФЛЕКСИИ", title: "Спросите о том, что осталось за рамками урока.", subtitle: "Приватный ИИ-помощник помогает рассмотреть вопрос, но не решает, во что вам верить.", guestBody: "Живые вопросы доступны только подтверждённым участникам. Бесплатно — одна сессия по уроку и три сообщения в день.", lessonMode: "Помощник по уроку", lifeMode: "Жизненная рефлексия", chooseLesson: "Выберите урок", questionPlaceholder: "Что вы хотите понять яснее?", send: "Спросить", sending: "Размышление…", newSession: "Новая сессия", nextStepLabel: "Следующий шаг", helpful: "Полезно", notHelpful: "Не полезно", startFree: "Создать бесплатный аккаунт", signIn: "Войти" },
  zh: { ...EN, nav: "提问与反思", eyebrow: "反思伙伴", title: "问出课程尚未回答的问题。", subtitle: "一个私密的 AI 伙伴，帮助你审视问题，而不是替你决定应该相信什么。", guestBody: "实时提问仅限已验证会员。免费账户每天可进行一次课程会话，共三轮。", lessonMode: "课程伙伴", lifeMode: "生活反思", chooseLesson: "选择课程", questionPlaceholder: "你想更清楚地理解什么？", send: "提问", sending: "思考中…", newSession: "新会话", nextStepLabel: "下一步", helpful: "有帮助", notHelpful: "没有帮助", startFree: "创建免费账户", signIn: "登录" },
};

export function getReflectionCopy(locale: string): ReflectionCopy {
  return COPIES[locale as ReflectionLocale] || EN;
}
