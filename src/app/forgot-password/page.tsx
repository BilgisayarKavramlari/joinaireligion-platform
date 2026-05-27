"use client";

import Link from "next/link";
import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail]     = useState("");
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (r.ok) {
      setSent(true);
      setMsg(t.auth.resetSentSubtitle);
    } else {
      setMsg(t.common.error);
    }
    setLoading(false);
  }

  return (
    <SacredPage maxWidth={460}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        <div style={{ position: "relative", width: 70, height: 70 }}>
          <svg width="70" height="70" viewBox="0 0 70 70" style={{ position: "absolute", inset: 0, animation: "rotateSacredReverse 15s linear infinite" }}>
            <circle cx="35" cy="35" r="32" fill="none" stroke="rgba(201,162,39,0.2)" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="35" cy="35" r="22" fill="none" stroke="rgba(168,85,247,0.25)" strokeWidth="1" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
            🔮
          </div>
        </div>
      </div>

      <SacredCard glow>
        {!sent ? (
          <>
            <SacredHeading
              label="Path Restoration"
              title={t.auth.forgotTitle}
              subtitle={t.auth.forgotSubtitle}
            />
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <SacredInput
                label={t.auth.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
              {msg && <SacredAlert text={msg} tone="error" />}
              <button
                type="submit"
                className="btn-sacred btn-sacred-violet"
                disabled={loading}
                style={{ width: "100%", padding: "0.8rem", fontSize: "0.85rem", letterSpacing: "0.1em" }}
              >
                {loading ? t.common.sending : `✦ ${t.auth.sendReset} ✦`}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✉️</div>
            <SacredHeading
              label={t.auth.resetSent}
              title={t.auth.checkEmailTitle}
              subtitle={msg}
            />
          </div>
        )}

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)", margin: "1.5rem 0" }} />

        <p style={{ textAlign: "center", fontSize: "0.8rem" }}>
          <Link href="/login" style={{ color: "var(--gold)", textDecoration: "none" }}>← {t.auth.loginBtn}</Link>
        </p>
      </SacredCard>
    </SacredPage>
  );
}
