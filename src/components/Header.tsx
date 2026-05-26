"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { locales, messages, resolveLocale, type Locale } from "@/lib/i18n/translations";

export default function Header() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const fromStore = localStorage.getItem("ui_locale");
    const fromCookie = document.cookie.split(";").map(v=>v.trim()).find(v=>v.startsWith("ui_locale="))?.split("=")[1];
    const detected = resolveLocale(fromStore || fromCookie || navigator.language);
    setLocale(detected);
    localStorage.setItem("ui_locale", detected);
  }, []);
  const t = messages[locale];
  const setLang = (v: string) => { const l=resolveLocale(v); setLocale(l); localStorage.setItem("ui_locale", l); document.cookie=`ui_locale=${l}; path=/; max-age=31536000`; };
  return <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3"><Link href="/" className="font-semibold text-white">{t.appName}</Link><nav className="flex items-center gap-2 text-sm"><Link className="rounded px-3 py-2 hover:bg-white/10" href="/pricing">{t.pricing}</Link><Link className="rounded px-3 py-2 hover:bg-white/10" href="/donate">{t.donate}</Link><select aria-label={t.language} value={locale} onChange={(e)=>setLang(e.target.value)} className="rounded bg-slate-900 px-2 py-2">{locales.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select><Link className="rounded px-3 py-2 hover:bg-white/10" href="/login">{t.login}</Link><Link className="rounded bg-violet-600 px-3 py-2 text-white" href="/register">{t.register}</Link><div className="h-8 w-8 rounded-full bg-slate-700 text-center leading-8 text-white">U</div></nav></div></header>;
}
