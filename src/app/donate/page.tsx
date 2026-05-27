"use client";

import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

const PRESETS = [5, 10, 25, 50, 100, 250];

const IMPACT = [
  { icon: "🕯️", amount: 5,   label: "One week of reflective prompts for a seeker" },
  { icon: "📖", amount: 10,  label: "A month of access for one tradition explorer" },
  { icon: "🌍", amount: 25,  label: "Helps translate content to a new language" },
  { icon: "⚗️", amount: 50,  label: "Funds development of a new meditation module" },
  { icon: "🏛️", amount: 100, label: "Sponsors a new world tradition deep-dive" },
  { icon: "✨", amount: 250, label: "Supports platform infrastructure for a month" },
];

export default function DonatePage() {
  const { t } = useLanguage();
  const [amount, setAmount]   = useState(10);
  const [custom, setCustom]   = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  const effectiveAmount = custom ? Number(custom) : amount;
  const impact = IMPACT.find((i) => i.amount === effectiveAmount);

  async function startDonation() {
    const amt = effectiveAmount;
    if (!amt || amt < 3 || amt > 5000) {
      setMessage({ text: "Donation amount must be between $3 and $5000.", tone: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/stripe/create-donation-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, locale: (typeof window !== "undefined" && localStorage.getItem("ui_locale")) || "en" }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage({ text: data.error || "Failed to start checkout.", tone: "error" }); return; }
      window.location.href = data.url;
    } catch {
      setMessage({ text: "Network error. Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SacredPage maxWidth={680}>
      {/* Decorative header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.8rem", animation: "glowPulse 3s ease-in-out infinite" }}>🙏</div>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
          ✦ Sacred Offering ✦
        </p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.8rem" }}>
          {t.donate.title}
        </h1>
        <p style={{ fontSize: "0.88rem", color: "rgba(237,232,220,0.5)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
          {t.donate.subtitle}
        </p>
      </div>

      <SacredCard glow>
        <SacredHeading label={t.donate.chooseAmount} title={t.donate.title} />

        {/* Preset amounts */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.5rem" }}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => { setAmount(preset); setCustom(""); }}
              className={`btn-sacred ${amount === preset && !custom ? "btn-sacred-gold" : "btn-sacred-ghost"}`}
              style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem", minWidth: 64 }}
            >
              ${preset}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            {t.donate.customAmount}
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--gold)", fontSize: "0.9rem" }}>$</span>
            <input
              type="number"
              min={3}
              max={5000}
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
              placeholder="Enter amount"
              style={{
                width: "100%", padding: "0.7rem 0.9rem 0.7rem 1.8rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-gold)",
                borderRadius: "0.6rem",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>
          <p style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.3)", marginTop: "0.4rem" }}>Min $3 — Max $5,000</p>
        </div>

        {/* Impact indicator */}
        {impact && !custom && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.8rem",
            padding: "0.8rem 1rem",
            background: "rgba(201,162,39,0.05)",
            border: "1px solid rgba(201,162,39,0.2)",
            borderRadius: "0.75rem",
            marginBottom: "1.2rem",
          }}>
            <span style={{ fontSize: "1.4rem" }}>{impact.icon}</span>
            <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.5 }}>{impact.label}</p>
          </div>
        )}

        {/* Selected amount display */}
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <span className="font-sacred" style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--gold-light)" }}>
            ${effectiveAmount || "—"}
          </span>
          <span style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.4)" }}> USD</span>
        </div>

        {message && <div style={{ marginBottom: "1rem" }}><SacredAlert text={message.text} tone={message.tone} /></div>}

        <button
          className="btn-sacred btn-sacred-gold"
          onClick={startDonation}
          disabled={loading || !effectiveAmount || effectiveAmount < 3}
          style={{ width: "100%", padding: "0.9rem", fontSize: "0.88rem", letterSpacing: "0.1em" }}
        >
          {loading ? t.billing.processing : `✦ ${t.donate.proceed} ✦`}
        </button>

        <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "rgba(237,232,220,0.3)" }}>🔒 {t.donate.secured}</span>
        </div>
      </SacredCard>

      <div style={{ marginTop: "1.5rem" }}>
        <SacredAlert
          text={t.donate.disclaimer}
          tone="info"
        />
      </div>
    </SacredPage>
  );
}
