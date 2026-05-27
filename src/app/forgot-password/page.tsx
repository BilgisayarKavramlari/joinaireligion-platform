"use client";

import Link from "next/link";
import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState("");
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

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
      setMsg("If your email exists in our records, reset instructions have been dispatched.");
    } else {
      setMsg("Something went wrong. Please try again later.");
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
              title="Restore Your Access"
              subtitle="Enter your email address and we will send you instructions to restore your sacred passage."
            />
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <SacredInput
                label="Your Email Address"
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
                {loading ? "Sending…" : "✦ Send Reset Instructions ✦"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✉️</div>
            <SacredHeading
              label="Instructions Sent"
              title="Check Your Inbox"
              subtitle={msg}
            />
            <SacredAlert text="Remember to check your spam folder if you don't see the email within a few minutes." tone="info" />
          </div>
        )}

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)", margin: "1.5rem 0" }} />

        <p style={{ textAlign: "center", fontSize: "0.8rem" }}>
          <Link href="/login" style={{ color: "var(--gold)", textDecoration: "none" }}>← Return to the sanctum</Link>
        </p>
      </SacredCard>
    </SacredPage>
  );
}
