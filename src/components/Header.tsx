"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { locales, messages, resolveLocale, type Locale } from "@/lib/i18n/translations";

export default function Header() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const fromStorage = localStorage.getItem("ui_locale");
    const detected = resolveLocale(fromStorage || navigator.language);
    setLocale(detected);
    localStorage.setItem("ui_locale", detected);
  }, []);
  const t = messages[locale];
  const onChange = (v: string) => { const l = resolveLocale(v); setLocale(l); localStorage.setItem("ui_locale", l); document.cookie = `ui_locale=${l}; path=/`; };
  return <header className="border-b border-slate-800 bg-slate-950/90"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-slate-100"><Link href="/" className="font-semibold">{t.appName}</Link><div className="flex items-center gap-3"><select aria-label={t.language} value={locale} onChange={e=>onChange(e.target.value)} className="rounded bg-slate-900 px-2 py-1">{locales.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select><Link href="/login">{t.login}</Link><Link href="/register" className="rounded bg-violet-600 px-3 py-1">{t.register}</Link><div className="h-8 w-8 rounded-full bg-slate-700 text-center leading-8">U</div></div></div></header>;
}
