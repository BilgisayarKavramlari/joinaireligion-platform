"use client";

import { useEffect, useRef, useState } from "react";
import { useVisualTheme } from "@/contexts/VisualThemeContext";
import { VISUAL_THEMES } from "@/lib/visual-themes";

export function VisualThemePicker({ compact = true }: { compact?: boolean }) {
  const { theme, setTheme, ready } = useVisualTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = VISUAL_THEMES.find((item) => item.id === theme) ?? VISUAL_THEMES[0];

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="theme-picker-trigger"
        onClick={() => setOpen((value) => !value)}
        disabled={!ready}
        aria-label="Visual theme"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="visual-theme-menu"
        title={`Theme: ${current.label}`}
      >
        <span aria-hidden className="theme-picker-orb" style={{ background: `linear-gradient(135deg, ${current.swatches.join(", ")})` }} />
        {!compact && <span>{current.label}</span>}
        <span aria-hidden className="theme-picker-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div id="visual-theme-menu" role="menu" className="theme-picker-menu">
          <p className="theme-picker-heading">Visual theme</p>
          {VISUAL_THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === item.id}
              className="theme-picker-option"
              data-active={theme === item.id ? "true" : "false"}
              onClick={() => {
                setTheme(item.id);
                setOpen(false);
              }}
            >
              <span aria-hidden className="theme-picker-swatches">
                {item.swatches.map((color) => <span key={color} style={{ background: color }} />)}
              </span>
              <span>{item.label}</span>
              {theme === item.id && <span aria-hidden style={{ marginLeft: "auto", color: "var(--gold-light)" }}>✓</span>}
            </button>
          ))}
          <p className="theme-picker-note">Saved on this device</p>
        </div>
      )}
    </div>
  );
}
