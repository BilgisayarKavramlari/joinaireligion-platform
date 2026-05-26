"use client";
import { locales, resolveLocale, type Locale } from "@/lib/i18n/translations";

export function LanguageSwitcher({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  return (
    <select
      value={locale}
      onChange={(e) => onChange(resolveLocale(e.target.value))}
      className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white"
      aria-label="language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{l.toUpperCase()}</option>
      ))}
    </select>
  );
}
