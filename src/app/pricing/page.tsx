"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SacredPage, SacredCard, SacredAlert } from "@/components/ui/SacredPage";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type Plan = "seeker" | "initiate";

const PLANS = [
  {
    id: "seeker" as Plan,
    icon: "🌙",
    name: "Seeker",
    subtitle: "Supporter",
    price: "$9",
    period: "/month",
    tagline: "For those who wish to support the platform and contribute to keeping this sacred space alive.",
    highlight: false,
    color: "rgba(168,85,247,0.08)",
    borderColor: "rgba(168,85,247,0.35)",
    btnClass: "btn-sacred-violet",
    features: [
      "Monthly donation to support the platform",
      "Supporter badge on your profile",
      "Access to all 12 wisdom traditions",
      "1 prompt attempt per week",
      "Sincere gratitude from the path",
    ],
  },
  {
    id: "initiate" as Plan,
    icon: "☀️",
    name: "Initiate",
    subtitle: "Active Member",
    price: "$19",
    period: "/month",
    tagline: "For committed seekers ready to accelerate their inner journey with daily practice and AI-guided lessons.",
    highlight: true,
    color: "rgba(201,162,39,0.08)",
    borderColor: "rgba(201,162,39,0.45)",
    btnClass: "btn-sacred-gold",
    features: [
      "Full Initiate membership",
      "1 prompt attempt every day",
      "Faster level progression",
      "Personalized AI-generated lessons",
      "All 12 wisdom traditions",
      "Priority support",
      "Initiates-only insights & content",
    ],
  },
];

const FREE_FEATURES = [
  "Complete the personality assessment",
  "Access Step 1 lesson",
  "1 AI prompt attempt per week",
  "Track your XP and level",
  "View all 12 wisdom traditions",
];

export default function PricingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [error, setError]             = useState("");
  const [user, setUser]               = useState<{ id: string } | null | "loading">("loading");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setUser(d?.user || null));
  }, []);

  async function onChoose(plan: Plan) {
    if (user === "loading") return;
    if (!user) { router.push(`/register?plan=${plan}`); return; }
    setLoadingPlan(plan);
    setError("");
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) { setError(data.error || "Unable to start checkout."); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  function handleStartFree() {
    if (user === "loading") return;
    if (user) { router.push("/account"); } else { router.push("/register"); }
  }

  return (
    <SacredPage maxWidth={1020}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.8rem" }}>
          ✦ {t.pricing.choosePath} ✦
        </p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "1rem" }}>
          {t.pricing.title}
        </h1>
        <p style={{ fontSize: "1rem", color: "rgba(237,232,220,0.55)", maxWidth: 580, margin: "0 auto", lineHeight: 1.75 }}>
          The path is free to walk. Your support keeps this reflective space alive for all seekers.
          Active members unlock daily practice and faster progression.
        </p>
      </div>

      {error && <div style={{ maxWidth: 600, margin: "0 auto 1.5rem" }}><SacredAlert text={error} tone="error" /></div>}

      {/* Plans */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            style={{
              background: plan.color,
              border: `1px solid ${plan.borderColor}`,
              borderRadius: "1.4rem",
              padding: "2.2rem",
              position: "relative",
              boxShadow: plan.highlight ? "0 0 40px rgba(201,162,39,0.1), 0 20px 50px rgba(0,0,0,0.5)" : "none",
            }}
          >
            {plan.highlight && (
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                background: "linear-gradient(90deg, #c9a227, #f0d47a, #c9a227)",
                borderRadius: "2rem", padding: "0.25rem 1.2rem",
                fontSize: "0.62rem", letterSpacing: "0.3em", textTransform: "uppercase",
                color: "#04000c", fontWeight: 700, whiteSpace: "nowrap",
              }}>
                ✦ Active Member ✦
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.4rem" }}>
              <div style={{ fontSize: "2rem" }}>{plan.icon}</div>
              <div>
                <div className="font-sacred" style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{plan.name}</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: plan.highlight ? "var(--gold)" : "rgba(168,85,247,0.8)", textTransform: "uppercase" }}>{plan.subtitle}</div>
              </div>
            </div>

            <div style={{ margin: "0.8rem 0 0.4rem" }}>
              <span className="font-sacred" style={{ fontSize: "2.8rem", fontWeight: 900, color: plan.highlight ? "var(--gold-light)" : "var(--text-primary)" }}>
                {plan.price}
              </span>
              <span style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.45)" }}>{plan.period}</span>
            </div>

            <p style={{ fontSize: "0.8rem", color: "rgba(237,232,220,0.5)", marginBottom: "1.5rem", lineHeight: 1.65 }}>
              {plan.tagline}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.82rem", color: "rgba(237,232,220,0.75)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--gold)", flexShrink: 0, marginTop: "0.1rem" }}>✦</span> {f}
                </li>
              ))}
            </ul>

            <button
              className={`btn-sacred ${plan.btnClass}`}
              onClick={() => onChoose(plan.id)}
              disabled={loadingPlan !== null}
              style={{ width: "100%", padding: "0.85rem", fontSize: "0.85rem", letterSpacing: "0.1em" }}
            >
              {loadingPlan === plan.id ? t.billing.processing : plan.id === "seeker" ? t.billing.upgradeToSeeker : t.billing.upgradeToInitiate}
            </button>
          </article>
        ))}
      </div>

      {/* Free tier */}
      <SacredCard style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.2rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.3em", color: "rgba(237,232,220,0.4)", textTransform: "uppercase", marginBottom: "0.3rem" }}>Always Free</p>
            <h3 className="font-sacred" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>🌿 {t.pricing.freeTier}</h3>
            <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.45)", lineHeight: 1.6 }}>
              Begin your journey with no cost. Register, complete the personality assessment, and start walking the sacred path at your own pace.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {FREE_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "rgba(237,232,220,0.55)" }}>
                <span style={{ color: "rgba(237,232,220,0.3)" }}>○</span> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleStartFree}
            className="btn-sacred btn-sacred-ghost"
            style={{ padding: "0.6rem 1.4rem", fontSize: "0.78rem", alignSelf: "center", whiteSpace: "nowrap", border: "none", cursor: "pointer" }}
          >
            {user && user !== "loading" ? `${t.account.dashboard} →` : `${t.pricing.startFree} →`}
          </button>
        </div>
      </SacredCard>

      {/* FAQ */}
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1.2rem" }}>Common Questions</p>
        {[
          ["Is this a real religion?", "No. Join AI Religion is a fictional educational simulation for personal reflection and symbolic self-inquiry. It is not affiliated with any religious authority."],
          ["Can I cancel anytime?", "Yes. All memberships are month-to-month. Cancel at any time from your account dashboard."],
          ["What is the Seeker tier?", "The Seeker tier is a monthly donation to support the platform. It does not unlock additional features beyond the free tier — it is for those who wish to contribute."],
          ["How do I level up?", "Complete 12 lessons per level, each evaluated by the AI guide. Pass the reflection prompt with sufficient depth to unlock the next lesson."],
        ].map(([q, a]) => (
          <div key={q as string} style={{ marginBottom: "1.2rem", textAlign: "left", padding: "1rem 1.2rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.1)" }}>
            <p className="font-sacred" style={{ fontSize: "0.9rem", color: "var(--gold-light)", marginBottom: "0.4rem" }}>{q}</p>
            <p style={{ fontSize: "0.8rem", color: "rgba(237,232,220,0.5)", lineHeight: 1.7 }}>{a}</p>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: "2.5rem", fontSize: "0.68rem", color: "rgba(237,232,220,0.22)", letterSpacing: "0.1em" }}>
        FICTIONAL EDUCATIONAL PLATFORM · NOT A RELIGIOUS AUTHORITY · NOT MEDICAL ADVICE
      </p>
    </SacredPage>
  );
}
