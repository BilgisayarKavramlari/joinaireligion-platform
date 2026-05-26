"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { messages, resolveLocale, type Locale } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function PublicHeader() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const cookieLocale = document.cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith("ui_locale="))?.split("=")[1];
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="logo" width={30} height={30} />
          <span className="font-semibold text-white">Join AI Religion</span>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          <Button href="/pricing" variant="ghost">{t.nav.pricing}</Button>
          <Button href="/donate" variant="ghost">{t.nav.donate}</Button>
          <Button href="/prompt-guide" variant="ghost">{t.nav.promptGuide}</Button>
          <Button href="/login" variant="ghost">{t.nav.login}</Button>
          <Button href="/register">{t.nav.register}</Button>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} onChange={setLang} />
        </div>
      </div>
    </header>
  );
}
