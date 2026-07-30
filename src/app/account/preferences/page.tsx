"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredSelect, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { type LangCode } from "@/lib/i18n/dict";

const LANG_OPTIONS: { code: LangCode; label: string }[] = [
  { code: "en", label: "🇬🇧 English" },
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "zh", label: "🇨🇳 简体中文" },
];
const EMAIL_LANG_OPTIONS = LANG_OPTIONS.filter((option) => option.code !== "ar");

const EMAIL_COPY: Record<LangCode, {
  heading: string;
  practice: string;
  practiceHint: string;
  content: string;
  contentHint: string;
  unsubscribeHint: string;
  loadError: string;
  saveError: string;
}> = {
  en: { heading: "Email notifications", practice: "Lessons and practices", practiceHint: "Email me when a new personalized lesson or practice is ready.", content: "New articles", contentHint: "Email new articles in my selected email language.", unsubscribeHint: "Every notification email includes an unsubscribe link.", loadError: "Email preferences could not be loaded.", saveError: "Preferences could not be saved." },
  tr: { heading: "E-posta bildirimleri", practice: "Dersler ve pratikler", practiceHint: "Yeni kişisel ders veya pratik hazır olduğunda e-posta gönder.", content: "Yeni yazılar", contentHint: "Yeni yazıları seçtiğim e-posta dilinde gönder.", unsubscribeHint: "Her bildirim e-postasında abonelikten çıkma bağlantısı bulunur.", loadError: "E-posta tercihleri yüklenemedi.", saveError: "Tercihler kaydedilemedi." },
  es: { heading: "Notificaciones por correo", practice: "Lecciones y prácticas", practiceHint: "Avísame cuando haya una nueva lección o práctica personalizada.", content: "Nuevos artículos", contentHint: "Envíame los artículos en el idioma de correo elegido.", unsubscribeHint: "Cada correo incluye un enlace para cancelar la suscripción.", loadError: "No se pudieron cargar las preferencias.", saveError: "No se pudieron guardar las preferencias." },
  de: { heading: "E-Mail-Benachrichtigungen", practice: "Lektionen und Übungen", practiceHint: "Benachrichtige mich über neue persönliche Lektionen oder Übungen.", content: "Neue Artikel", contentHint: "Sende neue Artikel in meiner gewählten E-Mail-Sprache.", unsubscribeHint: "Jede Nachricht enthält einen Abmeldelink.", loadError: "Einstellungen konnten nicht geladen werden.", saveError: "Einstellungen konnten nicht gespeichert werden." },
  fr: { heading: "Notifications par e-mail", practice: "Leçons et pratiques", practiceHint: "Prévenez-moi lorsqu'une nouvelle leçon ou pratique est prête.", content: "Nouveaux articles", contentHint: "Envoyez les articles dans la langue d'e-mail choisie.", unsubscribeHint: "Chaque e-mail contient un lien de désabonnement.", loadError: "Impossible de charger les préférences.", saveError: "Impossible d'enregistrer les préférences." },
  ar: { heading: "إشعارات البريد الإلكتروني", practice: "الدروس والممارسات", practiceHint: "أرسل لي بريداً عند توفر درس أو ممارسة جديدة.", content: "المقالات الجديدة", contentHint: "أرسل المقالات الجديدة بلغة البريد التي اخترتها.", unsubscribeHint: "تتضمن كل رسالة رابطاً لإلغاء الاشتراك.", loadError: "تعذر تحميل التفضيلات.", saveError: "تعذر حفظ التفضيلات." },
  ru: { heading: "Уведомления по электронной почте", practice: "Уроки и практики", practiceHint: "Сообщать о новой персональной практике или уроке.", content: "Новые статьи", contentHint: "Присылать статьи на выбранном языке писем.", unsubscribeHint: "В каждом письме есть ссылка для отказа от рассылки.", loadError: "Не удалось загрузить настройки.", saveError: "Не удалось сохранить настройки." },
  zh: { heading: "邮件通知", practice: "课程与练习", practiceHint: "新的个性化课程或练习准备好后发送邮件。", content: "新文章", contentHint: "使用我选择的邮件语言发送新文章。", unsubscribeHint: "每封通知邮件都包含退订链接。", loadError: "无法加载邮件偏好。", saveError: "无法保存偏好。" },
};

export default function PreferencesPage() {
  const { t, lang, setLang } = useLanguage();
  const [uiLang, setUiLang]       = useState<LangCode>(lang);
  const [emailLang, setEmailLang] = useState("en");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [contentEmailOptIn, setContentEmailOptIn] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");

  // sync with context lang
  useEffect(() => { setUiLang(lang); }, [lang]);

  useEffect(() => {
    fetch("/api/account/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("preferences_load_failed");
        return response.json();
      })
      .then(({ preferences }) => {
        if (preferences?.preferredLocale) setUiLang(preferences.preferredLocale as LangCode);
        if (preferences?.preferredEmailLocale) setEmailLang(preferences.preferredEmailLocale);
        setEmailOptIn(preferences?.emailOptIn !== false);
        setContentEmailOptIn(preferences?.contentEmailOptIn === true);
      })
      .catch(() => setError(EMAIL_COPY[lang].loadError));
  }, [lang]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    // Apply UI language immediately via context
    setLang(uiLang);
    // Persist email language to DB
    const response = await fetch("/api/account/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLocale: uiLang, preferredEmailLocale: emailLang, emailOptIn, contentEmailOptIn }),
    }).catch(() => null);
    if (response?.ok) setSaved(true);
    else setError(EMAIL_COPY[uiLang].saveError);
    setSaving(false);
  }

  const emailCopy = EMAIL_COPY[uiLang];

  return (
    <SacredPage maxWidth={620}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← {t.account.dashboard}
        </Link>
      </div>

      <SacredCard glow>
        <SacredHeading
          label="Sacred Settings"
          title={t.preferences.title}
          subtitle={t.preferences.subtitle}
        />

        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "1.3rem" }}>
          <SacredSelect
            label={t.preferences.interfaceLang}
            value={uiLang}
            onChange={(e) => setUiLang(e.target.value as LangCode)}
          >
            {LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </SacredSelect>

          <SacredSelect
            label={t.preferences.emailLang}
            value={emailLang}
            onChange={(e) => setEmailLang(e.target.value)}
          >
            {EMAIL_LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </SacredSelect>

          <div style={{ borderTop: "1px solid rgba(201,162,39,0.16)", paddingTop: "1.2rem" }}>
            <p style={{ color: "var(--gold-light)", fontWeight: 700, marginBottom: "0.9rem" }}>{emailCopy.heading}</p>
            <label style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", marginBottom: "1rem", cursor: "pointer" }}>
              <input type="checkbox" checked={emailOptIn} onChange={(event) => setEmailOptIn(event.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ color: "var(--text-primary)", fontSize: "0.84rem" }}>
                {emailCopy.practice}
                <small style={{ display: "block", color: "var(--text-muted)", lineHeight: 1.5, marginTop: 3 }}>{emailCopy.practiceHint}</small>
              </span>
            </label>
            <label style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={contentEmailOptIn} onChange={(event) => setContentEmailOptIn(event.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ color: "var(--text-primary)", fontSize: "0.84rem" }}>
                {emailCopy.content}
                <small style={{ display: "block", color: "var(--text-muted)", lineHeight: 1.5, marginTop: 3 }}>{emailCopy.contentHint}</small>
              </span>
            </label>
            <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.9rem" }}>{emailCopy.unsubscribeHint}</p>
          </div>

          {saved && <SacredAlert text={t.preferences.saved} tone="success" />}
          {error && <SacredAlert text={error} tone="error" />}

          <button
            type="submit"
            className="btn-sacred btn-sacred-gold"
            disabled={saving}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem" }}
          >
            {saving ? t.common.saving : `✦ ${t.preferences.saveBtn} ✦`}
          </button>
        </form>
      </SacredCard>
    </SacredPage>
  );
}
