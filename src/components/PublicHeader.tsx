"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { messages, resolveLocale, type Locale } from "@/lib/i18n/translations";

export function PublicHeader() {
  const [locale, setLocale] = useState<Locale>("en");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const cookieLocale = document.cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("ui_locale="))
      ?.split("=")[1];

    const next = resolveLocale(localStorage.getItem("ui_locale") || cookieLocale || navigator.language);
    setLocale(next);
  }, []);

  const t = messages[locale];

  const setLang = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("ui_locale", l);
    document.cookie = `ui_locale=${l}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="logo" width={32} height={32} />
          <span className="text-xl font-semibold tracking-wide text-amber-100">Join AI Religion</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Button href="/pricing" variant="ghost">{t.nav.pricing}</Button>
          <Button href="/donate" variant="ghost">{t.nav.donate}</Button>
          <Button href="/prompt-guide" variant="ghost">{t.nav.promptGuide}</Button>
          <Button href="/login" variant="ghost">{t.nav.login}</Button>
          <Button href="/register">{t.nav.register}</Button>
          <Button href="/account" variant="ghost">My Account</Button>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} onChange={setLang} />
          <button
            className="rounded-lg border border-white/20 px-3 py-2 text-sm md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            type="button"
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mx-4 mb-3 space-y-2 rounded-xl border border-white/10 bg-slate-900/90 p-3 md:hidden">
          <Button href="/pricing" variant="ghost" className="w-full">{t.nav.pricing}</Button>
          <Button href="/donate" variant="ghost" className="w-full">{t.nav.donate}</Button>
          <Button href="/prompt-guide" variant="ghost" className="w-full">{t.nav.promptGuide}</Button>
          <Button href="/login" variant="ghost" className="w-full">{t.nav.login}</Button>
          <Button href="/register" className="w-full">{t.nav.register}</Button>
        </div>
      )}
    </header>
  );
}
