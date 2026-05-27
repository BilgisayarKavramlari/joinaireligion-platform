"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

function Inner() {
  const { t } = useLanguage();
  const token  = useSearchParams().get("token") || "";
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [msg,    setMsg]    = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (r.ok) {
        setStatus("success");
        setMsg("Your email has been verified. Your sacred path is now open.");
        // Auto-redirect after short delay
        setTimeout(() => { router.push(d.next ?? "/onboarding"); }, 2200);
      } else {
        setStatus("error");
        setMsg(d.error || "Verification failed. The link may have expired.");
      }
    })();
  }, [token, router]);

  return (
    <SacredPage maxWidth={480}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        {status === "pending" && (
          <div style={{ width: 60, height: 60, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "rotateSacred 1s linear infinite" }} />
        )}
        {status === "success" && <div style={{ fontSize: "3rem", animation: "glowPulse 2s ease-in-out infinite" }}>✨</div>}
        {status === "error"   && <div style={{ fontSize: "3rem" }}>⚠️</div>}
      </div>

      <SacredCard glow={status === "success"}>
        {status === "pending" && (
          <SacredHeading label="Please Wait" title={t.auth.verifyTitle} subtitle={t.common.loading} />
        )}
        {status === "success" && (
          <>
            <SacredHeading label="Path Confirmed" title={t.auth.verifySuccess} subtitle={t.auth.verifySuccessSubtitle} />
            <SacredAlert text={t.auth.verifySuccessSubtitle} tone="success" />
            <div style={{ marginTop: "1.5rem" }}>
              <Link href="/onboarding" className="btn-sacred btn-sacred-gold" style={{ display: "block", textAlign: "center", padding: "0.8rem", fontSize: "0.85rem", letterSpacing: "0.1em", textDecoration: "none" }}>
                ✦ {t.onboarding.completeBtn} ✦
              </Link>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <SacredHeading label={t.auth.verifyError} title={t.auth.verifyError} subtitle={msg} />
            <SacredAlert text={msg} tone="error" />
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <Link href="/login" className="btn-sacred btn-sacred-gold" style={{ display: "block", textAlign: "center", padding: "0.75rem", fontSize: "0.82rem", textDecoration: "none" }}>
                {t.auth.loginBtn}
              </Link>
              <Link href="/register" className="btn-sacred btn-sacred-ghost" style={{ display: "block", textAlign: "center", padding: "0.75rem", fontSize: "0.82rem", textDecoration: "none" }}>
                {t.auth.register}
              </Link>
            </div>
          </>
        )}
      </SacredCard>
    </SacredPage>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <SacredPage maxWidth={480}>
        <SacredCard>
          <p style={{ textAlign: "center", color: "rgba(237,232,220,0.5)" }}>Loading…</p>
        </SacredCard>
      </SacredPage>
    }>
      <Inner />
    </Suspense>
  );
}
