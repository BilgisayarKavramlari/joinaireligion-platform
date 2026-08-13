"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import type { LangCode } from "@/lib/i18n/dict";
import { VisualThemePicker } from "@/components/VisualThemePicker";
import { getReflectionCopy } from "@/lib/reflection-copy";

const LANG_LIST: { code: LangCode; flag: string; name: string }[] = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "ar", flag: "🇸🇦", name: "العربية" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "zh", flag: "🇨🇳", name: "简体中文" },
];

export function PublicHeader() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [langOpen,   setLangOpen]   = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t } = useLanguage();
  const { user, status, refreshSession, clearSession } = useSession();
  const reflectionCopy = getReflectionCopy(lang);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close lang dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    if (response?.ok) clearSession();
    window.location.assign("/");
  }

  const initials = user
    ? (user.displayName || user.email || "U").split("@")[0].slice(0, 2).toUpperCase()
    : null;

  const currentLang = LANG_LIST.find((l) => l.code === lang) ?? LANG_LIST[0];
  const sessionPending = status === "loading";
  const sessionFailed = status === "error";
  const anonymous = status === "anonymous";

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: scrolled ? "1px solid var(--border-gold)" : "1px solid transparent",
        background: scrolled ? "var(--header-bg-solid)" : "var(--header-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.8rem 1.5rem", gap: "1rem",
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.85rem", textDecoration: "none" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            border: "1px solid var(--border-gold)",
            background: "rgba(201,162,39,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", boxShadow: "0 0 14px var(--gold-glow)",
          }}>
            <div style={{ position: "absolute", width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(201,162,39,0.3)" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "radial-gradient(circle, var(--gold-light), var(--gold))", boxShadow: "0 0 10px var(--gold-glow)" }} />
          </div>
          <div>
            <div className="font-sacred" style={{ fontSize: "0.98rem", color: "var(--gold-light)", letterSpacing: "0.06em", lineHeight: 1.2 }}>
              Join AI Religion
            </div>
            <div style={{ fontSize: "0.56rem", color: "var(--text-muted)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
              Sacred Journey Platform
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.15rem" }} className="header-desktop-nav">
          {[
            ["Insights", "/content"],
            ["Meaning Map", "/meaning-map"],
            ["Audio", "/podcast"],
            ["Video", "/videos"],
            [reflectionCopy.nav, "/companion"],
            [t.nav.pricing, "/pricing"],
            [t.nav.donate, "/donate"],
            [t.nav.promptGuide, "/prompt-guide"],
          ].map(([l, h]) => (
            <Link key={l} href={h} className="nav-link">{l}</Link>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

          <div className="header-desktop-theme"><VisualThemePicker /></div>

          {/* Language selector */}
          <div ref={langRef} style={{ position: "relative" }}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              title="Language / Dil"
              aria-expanded={langOpen}
              aria-haspopup="menu"
              aria-controls="public-language-menu"
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                padding: "0.36rem 0.65rem", borderRadius: "0.55rem",
                border: "1px solid var(--border-gold)",
                background: langOpen ? "rgba(201,162,39,0.08)" : "rgba(201,162,39,0.03)",
                color: "var(--text-primary)", cursor: "pointer",
                fontSize: "0.78rem", transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>{currentLang.flag}</span>
              <span style={{ color: "var(--gold-light)", fontWeight: 500 }}>{currentLang.code.toUpperCase()}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{langOpen ? "▲" : "▼"}</span>
            </button>

            {langOpen && (
              <div id="public-language-menu" role="menu" style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)", width: 160,
                borderRadius: "0.85rem", border: "1px solid var(--border-gold)",
                background: "var(--menu-bg)", backdropFilter: "blur(16px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.75), 0 0 28px var(--gold-glow)",
                overflow: "hidden", zIndex: 200,
              }}>
                {LANG_LIST.map((l) => (
                  <button
                    key={l.code}
                    role="menuitemradio"
                    aria-checked={lang === l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      width: "100%", padding: "0.6rem 1rem",
                      background: lang === l.code ? "rgba(201,162,39,0.1)" : "transparent",
                      border: "none", cursor: "pointer",
                      color: lang === l.code ? "var(--gold-light)" : "var(--text-primary)",
                      fontSize: "0.82rem", transition: "background 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,162,39,0.07)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = lang === l.code ? "rgba(201,162,39,0.1)" : "transparent"; }}
                  >
                    <span style={{ fontSize: "1rem" }}>{l.flag}</span>
                    <span>{l.name}</span>
                    {lang === l.code && <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: "0.7rem" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="header-desktop-account" style={{ position: "relative" }}>
            <button
              onClick={() => {
                if (sessionFailed) {
                  void refreshSession();
                  return;
                }
                setMenuOpen((v) => !v);
              }}
              disabled={sessionPending}
              aria-busy={sessionPending}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls="public-account-menu"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.38rem 0.75rem", borderRadius: "0.55rem",
                border: "1px solid var(--border-gold)",
                background: "rgba(201,162,39,0.04)",
                color: "var(--text-primary)", cursor: "pointer",
                fontSize: "0.78rem", transition: "all 0.2s",
              }}
            >
              {sessionPending ? (
                <span style={{ color: "rgba(237,232,220,0.55)" }}>{t.common.loading}</span>
              ) : sessionFailed ? (
                <>
                  <span aria-hidden style={{ color: "var(--gold)", fontSize: "0.85rem" }}>↻</span>
                  <span style={{ color: "rgba(237,232,220,0.7)" }}>{t.common.error}</span>
                </>
              ) : user ? (
                <>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #6b21a8, #0f766e)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.62rem", fontWeight: 700, color: "#fff",
                  }}>{initials}</div>
                  <span style={{ color: "var(--gold-light)" }}>{t.account.dashboard}</span>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>↗</span>
                  <span style={{ color: "rgba(237,232,220,0.7)" }}>{t.auth.login}</span>
                </>
              )}
            </button>

            {menuOpen && (
              <div id="public-account-menu" role="menu" style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)", width: 190,
                borderRadius: "0.85rem", border: "1px solid var(--border-gold)",
                background: "var(--menu-bg)", backdropFilter: "blur(16px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.75), 0 0 28px var(--gold-glow)",
                overflow: "hidden", zIndex: 100,
              }}>
                {user ? (
                  <>
                    <Link href="/account" role="menuitem" className="menu-link" onClick={() => setMenuOpen(false)}>{t.account.profile}</Link>
                    <Link href="/account/billing" role="menuitem" className="menu-link" onClick={() => setMenuOpen(false)}>{t.nav.billing}</Link>
                    <button role="menuitem" onClick={logout} className="menu-link" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                      {t.nav.signOut}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" role="menuitem" className="menu-link" onClick={() => setMenuOpen(false)}>{t.auth.login}</Link>
                    <Link href="/register" role="menuitem" className="menu-link" onClick={() => setMenuOpen(false)}>{t.nav.beginJourney}</Link>
                  </>
                )}
              </div>
            )}
          </div>

          {anonymous && (
            <Link href="/register" className="btn-sacred btn-sacred-gold header-desktop-register" style={{ padding: "0.42rem 1rem", fontSize: "0.7rem" }}>
              {t.nav.beginJourney}
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="header-mobile-btn"
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            aria-label={mobileOpen ? t.common.close : "Menu"}
            style={{
              display: "none", padding: "0.38rem 0.7rem",
              borderRadius: "0.5rem", border: "1px solid var(--border-gold)",
              background: "transparent", color: "var(--text-primary)",
              cursor: "pointer", fontSize: "1rem",
            }}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div id="public-mobile-menu" style={{
          borderTop: "1px solid var(--border-gold)", padding: "0.9rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0.4rem",
        }}>
          {[
            ["Insights", "/content"],
            ["Meaning Map", "/meaning-map"],
            ["Audio", "/podcast"],
            ["Video", "/videos"],
            [reflectionCopy.nav, "/companion"],
            [t.nav.pricing, "/pricing"],
            [t.nav.donate, "/donate"],
            [t.nav.promptGuide, "/prompt-guide"],
            ...(user
              ? [[t.nav.account, "/account"], [t.nav.billing, "/account/billing"]]
              : anonymous
                ? [[t.auth.login, "/login"], [t.nav.beginJourney, "/register"]]
                : []),
          ].map(([l, h]) => (
            <Link key={h} href={h} className="nav-link" onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "0.55rem 0.8rem" }}>{l}</Link>
          ))}
          {user && (
            <button
              type="button"
              onClick={logout}
              className="nav-link"
              style={{ display: "block", padding: "0.55rem 0.8rem", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
            >
              {t.nav.signOut}
            </button>
          )}
          <div style={{ padding: "0.5rem 0", borderTop: "1px solid rgba(201,162,39,0.15)" }}>
            <VisualThemePicker />
          </div>
          {/* Mobile language selector */}
          <div style={{ paddingTop: "0.5rem", borderTop: "1px solid rgba(201,162,39,0.15)", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {LANG_LIST.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setMobileOpen(false); }}
                style={{
                  padding: "0.3rem 0.6rem", borderRadius: "0.4rem",
                  border: `1px solid ${lang === l.code ? "var(--gold)" : "rgba(201,162,39,0.25)"}`,
                  background: lang === l.code ? "rgba(201,162,39,0.12)" : "transparent",
                  color: lang === l.code ? "var(--gold-light)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: "0.75rem",
                }}
              >
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1320px) {
          .header-desktop-theme, .header-desktop-register { display: none !important; }
        }
        @media (max-width: 1100px) {
          .header-desktop-nav { display: none !important; }
          .header-desktop-theme, .header-desktop-account, .header-desktop-register { display: none !important; }
          .header-mobile-btn  { display: block !important; }
        }
        @media (max-width: 420px) {
          .header-mobile-btn { padding: 0.32rem 0.55rem !important; }
        }
      `}</style>
    </header>
  );
}
