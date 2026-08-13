"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getLandingMessages,
  normalizeLocale,
  supportedLocales,
  type Locale,
} from "@/lib/landingContent";

type User = {
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("preferredLocale");
  if (stored) return normalizeLocale(stored);
  return normalizeLocale(window.navigator.language);
}

function getInitials(user?: User | null) {
  const base = user?.displayName || user?.email || "U";
  return base.split("@")[0].slice(0, 2).toUpperCase();
}

export default function PremiumHeader({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (value: Locale) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const t = getLandingMessages(locale);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => undefined);
  }, []);

  function onLocaleChange(next: Locale) {
    localStorage.setItem("preferredLocale", next);
    document.documentElement.lang = next;
    setLocale(next);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060915]/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-11 w-11 rounded-full border border-amber-200/30 bg-amber-200/5">
            <div className="absolute inset-2 rounded-full border border-violet-200/30" />
            <div className="absolute inset-[14px] rounded-full bg-gradient-to-br from-amber-200 via-violet-200 to-cyan-200 shadow-[0_0_26px_rgba(253,230,138,0.45)]" />
          </div>
          <div>
            <div className="font-serif text-xl text-amber-100">{t.appName}</div>
            <div className="hidden text-[11px] uppercase tracking-[0.25em] text-slate-500 sm:block">
              symbolic reflection
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          <Link href="/companion" className="nav-link">Ask &amp; Reflect</Link>
          <Link href="/pricing" className="nav-link">{t.nav.pricing}</Link>
          <Link href="/donate" className="nav-link">{t.nav.donate}</Link>
          <Link href="/prompt-guide" className="nav-link">{t.nav.promptGuide}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <select
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
          >
            {supportedLocales.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white lg:hidden"
          >
            ☰
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-white"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-xl object-cover" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
                  {user ? getInitials(user) : "↗"}
                </span>
              )}
              <span className="hidden sm:inline">{user ? t.nav.account : t.nav.login}</span>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] shadow-2xl shadow-black/50">
                {user ? (
                  <>
                    <Link href="/account" className="menu-link">{t.nav.account}</Link>
                    <Link href="/account/billing" className="menu-link">{t.nav.billing}</Link>
                    <button onClick={logout} className="menu-link w-full text-left">{t.nav.logout}</button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="menu-link">{t.nav.login}</Link>
                    <Link href="/register" className="menu-link">{t.nav.register}</Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 px-5 py-3 lg:hidden">
          <div className="flex flex-col gap-2">
            <Link href="/companion" className="nav-link">Ask &amp; Reflect</Link>
            <Link href="/pricing" className="nav-link">{t.nav.pricing}</Link>
            <Link href="/donate" className="nav-link">{t.nav.donate}</Link>
            <Link href="/prompt-guide" className="nav-link">{t.nav.promptGuide}</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function useLandingLocale() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const next = getInitialLocale();
    setLocale(next);
    document.documentElement.lang = next;
  }, []);

  return [locale, setLocale] as const;
}
