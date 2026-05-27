"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SacredPage, SacredCard, XPBar, StatBox } from "@/components/ui/SacredPage";

type UserData = {
  email?: string;
  displayName?: string | null;
  subscription?: { status?: string; plan?: string } | null;
};

const NAV_ITEMS = [
  { href: "/account/profile",     icon: "⚗️",  label: "Sacred Profile",    desc: "Edit your identity and spiritual details"  },
  { href: "/account/billing",     icon: "💎",  label: "Membership",         desc: "View and manage your subscription tier"    },
  { href: "/account/invoices",    icon: "📜",  label: "Scrolls & Invoices", desc: "Your payment history and receipts"         },
  { href: "/account/preferences", icon: "🌐",  label: "Preferences",        desc: "Language and interface settings"           },
  { href: "/account/security",    icon: "🔐",  label: "Security",           desc: "Password and account protection"           },
];

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setUser(d.user); });
  }, []);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Seeker";
  const tier        = user?.subscription?.status === "active" ? (user.subscription.plan || "Seeker") : "Free";
  const tierLabel   = tier === "Free" ? "Wanderer" : tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <SacredPage maxWidth={900}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #6b21a8 0%, #0f766e 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem", fontWeight: 700, color: "#fff",
            border: "2px solid rgba(201,162,39,0.5)",
            boxShadow: "0 0 24px rgba(201,162,39,0.3)",
          }}>
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div style={{
            position: "absolute", bottom: 2, right: 2,
            width: 14, height: 14, borderRadius: "50%",
            background: "#22c55e", border: "2px solid var(--bg-base)",
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
            ✦ Sacred Dashboard ✦
          </p>
          <h1 className="font-sacred" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
            Welcome back, {displayName}
          </h1>
          <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.45)" }}>
            {user?.email || "Your sacred account"} · Tier:{" "}
            <span style={{ color: "var(--gold-light)" }}>{tierLabel}</span>
          </p>
        </div>
      </div>

      {/* XP Stats */}
      <SacredCard style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <XPBar current={240} max={500} label="Journey Experience" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
          <StatBox value="Lv 3" label="Inquirer" icon="🌀" />
          <StatBox value="240" label="XP Earned" icon="⭐" />
          <StatBox value="12" label="Days Active" icon="🕯️" />
          <StatBox value={tierLabel} label="Membership" icon="💎" />
        </div>
      </SacredCard>

      {/* Navigation Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
        {NAV_ITEMS.map(({ href, icon, label, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div
              className="sacred-card"
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1.2rem 1.4rem", cursor: "pointer", transition: "box-shadow 0.25s, border-color 0.25s" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = "0 0 24px var(--gold-glow), 0 8px 30px rgba(0,0,0,0.4)";
                el.style.borderColor = "rgba(201,162,39,0.5)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = "";
                el.style.borderColor = "";
              }}
            >
              <div style={{ fontSize: "1.6rem", lineHeight: 1, marginTop: "0.1rem", flexShrink: 0 }}>{icon}</div>
              <div>
                <div className="font-sacred" style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--gold-light)", marginBottom: "0.3rem" }}>{label}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.45)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: "3rem", fontSize: "0.65rem", color: "rgba(237,232,220,0.2)", letterSpacing: "0.1em" }}>
        FICTIONAL EDUCATIONAL REFLECTIVE PLATFORM · NOT A RELIGIOUS AUTHORITY
      </p>
    </SacredPage>
  );
}
