"use client";

import { useEffect, useState } from "react";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type Props = {
  nextAvailableAt: string;
  locale: string;
  title: string;
  availableAt: string;
  units: Record<keyof CountdownParts, string>;
  onExpired: () => void;
};

export function lessonCountdownParts(remainingMs: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function LessonQuotaCountdown({ nextAvailableAt, locale, title, availableAt, units, onExpired }: Props) {
  const target = new Date(nextAvailableAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let expirationHandled = false;
    const update = () => {
      const remaining = Math.max(0, target - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0 && !expirationHandled) {
        expirationHandled = true;
        onExpired();
      }
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [target, onExpired]);

  if (!Number.isFinite(target)) return null;
  const parts = lessonCountdownParts(remainingMs);
  const exactTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(target));

  return (
    <div
      role="timer"
      style={{
        padding: "1.1rem",
        borderRadius: "0.8rem",
        border: "1px solid rgba(201,162,39,0.28)",
        background: "rgba(201,162,39,0.06)",
        textAlign: "center",
      }}
    >
      <p style={{ color: "var(--gold-light)", fontSize: "0.74rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.45rem", marginTop: "0.8rem" }}>
        {(Object.keys(parts) as Array<keyof CountdownParts>).map((key) => (
          <div key={key} style={{ padding: "0.55rem 0.25rem", borderRadius: "0.55rem", background: "rgba(0,0,0,0.18)" }}>
            <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "clamp(1rem, 4vw, 1.35rem)", fontVariantNumeric: "tabular-nums" }}>
              {String(parts[key]).padStart(2, "0")}
            </strong>
            <span style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>{units[key]}</span>
          </div>
        ))}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.7rem" }}>
        {availableAt.replace("{date}", exactTime)}
      </p>
    </div>
  );
}
