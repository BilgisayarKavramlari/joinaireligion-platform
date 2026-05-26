"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { locales, messages, resolveLocale, type Locale } from "@/lib/i18n/translations";

export default function Header() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const c = document.cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith("ui_locale="))?.split("=")[1];
    const l = resolveLocale(localStorage.getItem("ui_locale") || c || navigator.language);
    setLocale(l); localStorage.setItem("ui_locale", l);
  }, []);
  const t = messages[locale];
  const onLang = (value: string) => { const l = resolveLocale(value); setLocale(l); localStorage.setItem("ui_locale", l); document.cookie = `ui_locale=${l}; path=/; max-age=31536000`; };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="logo" width={30} height={30} />
          <span className="font-semibold text-white">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link className="btn-ghost" href="/pricing">{t.pricing}</Link>
          <Link className="btn-ghost" href="/donate">{t.donate}</Link>
          <select value={locale} onChange={(e) => onLang(e.target.value)} className="rounded-lg bg-slate-900 px-2 py-2">{locales.map((l) => <option key={l}>{l}</option>)}</select>
          <Link className="btn-ghost" href="/login">{t.login}</Link>
          <Link className="btn-primary" href="/register">{t.register}</Link>
          <Link href="/account/profile" className="h-9 w-9 rounded-full bg-violet-700 text-center leading-9">U</Link>
        </div>
      </div>
    </header>
  );
}
