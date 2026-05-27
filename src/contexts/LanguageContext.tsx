"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { LANGUAGES, getDict, type LangCode, type Dict } from "@/lib/i18n/dict";

interface LanguageContextValue {
  lang: LangCode;
  dict: Dict;
  setLang: (code: LangCode) => void;
  t: Dict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const COOKIE_NAME = "jair_lang";
const STORAGE_KEY = "jair_lang";

function detectInitialLang(): LangCode {
  if (typeof window === "undefined") return "en";
  // 1. localStorage
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored && stored in LANGUAGES) return stored;
  // 2. cookie
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (match && match[1] in LANGUAGES) return match[1] as LangCode;
  // 3. browser language
  const browserLang = navigator.language.slice(0, 2) as LangCode;
  if (browserLang in LANGUAGES) return browserLang;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  const setLang = useCallback((code: LangCode) => {
    if (!(code in LANGUAGES)) return;
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
    document.cookie = `${COOKIE_NAME}=${code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    // Update html dir for RTL
    document.documentElement.setAttribute("dir", LANGUAGES[code].lang.dir);
    document.documentElement.setAttribute("lang", code);
  }, []);

  useEffect(() => {
    const dict = getDict(lang);
    document.documentElement.setAttribute("dir", dict.lang.dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const dict = getDict(lang);

  return (
    <LanguageContext.Provider value={{ lang, dict, setLang, t: dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
