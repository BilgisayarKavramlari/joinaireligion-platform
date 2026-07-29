"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type Plan = "seeker" | "initiate";
type Currency = "auto" | "usd" | "try";

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
    price: "$10/mo",
    icon: "🌙",
    color: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.35)",
    features: ["Monthly support donation", "Supporter badge on profile", "1 prompt attempt per week", "Access to all 12 traditions"],
  },
  {
    id: "initiate" as Plan,
    name: "Initiate",
    subtitle: "Active Membership",
    price: "$25/mo",
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
  const { t } = useLanguage();
  const [user,    setUser]    = useState<UserData | null>(null);
  const [loading, setLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [currency, setCurrency] = useState<Currency>("auto");
  const [catalog, setCatalog] = useState<Record<Plan, Partial<Record<Exclude<Currency, "auto">, number | null>>> | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<Exclude<Currency, "auto">>>(["usd"]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.user) { router.push("/login"); return; }
        setUser(d.user);
      });
  }, [router]);

  useEffect(() => {
    fetch("/api/stripe/catalog")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.plans) return;
        setCatalog(Object.fromEntries(data.plans.map((item: { plan: Plan; amounts: Partial<Record<Exclude<Currency, "auto">, number | null>> }) => [item.plan, item.amounts])) as Record<Plan, Partial<Record<Exclude<Currency, "auto">, number | null>>>);
        if (Array.isArray(data.currencies)) {
          setAvailableCurrencies(data.currencies.filter((item: unknown): item is Exclude<Currency, "auto"> => item === "usd" || item === "try"));
        }
      })
      .catch(() => undefined);
  }, []);

  async function onUpgrade(plan: Plan) {
    setLoading(plan);
    setError("");
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, currency }) });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) { setError(data.error || "Unable to start checkout."); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function onManageSubscription() {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Unable to open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const subStatus = user?.subscription?.status || "TRIAL";
  const isActive  = subStatus === "ACTIVE";

  function displayPrice(plan: Plan) {
    const shownCurrency = currency === "auto" ? "usd" : currency;
    const amount = catalog?.[plan]?.[shownCurrency];
    if (typeof amount === "number") {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: shownCurrency.toUpperCase(), maximumFractionDigits: amount % 100 === 0 ? 0 : 2 }).format(amount / 100);
    }
    if (shownCurrency === "usd") return plan === "seeker" ? "$10/mo" : "$25/mo";
    return "TRY shown at checkout";
  }

  return (
    <SacredPage maxWidth={860}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← {t.account.dashboard}
        </Link>
      </div>

      <SacredHeading
        label="Sacred Membership"
        title={t.billing.title}
        subtitle={t.billing.subtitle}
      />

      {/* Current plan status */}
      <SacredCard style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "2rem" }}>{isActive ? "☀️" : "🌿"}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.68rem", letterSpacing: "0.3em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.2rem" }}>{t.billing.currentPlan}</p>
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
            <button
              type="button"
              onClick={onManageSubscription}
              disabled={portalLoading}
              className="btn-sacred btn-sacred-ghost"
              style={{ textDecoration: "none", padding: "0.55rem 1.1rem", fontSize: "0.78rem" }}
            >
              {portalLoading ? "Opening…" : "Manage Subscription"}
            </button>
          )}
        </div>
      </SacredCard>

      {error && <div style={{ marginBottom: "1rem" }}><SacredAlert text={error} tone="error" /></div>}

      {!isActive && (
        <>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.2rem" }} aria-label="Payment currency">
          {(["auto", ...availableCurrencies] as Currency[]).map((item) => (
            <button key={item} type="button" onClick={() => setCurrency(item)} aria-pressed={currency === item} className={currency === item ? "btn-sacred btn-sacred-gold" : "btn-sacred btn-sacred-ghost"} style={{ padding: "0.45rem 0.9rem", fontSize: "0.76rem" }}>
              {item === "auto" ? "Local currency" : item === "try" ? "TRY / TL" : "USD"}
            </button>
          ))}
        </div>
        {currency === "auto" && <p style={{ textAlign: "center", margin: "-0.6rem 0 1.2rem", color: "var(--text-muted)", fontSize: "0.74rem" }}>Stripe shows an eligible local currency at secure checkout.</p>}
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
                {displayPrice(plan.id)}
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
                {loading === plan.id ? t.billing.processing : plan.id === "seeker" ? t.billing.upgradeToSeeker : t.billing.upgradeToInitiate}
              </button>
            </div>
          ))}
        </div>
        </>
      )}

      <div style={{ marginTop: "2rem" }}>
        <SacredAlert
          text={`${t.billing.stripeNote} ${t.billing.cancelNote}`}
          tone="info"
        />
      </div>
    </SacredPage>
  );
}
