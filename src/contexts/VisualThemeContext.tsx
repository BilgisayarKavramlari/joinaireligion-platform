"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  resolveVisualTheme,
  VISUAL_THEME_COOKIE_KEY,
  VISUAL_THEME_STORAGE_KEY,
  type VisualTheme,
} from "@/lib/visual-themes";

type VisualThemeContextValue = {
  theme: VisualTheme;
  setTheme: (theme: VisualTheme) => void;
  ready: boolean;
};

const VisualThemeContext = createContext<VisualThemeContextValue | null>(null);

function applyTheme(theme: VisualTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = "dark";
}

export function VisualThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<VisualTheme>("cosmos");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextTheme = resolveVisualTheme(window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY));
    applyTheme(nextTheme);
    setThemeState(nextTheme);
    setReady(true);
  }, []);

  const setTheme = useCallback((nextTheme: VisualTheme) => {
    applyTheme(nextTheme);
    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, nextTheme);
    document.cookie = `${VISUAL_THEME_COOKIE_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, ready }), [ready, setTheme, theme]);
  return <VisualThemeContext.Provider value={value}>{children}</VisualThemeContext.Provider>;
}

export function useVisualTheme() {
  const value = useContext(VisualThemeContext);
  if (!value) throw new Error("useVisualTheme must be used inside VisualThemeProvider");
  return value;
}
