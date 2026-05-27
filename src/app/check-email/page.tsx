"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";

function CheckEmailInner() {
  const email = useSearchParams().get("email") || "";
  const [msg, setMsg]       = useState("");
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    const r = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    setMsg(r.ok ? (d?.emailDelivery?.reason ? `Verification queued: ${d.emailDelivery.reason}` : "Verification email resent.") : "Unable to resend right now. Try again shortly.");
    setSending(false);
  }

  return (
    <SacredPage maxWidth={520}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "3.5rem", animation: "glowPulse 3s ease-in-out infinite" }}>✉️</div>
      </div>

      <SacredCard glow>
        <SacredHeading
          label="Verification Required"
          title="Check Your Inbox"
          subtitle={`We sent a sacred verification message to ${email || "your email address"}. Please open it to confirm your account and begin your journey.`}
        />

        <div style={{
          background: "rgba(201,162,39,0.04)",
          border: "1px solid rgba(201,162,39,0.2)",
          borderRadius: "0.75rem",
          padding: "1rem 1.2rem",
          marginBottom: "1.5rem",
        }}>
          <p style={{ fontSize: "0.8rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.7 }}>
            💡 <strong style={{ color: "var(--gold-light)" }}>Tip:</strong> Check your spam or promotions folder if you don't see the email within a few minutes.
          </p>
        </div>

        {msg && <SacredAlert text={msg} tone="success" />}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1rem" }}>
          <button
            onClick={resend}
            disabled={sending}
            className="btn-sacred btn-sacred-ghost"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem" }}
          >
            {sending ? "Sending…" : "Resend Verification Email"}
          </button>
          <Link href="/login" className="btn-sacred btn-sacred-gold" style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.82rem", display: "block", textDecoration: "none" }}>
            I've verified — Enter the Sanctum →
          </Link>
        </div>
      </SacredCard>
    </SacredPage>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <SacredPage maxWidth={520}>
        <SacredCard>
          <p style={{ textAlign: "center", color: "rgba(237,232,220,0.5)" }}>Loading…</p>
        </SacredCard>
      </SacredPage>
    }>
      <CheckEmailInner />
    </Suspense>
  );
}
