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
];

export default function PreferencesPage() {
  const { t, lang, setLang } = useLanguage();
  const [uiLang, setUiLang]       = useState<LangCode>(lang);
  const [emailLang, setEmailLang] = useState("en");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // sync with context lang
  useEffect(() => { setUiLang(lang); }, [lang]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    // Apply UI language immediately via context
    setLang(uiLang);
    // Persist email language to DB
    await fetch("/api/account/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLocale: uiLang, preferredEmailLocale: emailLang }),
    }).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 400));
    setSaved(true);
    setSaving(false);
  }

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
            {LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </SacredSelect>

          {saved && <SacredAlert text={t.preferences.saved} tone="success" />}

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
