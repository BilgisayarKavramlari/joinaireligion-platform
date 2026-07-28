"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { getQuestions } from "@/lib/i18n/onboarding-questions";
import type { LangCode } from "@/lib/i18n/dict";

// ─── Types ─────────────────────────────────────────────────────────────────────

type LanguageOption = { code: string; label: string };

// The language question is injected inline between "relationship" and "draw".
// The acknowledge question is injected at the end.
// Neither is part of getQuestions() so we handle them separately below.

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "🇬🇧 English" },
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "zh", label: "🇨🇳 简体中文" },
];

const LANGUAGE_COLORS: Record<string, string> = {
  en: "#c0c0ff", tr: "#80ffb0", es: "#ff8080",
  de: "#ffe080", fr: "#c0ffe0", ar: "#f9c8ff",
  ru: "#8fb7ff", zh: "#ffb38f",
};

const LANGUAGE_QUESTION = {
  key: "preferred_language",
  type: "language" as const,
  text: "Which language would you prefer for lessons and communications?",
  hint: "You can change this at any time in your account preferences.",
};

const ACKNOWLEDGE_QUESTION = {
  key: "safety_acknowledgement",
  type: "acknowledge" as const,
  text: "Before you begin, please read and confirm the following.",
  hint: "",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const [step,           setStep]           = useState(0);
  const [answers,        setAnswers]        = useState<Record<string, string>>({});
  const [acknowledged,   setAcknowledged]   = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [authed,         setAuthed]         = useState<boolean | null>(null);

  // Guard — must be logged in and onboarding not yet complete
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.user) { router.push("/login"); return; }
        if (d.user.onboardingDone) { router.push("/account"); return; }
        setAuthed(true);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Build the full question list reactively when lang changes.
  // getQuestions(lang) returns localised text/hint/labels; stable values are
  // preserved so saved answers remain valid across locale switches.
  const QUESTIONS = useMemo(() => {
    const base = getQuestions(lang);
    // Inject language question after "relationship" (index 1 in base → index 2 in final)
    const result = [
      ...base.slice(0, 2),
      { ...LANGUAGE_QUESTION },
      ...base.slice(2),
      ACKNOWLEDGE_QUESTION,
    ];
    return result;
  }, [lang, t]);

  const q        = QUESTIONS[step];
  const isLast   = step === QUESTIONS.length - 1;
  const total    = QUESTIONS.length;
  const progress = ((step + 1) / total) * 100;

  function handleAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
    // Apply language immediately when the language question is answered
    if (q.key === "preferred_language") {
      setLang(value as LangCode);
    }
  }

  function handleNext() {
    if (q.type === "acknowledge") {
      if (!acknowledged) { setError("You must read and confirm the disclaimer to continue."); return; }
      setError("");
      handleSubmit();
      return;
    }
    if (q.type !== "language" && !answers[q.key]?.trim()) {
      setError("Please answer this question to continue.");
      return;
    }
    setError("");
    if (isLast) { handleSubmit(); return; }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload = {
        answers: { ...answers, safety_acknowledgement: acknowledged ? "accepted" : "declined" },
      };
      const res  = await fetch("/api/onboarding/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save. Please try again."); setSaving(false); return; }
      router.push("/lessons");
    } catch {
      setError("Connection error. Please try again.");
      setSaving(false);
    }
  }

  if (authed === null) {
    return (
      <SacredPage maxWidth={560}>
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>{t.common.loading}</div>
      </SacredPage>
    );
  }

  return (
    <SacredPage maxWidth={600}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 1rem" }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: "absolute", inset: 0, animation: "rotateSacred 25s linear infinite" }}>
            <circle cx="40" cy="40" r="37" fill="none" stroke="rgba(201,162,39,0.2)" strokeWidth="1" strokeDasharray="3 5" />
          </svg>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: "absolute", inset: 0, animation: "rotateSacredReverse 15s linear infinite" }}>
            <polygon points="40,10 64,55 16,55" fill="none" stroke="rgba(168,85,247,0.4)" strokeWidth="1" />
            <polygon points="40,70 16,25 64,25" fill="none" stroke="rgba(20,184,166,0.35)" strokeWidth="1" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle, #f0d47a, #c9a227)", boxShadow: "0 0 20px rgba(201,162,39,0.8)" }} />
          </div>
        </div>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase" }}>
          ✦ {t.onboarding.title} ✦
        </p>
        <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.45)", marginTop: "0.4rem" }}>
          {t.onboarding.subtitle}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "1.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            {t.onboarding.step.replace("{n}", String(step + 1)).replace("{total}", String(total))}
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--gold)" }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--gold-dim), var(--gold-light))",
            borderRadius: 4,
            transition: "width 0.5s ease",
            boxShadow: "0 0 8px var(--gold-glow)",
          }} />
        </div>
      </div>

      <SacredCard glow>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: "1.8rem", flexWrap: "wrap" }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i < step ? "var(--gold)" : i === step ? "var(--gold-light)" : "rgba(255,255,255,0.1)",
              boxShadow: i === step ? "0 0 8px var(--gold-glow)" : "none",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.7rem" }}>
          {q.key.replace(/_/g, " ")}
        </p>

        <h2 className="font-sacred" style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "0.6rem", lineHeight: 1.5 }}>
          {q.text}
        </h2>

        {q.hint && (
          <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.42)", marginBottom: "1.4rem", fontStyle: "italic" }}>
            {q.hint}
          </p>
        )}

        {/* ── Select input ── */}
        {q.type === "select" && "options" in q && q.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {q.options.map((opt) => {
              // opt is { value, label } from getQuestions; we compare by value and display label
              const isSelected = answers[q.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  style={{
                    padding: "0.7rem 1rem",
                    borderRadius: "0.6rem",
                    border: `1px solid ${isSelected ? "var(--gold)" : "rgba(201,162,39,0.2)"}`,
                    background: isSelected ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.02)",
                    color: isSelected ? "var(--gold-light)" : "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    textAlign: "left",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${isSelected ? "var(--gold)" : "rgba(201,162,39,0.3)"}`,
                    background: isSelected ? "var(--gold)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.55rem", color: "#000",
                  }}>
                    {isSelected ? "✓" : ""}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Language selector ── */}
        {q.type === "language" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
            {LANGUAGE_OPTIONS.map((langOpt) => {
              const selected = answers[q.key] === langOpt.code;
              return (
                <button
                  key={langOpt.code}
                  onClick={() => handleAnswer(langOpt.code)}
                  style={{
                    padding: "0.9rem 1rem",
                    borderRadius: "0.75rem",
                    border: `1.5px solid ${selected ? LANGUAGE_COLORS[langOpt.code] || "var(--gold)" : "rgba(201,162,39,0.2)"}`,
                    background: selected ? `${LANGUAGE_COLORS[langOpt.code] || "rgba(201,162,39,0.1)"}22` : "rgba(255,255,255,0.02)",
                    color: selected ? (LANGUAGE_COLORS[langOpt.code] || "var(--gold-light)") : "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "0.92rem",
                    textAlign: "center",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: selected ? `0 0 14px ${LANGUAGE_COLORS[langOpt.code] || "#c9a227"}44` : "none",
                    fontWeight: selected ? 700 : 400,
                  }}
                >
                  {selected && <span style={{ fontSize: "0.7rem" }}>✓</span>}
                  {langOpt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Textarea ── */}
        {q.type === "textarea" && (
          <textarea
            value={answers[q.key] || ""}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Write freely and honestly…"
            rows={5}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(201,162,39,0.2)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--text-primary)",
              fontSize: "0.88rem",
              lineHeight: 1.7,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-gold)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(201,162,39,0.2)")}
          />
        )}

        {/* ── Safety acknowledgement ── */}
        {q.type === "acknowledge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {/* Disclaimer box */}
            <div style={{
              padding: "1.2rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(201,162,39,0.3)",
              background: "rgba(201,162,39,0.04)",
              lineHeight: 1.8,
            }}>
              <p style={{ fontSize: "0.75rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.8rem" }}>
                ⚠ Platform Disclaimer — Please Read
              </p>
              {[
                "Join AI Religion is a fictional, educational, and reflective simulation platform. It is not affiliated with any real religion, denomination, or spiritual authority.",
                "The AI-generated lessons, evaluations, and guidance are for personal reflection and intellectual exploration only. They do not constitute spiritual direction, psychological counseling, or medical advice.",
                "No real religious community, clergy, or institution is represented or endorsed. Use of sacred symbols, traditions, and terminology is illustrative and educational.",
                "All content is generated by artificial intelligence. The platform does not claim spiritual authority or make claims about ultimate truth.",
                "You participate freely and understand this is a simulation for self-inquiry, not a real religious institution.",
              ].map((line, i) => (
                <p key={i} style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.65)", marginBottom: i < 4 ? "0.7rem" : 0 }}>
                  {i + 1}. {line}
                </p>
              ))}
            </div>

            {/* Checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.9rem",
                cursor: "pointer",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: `1.5px solid ${acknowledged ? "var(--gold)" : "rgba(201,162,39,0.25)"}`,
                background: acknowledged ? "rgba(201,162,39,0.07)" : "rgba(255,255,255,0.02)",
                transition: "all 0.2s",
              }}
            >
              <div
                onClick={() => setAcknowledged((v) => !v)}
                style={{
                  width: 20, height: 20, borderRadius: "0.3rem", flexShrink: 0, marginTop: "0.05rem",
                  border: `2px solid ${acknowledged ? "var(--gold)" : "rgba(201,162,39,0.4)"}`,
                  background: acknowledged ? "var(--gold)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#000", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {acknowledged ? "✓" : ""}
              </div>
              <p style={{ fontSize: "0.84rem", color: acknowledged ? "var(--gold-light)" : "rgba(237,232,220,0.65)", lineHeight: 1.65 }}>
                I have read and understand the above disclaimer. I acknowledge that this platform is a fictional educational simulation and not a real religious institution. I am 18 years or older, or have parental consent to participate.
              </p>
            </label>
          </div>
        )}

        {error && <div style={{ marginTop: "1rem" }}><SacredAlert text={error} tone="error" /></div>}

        {/* Navigation */}
        <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.5rem", justifyContent: "space-between", alignItems: "center" }}>
          {step > 0 ? (
            <button
              onClick={() => { setError(""); setStep((s) => s - 1); }}
              className="btn-sacred btn-sacred-ghost"
              style={{ padding: "0.6rem 1.2rem", fontSize: "0.8rem" }}
            >
              ← {t.common.back}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={saving || (q.type === "acknowledge" && !acknowledged)}
            className="btn-sacred btn-sacred-gold"
            style={{
              padding: "0.7rem 1.8rem", fontSize: "0.85rem", letterSpacing: "0.1em",
              opacity: (q.type === "acknowledge" && !acknowledged) ? 0.45 : 1,
            }}
          >
            {saving ? t.onboarding.saving : isLast ? `✦ ${t.onboarding.completeBtn} ✦` : `${t.common.next} →`}
          </button>
        </div>
      </SacredCard>

      <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.68rem", color: "rgba(237,232,220,0.22)", letterSpacing: "0.1em" }}>
        YOUR ANSWERS ARE PRIVATE AND USED ONLY TO PERSONALIZE YOUR SACRED PATH
      </p>
    </SacredPage>
  );
}
