"use client";

import Link from "next/link";
import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res  = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) setError(data.error || t.auth.invalidCredentials);
    else window.location.href = "/account";
    setLoading(false);
  }

  return (
    <SacredPage maxWidth={480}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        <div style={{ position: "relative", width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: "absolute", inset: 0, animation: "rotateSacred 20s linear infinite" }}>
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(201,162,39,0.25)" strokeWidth="1" />
            <polygon points="40,8 67,56 13,56" fill="none" stroke="rgba(201,162,39,0.4)" strokeWidth="1" />
            <polygon points="40,72 13,24 67,24" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle, #f0d47a, #c9a227)", boxShadow: "0 0 20px rgba(201,162,39,0.7)" }} />
          </div>
        </div>
      </div>

      <SacredCard glow>
        <SacredHeading
          label="Sacred Gateway"
          title={t.auth.loginTitle}
          subtitle={t.auth.loginSubtitle}
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
          <SacredInput
            label={t.auth.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && <SacredAlert text={error} tone="error" />}

          <button
            type="submit"
            className="btn-sacred btn-sacred-gold"
            disabled={loading}
            style={{ width: "100%", padding: "0.8rem", fontSize: "0.85rem", letterSpacing: "0.12em", marginTop: "0.4rem" }}
          >
            {loading ? t.auth.loggingIn : `✦ ${t.auth.loginBtn} ✦`}
          </button>
        </form>

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)", margin: "1.5rem 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
          <Link href="/forgot-password" style={{ color: "rgba(237,232,220,0.5)", textDecoration: "none" }}>
            {t.auth.forgotPassword}
          </Link>
          <Link href="/register" style={{ color: "var(--gold)", textDecoration: "none" }}>
            {t.auth.newAccount}
          </Link>
        </div>
      </SacredCard>

      <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.68rem", color: "rgba(237,232,220,0.25)", letterSpacing: "0.1em" }}>
        {t.footer.fictional}
      </p>
    </SacredPage>
  );
}
