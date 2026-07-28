import en from "@/i18n/messages/en";
import tr from "@/i18n/messages/tr";
import es from "@/i18n/messages/es";
import de from "@/i18n/messages/de";
import fr from "@/i18n/messages/fr";
import ru from "@/i18n/messages/ru";
import zh from "@/i18n/messages/zh";

export const locales = ["en", "tr", "es", "de", "fr", "ru", "zh"] as const;
export type Locale = (typeof locales)[number];

export const messages = { en, tr, es, de, fr, ru, zh };

export function resolveLocale(input?: string | null): Locale {
  const n = (input || "en").toLowerCase().slice(0, 2);
  return (locales as readonly string[]).includes(n) ? (n as Locale) : "en";
}
