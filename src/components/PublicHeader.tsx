"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function PublicHeader() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [user, setUser] = useState<{ email?: string; displayName?: string | null } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setUser(d.user); })
      .catch(() => undefined);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }

  const initials = user
    ? (user.displayName || user.email || "U").split("@")[0].slice(0, 2).toUpperCase()
    : null;

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: scrolled ? "1px solid var(--border-gold)" : "1px solid transparent",
        background: scrolled ? "rgba(4,0,12,0.92)" : "rgba(4,0,12,0.55)",
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
          {[["Pricing", "/pricing"], ["Donate", "/donate"], ["Prompt Guide", "/prompt-guide"]].map(([l, h]) => (
            <Link key={l} href={h} className="nav-link">{l}</Link>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* User dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.38rem 0.75rem", borderRadius: "0.55rem",
                border: "1px solid var(--border-gold)",
                background: "rgba(201,162,39,0.04)",
                color: "var(--text-primary)", cursor: "pointer",
                fontSize: "0.78rem", transition: "all 0.2s",
              }}
            >
              {user ? (
                <>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #6b21a8, #0f766e)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.62rem", fontWeight: 700, color: "#fff",
                  }}>{initials}</div>
                  <span style={{ color: "var(--gold-light)" }}>Account</span>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>↗</span>
                  <span style={{ color: "rgba(237,232,220,0.7)" }}>Login</span>
                </>
              )}
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)", width: 190,
                borderRadius: "0.85rem", border: "1px solid var(--border-gold)",
                background: "rgba(6,2,14,0.97)", backdropFilter: "blur(16px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.75), 0 0 28px var(--gold-glow)",
                overflow: "hidden", zIndex: 100,
              }}>
                {user ? (
                  <>
                    <Link href="/account"         className="menu-link" onClick={() => setMenuOpen(false)}>My Account</Link>
                    <Link href="/account/billing" className="menu-link" onClick={() => setMenuOpen(false)}>Billing</Link>
                    <button onClick={logout} className="menu-link" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login"    className="menu-link" onClick={() => setMenuOpen(false)}>Login</Link>
                    <Link href="/register" className="menu-link" onClick={() => setMenuOpen(false)}>Begin Journey</Link>
                  </>
                )}
              </div>
            )}
          </div>

          {!user && (
            <Link href="/register" className="btn-sacred btn-sacred-gold" style={{ padding: "0.42rem 1rem", fontSize: "0.7rem" }}>
              Begin
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="header-mobile-btn"
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
        <div style={{
          borderTop: "1px solid var(--border-gold)", padding: "0.9rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0.4rem",
        }}>
          {[["Pricing","/pricing"],["Donate","/donate"],["Prompt Guide","/prompt-guide"],["Login","/login"],["Begin Journey","/register"]].map(([l,h]) => (
            <Link key={l} href={h} className="nav-link" onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "0.55rem 0.8rem" }}>{l}</Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .header-desktop-nav { display: none !important; }
          .header-mobile-btn  { display: block !important; }
        }
      `}</style>
    </header>
  );
}
