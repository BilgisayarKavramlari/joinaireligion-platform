"use client";

import Link from "next/link";
import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredSelect, SacredAlert } from "@/components/ui/SacredPage";

export default function PreferencesPage() {
  const [uiLang, setUiLang]     = useState("en");
  const [emailLang, setEmailLang] = useState("en");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("ui_locale", uiLang);
    }
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setSaving(false);
  }

  return (
    <SacredPage maxWidth={620}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← Account Dashboard
        </Link>
      </div>

      <SacredCard glow>
        <SacredHeading
          label="Sacred Settings"
          title="Preferences"
          subtitle="The sacred journey speaks your language. Interface and email language can be configured independently."
        />

        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "1.3rem" }}>
          <SacredSelect
            label="Interface Language"
            value={uiLang}
            onChange={(e) => setUiLang(e.target.value)}
          >
            <option value="en">🇬🇧 English</option>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="es">🇪🇸 Español</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="ar">🇸🇦 العربية</option>
            <option value="hi">🇮🇳 हिन्दी</option>
          </SacredSelect>

          <SacredSelect
            label="Email Language"
            value={emailLang}
            onChange={(e) => setEmailLang(e.target.value)}
          >
            <option value="en">🇬🇧 English</option>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="es">🇪🇸 Español</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="ar">🇸🇦 العربية</option>
            <option value="hi">🇮🇳 हिन्दी</option>
          </SacredSelect>

          {saved && <SacredAlert text="Your preferences have been saved." tone="success" />}

          <button
            type="submit"
            className="btn-sacred btn-sacred-gold"
            disabled={saving}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem" }}
          >
            {saving ? "Saving…" : "✦ Save Preferences ✦"}
          </button>
        </form>
      </SacredCard>
    </SacredPage>
  );
}
