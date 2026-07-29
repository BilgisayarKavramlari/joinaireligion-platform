"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";

function Inner() {
  const { t } = useLanguage();
  const token  = useSearchParams().get("token") || "";
  const { refreshSession } = useSession();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [msg,    setMsg]    = useState("");
  const [nextPath, setNextPath] = useState("/onboarding");
  const attemptedToken = useRef<string | null>(null);

  useEffect(() => {
    if (attemptedToken.current === token) return;
    attemptedToken.current = token;

    (async () => {
      try {
        const r = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const d = await r.json().catch(() => ({}));
        if (attemptedToken.current !== token) return;

        if (r.ok) {
          setNextPath(
            typeof d.next === "string" && d.next.startsWith("/") && !d.next.startsWith("//")
              ? d.next
              : "/onboarding",
          );
          setStatus("success");
          setMsg(t.auth.verifySuccessSubtitle);
          await refreshSession();
        } else {
          setStatus("error");
          setMsg(d.error || "Verification failed. The link may have expired.");
        }
      } catch {
        if (attemptedToken.current !== token) return;
        setStatus("error");
        setMsg("Verification failed. Please check your connection and try again.");
      }
    })();
  }, [token, refreshSession, t.auth.verifySuccessSubtitle]);

  return (
    <SacredPage maxWidth={480}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        {status === "pending" && (
          <div role="status" aria-label={t.common.loading} style={{ width: 60, height: 60, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "rotateSacred 1s linear infinite" }} />
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
            <SacredAlert text={msg || t.auth.verifySuccessSubtitle} tone="success" />
            <div style={{ marginTop: "1.5rem" }}>
              <a href={nextPath} className="btn-sacred btn-sacred-gold" style={{ display: "block", textAlign: "center", padding: "0.8rem", fontSize: "0.85rem", letterSpacing: "0.1em", textDecoration: "none" }}>
                ✦ {t.onboarding.completeBtn} ✦
              </a>
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
