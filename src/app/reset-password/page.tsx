"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

function ResetPasswordInner() {
  const { t } = useLanguage();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState<{ text: string; tone: "success" | "error" } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ text: t.security.passwordMismatch, tone: "error" });
      return;
    }
    if (password.length < 8) {
      setMsg({ text: t.security.passwordTooShort, tone: "error" });
      return;
    }
    setLoading(true);
    setMsg(null);
    const res  = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setMsg(res.ok
      ? { text: t.security.updated, tone: "success" }
      : { text: data.error || t.common.error, tone: "error" }
    );
    setLoading(false);
  }

  return (
    <SacredPage maxWidth={480}>
      <SacredCard glow>
        <SacredHeading
          label="Sacred Gateway"
          title={t.auth.forgotTitle}
          subtitle={t.security.subtitle}
        />

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <SacredInput
            label={t.security.newPassword}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
          <SacredInput
            label={t.security.confirmNewPassword}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />

          {msg && <SacredAlert text={msg.text} tone={msg.tone} />}

          <button
            type="submit"
            className="btn-sacred btn-sacred-gold"
            disabled={loading || msg?.tone === "success"}
            style={{ width: "100%", padding: "0.8rem", fontSize: "0.85rem", letterSpacing: "0.12em" }}
          >
            {loading ? t.common.saving : `✦ ${t.security.updateBtn} ✦`}
          </button>
        </form>

        {msg?.tone === "success" && (
          <div style={{ textAlign: "center", marginTop: "1.2rem" }}>
            <Link href="/login" style={{ color: "var(--gold)", fontSize: "0.82rem", textDecoration: "none" }}>
              {t.auth.returnLogin}
            </Link>
          </div>
        )}
      </SacredCard>
    </SacredPage>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <SacredPage maxWidth={480}>
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          Loading…
        </div>
      </SacredPage>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
