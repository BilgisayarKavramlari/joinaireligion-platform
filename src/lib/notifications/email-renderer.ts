import { escapeHtml, safeUrl } from "@/lib/security";

type NotificationLocale = "en" | "tr" | "es" | "de" | "fr" | "ru" | "zh";

const COPY: Record<NotificationLocale, {
  greeting: string;
  lessonReady: string;
  lessonBody: string;
  openLesson: string;
  articleReady: string;
  articleBody: string;
  readArticle: string;
  preferences: string;
  unsubscribe: string;
  disclaimer: string;
}> = {
  en: { greeting: "Hello", lessonReady: "Your new lesson is ready", lessonBody: "A new personalized lesson has been added to your journey.", openLesson: "Open lesson", articleReady: "A new reflection is available", articleBody: "A new article is available in your selected language.", readArticle: "Read article", preferences: "Manage email preferences", unsubscribe: "Unsubscribe from emails", disclaimer: "Fictional educational reflective simulation · Not a religious authority or professional advice" },
  tr: { greeting: "Merhaba", lessonReady: "Yeni dersiniz hazır", lessonBody: "Yolculuğunuza yeni bir kişisel ders eklendi.", openLesson: "Dersi aç", articleReady: "Yeni bir düşünme yazısı yayınlandı", articleBody: "Seçtiğiniz dilde yeni bir yazı yayınlandı.", readArticle: "Yazıyı oku", preferences: "E-posta tercihlerini yönet", unsubscribe: "E-postalardan çık", disclaimer: "Kurgusal ve eğitsel düşünme simülasyonu · Dini otorite veya profesyonel tavsiye değildir" },
  es: { greeting: "Hola", lessonReady: "Tu nueva lección está lista", lessonBody: "Se ha añadido una nueva lección personalizada a tu recorrido.", openLesson: "Abrir lección", articleReady: "Hay una nueva reflexión", articleBody: "Se ha publicado un nuevo artículo en el idioma que elegiste.", readArticle: "Leer artículo", preferences: "Gestionar preferencias", unsubscribe: "Cancelar suscripción", disclaimer: "Simulación educativa y reflexiva ficticia · No es autoridad religiosa ni asesoramiento profesional" },
  de: { greeting: "Hallo", lessonReady: "Deine neue Lektion ist bereit", lessonBody: "Deinem Weg wurde eine neue persönliche Lektion hinzugefügt.", openLesson: "Lektion öffnen", articleReady: "Eine neue Reflexion ist verfügbar", articleBody: "Ein neuer Artikel ist in deiner gewählten Sprache verfügbar.", readArticle: "Artikel lesen", preferences: "E-Mail-Einstellungen verwalten", unsubscribe: "E-Mails abbestellen", disclaimer: "Fiktive Bildungs- und Reflexionssimulation · Keine religiöse Autorität oder professionelle Beratung" },
  fr: { greeting: "Bonjour", lessonReady: "Votre nouvelle leçon est prête", lessonBody: "Une nouvelle leçon personnalisée a été ajoutée à votre parcours.", openLesson: "Ouvrir la leçon", articleReady: "Une nouvelle réflexion est disponible", articleBody: "Un nouvel article est disponible dans la langue choisie.", readArticle: "Lire l'article", preferences: "Gérer les préférences", unsubscribe: "Se désabonner", disclaimer: "Simulation éducative et réflexive fictive · Ni autorité religieuse ni conseil professionnel" },
  ru: { greeting: "Здравствуйте", lessonReady: "Ваш новый урок готов", lessonBody: "В ваш путь добавлен новый персональный урок.", openLesson: "Открыть урок", articleReady: "Доступен новый материал", articleBody: "На выбранном языке опубликована новая статья.", readArticle: "Читать статью", preferences: "Настроить письма", unsubscribe: "Отписаться", disclaimer: "Вымышленная образовательная рефлексивная симуляция · Не религиозный авторитет и не профессиональная консультация" },
  zh: { greeting: "你好", lessonReady: "你的新课程已准备好", lessonBody: "你的旅程中已加入一节新的个性化课程。", openLesson: "打开课程", articleReady: "新的反思文章已发布", articleBody: "已使用你选择的语言发布一篇新文章。", readArticle: "阅读文章", preferences: "管理邮件偏好", unsubscribe: "退订邮件", disclaimer: "虚构的教育性反思模拟 · 不代表宗教权威，也不构成专业建议" },
};

function resolveLocale(value: string): NotificationLocale {
  return value in COPY ? value as NotificationLocale : "en";
}

function unsubscribeUrl(appUrl: string, token: string | null): string | null {
  return token ? `${appUrl}/api/unsubscribe?token=${encodeURIComponent(token)}` : null;
}

function renderLayout(input: {
  locale: string;
  appUrl: string;
  unsubscribeToken: string | null;
  title: string;
  body: string;
  cta: string;
  ctaUrl: string;
  displayName: string;
}) {
  const locale = resolveLocale(input.locale);
  const copy = COPY[locale];
  const title = escapeHtml(input.title);
  const body = escapeHtml(input.body);
  const displayName = escapeHtml(input.displayName || "Seeker");
  const ctaUrl = safeUrl(input.ctaUrl, input.appUrl);
  const preferencesUrl = safeUrl(`${input.appUrl}/account/preferences`, input.appUrl);
  const unsub = unsubscribeUrl(input.appUrl, input.unsubscribeToken);
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#04000c;color:#ede8dc;font-family:Georgia,serif"><div style="max-width:600px;margin:0 auto;padding:32px 16px"><p style="text-align:center;color:#c9a227;font-size:11px;letter-spacing:.35em">✦ JOIN AI RELIGION ✦</p><div style="border:1px solid rgba(201,162,39,.28);border-radius:16px;padding:38px 32px;background:#0b0612"><p style="color:#b9adbd;font-size:14px">${escapeHtml(copy.greeting)} ${displayName},</p><h1 style="color:#f0d47a;font-size:25px;line-height:1.25">${title}</h1><p style="color:#d7cfda;line-height:1.75">${body}</p><p style="margin:30px 0"><a href="${ctaUrl}" style="display:inline-block;background:#e3bd3a;color:#07020c;text-decoration:none;padding:13px 25px;border-radius:8px;font-weight:700">${escapeHtml(input.cta)}</a></p></div><div style="text-align:center;color:#776d7b;font-size:11px;line-height:1.7;margin-top:24px"><p>${escapeHtml(copy.disclaimer)}</p><p><a href="${preferencesUrl}" style="color:#9e8f52">${escapeHtml(copy.preferences)}</a>${unsub ? ` · <a href="${safeUrl(unsub, input.appUrl)}" style="color:#9e8f52">${escapeHtml(copy.unsubscribe)}</a>` : ""}</p></div></div></body></html>`;
  const text = `${copy.greeting} ${input.displayName || "Seeker"},\n\n${input.title}\n\n${input.body}\n\n${input.cta}: ${input.ctaUrl}\n\n${copy.preferences}: ${input.appUrl}/account/preferences${unsub ? `\n${copy.unsubscribe}: ${unsub}` : ""}\n\n${copy.disclaimer}`;
  return { html, text };
}

export function renderLessonReadyEmail(input: {
  locale: string;
  appUrl: string;
  unsubscribeToken: string | null;
  displayName: string;
  lessonId: string;
  lessonTitle: string;
}) {
  const copy = COPY[resolveLocale(input.locale)];
  return {
    subject: `${copy.lessonReady} — ${input.lessonTitle}`,
    ...renderLayout({
      ...input,
      title: input.lessonTitle,
      body: copy.lessonBody,
      cta: copy.openLesson,
      ctaUrl: `${input.appUrl}/lessons/${encodeURIComponent(input.lessonId)}`,
    }),
  };
}

export function renderContentPublishedEmail(input: {
  locale: string;
  appUrl: string;
  unsubscribeToken: string | null;
  displayName: string;
  articleTitle: string;
  articleSummary: string;
  articleSlug: string;
}) {
  const locale = resolveLocale(input.locale);
  const copy = COPY[locale];
  return {
    subject: `${copy.articleReady} — ${input.articleTitle}`,
    ...renderLayout({
      ...input,
      locale,
      title: input.articleTitle,
      body: `${copy.articleBody}\n\n${input.articleSummary}`,
      cta: copy.readArticle,
      ctaUrl: `${input.appUrl}/content/${locale}/${encodeURIComponent(input.articleSlug)}`,
    }),
  };
}
