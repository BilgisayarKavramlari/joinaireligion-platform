"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SacredPage, SacredCard, XPBar, StatBox } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { levelForXp, levelTitle, xpCeilingForLevel } from "@/lib/journey-types";
import { getJourneyPlannerCopy } from "@/lib/journey-planner-copy";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const { t, lang } = useLanguage();
  const plannerCopy = getJourneyPlannerCopy(lang);
  const router = useRouter();
  const { user, status } = useSession();

  useEffect(() => {
    if (status === "anonymous") router.push("/login");
    if (status === "authenticated" && user?.requiresOnboarding) router.push("/onboarding");
  }, [router, status, user]);

  if (!user) {
    return (
      <SacredPage maxWidth={900}>
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>{t.common.loading}</div>
      </SacredPage>
    );
  }

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Seeker";
  const tier        = user?.subscription?.status === "ACTIVE" ? (user.subscription.plan || "Seeker") : "Free";
  const tierLabel   = tier === "Free" ? "Wanderer" : tier.charAt(0).toUpperCase() + tier.slice(1);

  // Real account stats — default to clean new-user state (level 1, 0 XP, 0 days)
  const xpTotal      = user?.xpTotal      ?? 0;
  const currentLevel = levelForXp(xpTotal);
  const daysActive   = user?.daysActive   ?? 0;
  const xpMax        = xpCeilingForLevel(currentLevel);
  const levelName    = levelTitle(currentLevel);

  const NAV_ITEMS = [
    { href: "/account/profile",     icon: "⚗️",  label: t.account.profile,      desc: t.account.profileDesc      },
    { href: "/account/billing",     icon: "💎",  label: t.account.membership,   desc: t.account.membershipDesc   },
    { href: "/prompt-guide",        icon: "🧭",  label: t.account.yourJourney,  desc: t.account.yourJourneyDesc  },
    { href: "/account/journey",     icon: "📅",  label: plannerCopy.navTitle,    desc: plannerCopy.navDescription },
    { href: "/account/support",     icon: "💬",  label: t.account.support,      desc: t.account.supportDesc      },
    { href: "/account/invoices",    icon: "📜",  label: t.account.invoices,     desc: t.account.invoicesDesc     },
    { href: "/account/preferences", icon: "🌐",  label: t.account.preferences,  desc: t.account.preferencesDesc  },
    { href: "/account/security",    icon: "🔐",  label: t.account.security,     desc: t.account.securityDesc     },
  ];

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
            ✦ {t.account.dashboard} ✦
          </p>
          <h1 className="font-sacred" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
            {t.account.welcomeBack.replace("{name}", displayName)}
          </h1>
          <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.45)" }}>
            {user?.email || "Your sacred account"} · Membership:{" "}
            <span style={{ color: "var(--gold-light)" }}>{tierLabel}</span>
          </p>
        </div>
      </div>

      {/* XP Stats — sourced from real account data */}
      <SacredCard style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <XPBar current={xpTotal} max={xpMax} label="Journey Experience" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
          <StatBox value={`Lv ${currentLevel}`} label={levelName}              icon="🌀" />
          <StatBox value={String(xpTotal)}       label={t.account.xpEarned}    icon="⭐" />
          <StatBox value={String(daysActive)}    label={t.account.daysActive}  icon="🕯️" />
          <StatBox value={tierLabel}             label={t.account.membership_label} icon="💎" />
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
