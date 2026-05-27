"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RegisterPage() {
  const { t } = useLanguage();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [displayName, setDisplayName]   = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res  = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, displayName, acceptedTerms }) });
    const data = await res.json();
    if (!res.ok) setError(data.error || t.common.error);
    else router.push(data.next ?? `/check-email?email=${encodeURIComponent(email)}`);
    setLoading(false);
  }

  return (
    <SacredPage maxWidth={520}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto" }}>
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: "absolute", inset: 0, animation: "rotateSacred 30s linear infinite" }}>
            <circle cx="45" cy="45" r="42" fill="none" stroke="rgba(201,162,39,0.18)" strokeWidth="1" strokeDasharray="4 6" />
          </svg>
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: "absolute", inset: 0, animation: "rotateSacredReverse 18s linear infinite" }}>
            <circle cx="45" cy="45" r="32" fill="none" stroke="rgba(168,85,247,0.28)" strokeWidth="1" />
            <polygon points="45,16 71,61 19,61" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1" />
            <polygon points="45,74 19,29 71,29" fill="none" stroke="rgba(20,184,166,0.3)" strokeWidth="1" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "radial-gradient(circle, #f0d47a, #c9a227)", boxShadow: "0 0 24px rgba(201,162,39,0.8)" }} />
          </div>
        </div>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginTop: "0.8rem" }}>
          ✦ First Steps ✦
        </p>
      </div>

      <SacredCard glow>
        <SacredHeading
          label="Begin the Journey"
          title={t.auth.registerTitle}
          subtitle={t.auth.registerSubtitle}
        />

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <SacredInput
            label={t.auth.displayName}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.auth.displayNamePlaceholder}
            autoComplete="name"
          />
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
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
          />

          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
            <div style={{ position: "relative", marginTop: "2px" }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ appearance: "none", width: 16, height: 16, border: "1px solid var(--border-gold)", borderRadius: "3px", background: acceptedTerms ? "rgba(201,162,39,0.2)" : "transparent", cursor: "pointer" }}
              />
              {acceptedTerms && (
                <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--gold)", fontSize: "0.65rem", pointerEvents: "none" }}>✓</span>
              )}
            </div>
            <span style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.6)", lineHeight: 1.5 }}>
              {t.auth.acceptTerms}{" — "}
              <Link href="/legal/eula" style={{ color: "var(--gold)", textDecoration: "none" }}>{t.footer.eula}</Link>
            </span>
          </label>

          {error && <SacredAlert text={error} tone="error" />}

          <button
            type="submit"
            className="btn-sacred btn-sacred-gold"
            disabled={loading || !acceptedTerms}
            style={{ width: "100%", padding: "0.8rem", fontSize: "0.85rem", letterSpacing: "0.12em", marginTop: "0.4rem", opacity: !acceptedTerms ? 0.5 : 1 }}
          >
            {loading ? t.auth.registering : `✦ ${t.auth.registerBtn} ✦`}
          </button>
        </form>

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)", margin: "1.5rem 0" }} />

        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "rgba(237,232,220,0.5)" }}>
          {t.auth.alreadyAccount}{" "}
          <Link href="/login" style={{ color: "var(--gold)", textDecoration: "none" }}>{t.auth.returnLogin}</Link>
        </p>
      </SacredCard>

      <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.68rem", color: "rgba(237,232,220,0.25)", letterSpacing: "0.1em" }}>
        {t.footer.notReligious}
      </p>
    </SacredPage>
  );
}
