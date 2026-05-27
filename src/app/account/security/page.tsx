"use client";

import Link from "next/link";
import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SecurityPage() {
  const { t } = useLanguage();
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState<{ text: string; tone: "success" | "error" } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setMsg({ text: t.security.passwordMismatch, tone: "error" }); return; }
    if (newPw.length < 8)    { setMsg({ text: t.security.passwordTooShort, tone: "error" }); return; }
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const d = await res.json();
    setMsg(res.ok ? { text: t.security.updated, tone: "success" } : { text: d.error || t.common.error, tone: "error" });
    setSaving(false);
    if (res.ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  }

  return (
    <SacredPage maxWidth={680}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← {t.account.dashboard}
        </Link>
      </div>

      <SacredHeading
        label="Sacred Security"
        title={t.security.title}
        subtitle={t.security.subtitle}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <SacredCard glow>
          <h3 className="font-sacred" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gold-light)", marginBottom: "1.2rem", letterSpacing: "0.08em" }}>
            🔑 {t.security.changePassword}
          </h3>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <SacredInput
              label={t.security.currentPassword}
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              required
            />
            <SacredInput
              label={t.security.newPassword}
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
            <SacredInput
              label={t.security.confirmNewPassword}
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="••••••••"
              required
            />
            {msg && <SacredAlert text={msg.text} tone={msg.tone} />}
            <button
              type="submit"
              className="btn-sacred btn-sacred-gold"
              disabled={saving}
              style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem" }}
            >
              {saving ? t.common.saving : `✦ ${t.security.updateBtn} ✦`}
            </button>
          </form>
        </SacredCard>

        <SacredAlert text="Forgot your current password? Use the forgot password flow from the login page to reset it securely." tone="info" />
      </div>
    </SacredPage>
  );
}
