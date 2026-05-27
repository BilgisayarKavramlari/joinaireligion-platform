"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import { useRouter } from "next/navigation";

type Plan = "seeker" | "initiate";

interface UserData {
  id: string;
  displayName?: string;
  currentLevel: number;
  subscription?: { status: string; currentPeriodEnd?: string; trialEndsAt?: string };
}

const PLANS = [
  {
    id: "seeker" as Plan,
    name: "Seeker",
    subtitle: "Supporter Donation",
    price: "$9/mo",
    icon: "🌙",
    color: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.35)",
    features: ["Monthly support donation", "Supporter badge on profile", "1 prompt attempt per week", "Access to all 12 traditions"],
  },
  {
    id: "initiate" as Plan,
    name: "Initiate",
    subtitle: "Active Membership",
    price: "$19/mo",
    icon: "☀️",
    color: "rgba(201,162,39,0.08)",
    border: "rgba(201,162,39,0.4)",
    features: ["Full active membership", "1 prompt attempt per day", "Personalized AI-generated lessons", "All 12 wisdom traditions", "Priority support"],
  },
];

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Free — Wanderer",
  ACTIVE: "Active Member",
  PAST_DUE: "Past Due",
  CANCELED: "Canceled",
};

export default function BillingPage() {
  const router  = useRouter();
  const [user,    setUser]    = useState<UserData | null>(null);
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.user) { router.push("/login"); return; }
        setUser(d.user);
      });
  }, [router]);

  async function onUpgrade(plan: Plan) {
    setLoading(plan);
    setError("");
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) { setError(data.error || "Unable to start checkout."); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const subStatus = user?.subscription?.status || "TRIAL";
  const isActive  = subStatus === "ACTIVE";

  return (
    <SacredPage maxWidth={860}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← Account Dashboard
        </Link>
      </div>

      <SacredHeading
        label="Sacred Membership"
        title="Your Membership"
        subtitle="Support the path or unlock active membership for daily practice."
      />

      {/* Current plan status */}
      <SacredCard style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "2rem" }}>{isActive ? "☀️" : "🌿"}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.68rem", letterSpacing: "0.3em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.2rem" }}>Current Plan</p>
            <p className="font-sacred" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {STATUS_LABEL[subStatus] || "Free"}
            </p>
            {isActive && user?.subscription?.currentPeriodEnd && (
              <p style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)" }}>
                Renews: {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {!isActive && (
              <p style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.4)" }}>
                Level {user?.currentLevel || 1} · 1 prompt attempt per week
              </p>
            )}
          </div>
          {isActive && (
            <a
              href="https://billing.stripe.com/p/login/test_00000000"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sacred btn-sacred-ghost"
              style={{ textDecoration: "none", padding: "0.55rem 1.1rem", fontSize: "0.78rem" }}
            >
              Manage Subscription
            </a>
          )}
        </div>
      </SacredCard>

      {error && <div style={{ marginBottom: "1rem" }}><SacredAlert text={error} tone="error" /></div>}

      {!isActive && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.2rem" }}>
          {PLANS.map((plan) => (
            <div key={plan.id} style={{ background: plan.color, border: `1px solid ${plan.border}`, borderRadius: "1.1rem", padding: "1.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.4rem" }}>
                <div style={{ fontSize: "1.8rem" }}>{plan.icon}</div>
                <div>
                  <div className="font-sacred" style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-primary)" }}>{plan.name}</div>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: plan.id === "initiate" ? "var(--gold)" : "rgba(168,85,247,0.8)", textTransform: "uppercase" }}>{plan.subtitle}</div>
                </div>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: plan.id === "initiate" ? "var(--gold-light)" : "var(--text-primary)", margin: "0.5rem 0 1rem" }}>
                {plan.price}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem", color: "rgba(237,232,220,0.75)" }}>
                    <span style={{ color: "var(--gold)", flexShrink: 0 }}>✦</span> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`btn-sacred ${plan.id === "initiate" ? "btn-sacred-gold" : "btn-sacred-violet"}`}
                onClick={() => onUpgrade(plan.id)}
                disabled={loading !== null}
                style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem" }}
              >
                {loading === plan.id ? "Redirecting to Stripe…" : plan.id === "seeker" ? "Support the Path" : "Become an Initiate"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <SacredAlert
          text="All payments are processed securely through Stripe. Cancel anytime — no questions asked."
          tone="info"
        />
      </div>
    </SacredPage>
  );
}
