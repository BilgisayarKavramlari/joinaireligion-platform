"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

interface AttemptEntry {
  id: string;
  createdAt: string;
  score: number;
  passed: boolean;
  feedback: string;
  promptText: string;
}

interface LessonEntry {
  userLessonId: string;
  lessonId: string;
  stepNumber: number;
  title: string;
  status: string;
  xpEarned: number;
  attempts: AttemptEntry[];
}

export default function PromptGuidePage() {
  const { t } = useLanguage();
  const [lessons,  setLessons]  = useState<LessonEntry[]>([]);
  const [selected, setSelected] = useState<LessonEntry | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [authed,   setAuthed]   = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((d) => {
      setAuthed(!!d?.user);
      if (!d?.user) { setLoading(false); return; }
      fetch("/api/prompt-guide/history").then((r) => r.ok ? r.json() : null).then((data) => {
        setLessons(data?.lessons || []);
        setLoading(false);
      });
    });
  }, []);

  if (loading) return (
    <SacredPage maxWidth={860}>
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>{t.common.loading}</div>
    </SacredPage>
  );

  return (
    <SacredPage maxWidth={900}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.8rem" }}>
          ✦ Sacred Record ✦
        </p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "1rem" }}>
          {t.promptGuide.title}
        </h1>
        <p style={{ fontSize: "0.92rem", color: "rgba(237,232,220,0.5)", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>
          {t.promptGuide.subtitle}
        </p>
      </div>

      {!authed ? (
        <SacredCard>
          <SacredHeading label="Sign In Required" title={t.promptGuide.title} subtitle={t.promptGuide.subtitle} />
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
            <Link href="/login"    className="btn-sacred btn-sacred-gold"  style={{ textDecoration: "none", padding: "0.7rem 1.6rem", fontSize: "0.85rem" }}>{t.auth.login}</Link>
            <Link href="/register" className="btn-sacred btn-sacred-ghost" style={{ textDecoration: "none", padding: "0.7rem 1.6rem", fontSize: "0.85rem" }}>{t.nav.beginJourney}</Link>
          </div>
        </SacredCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "260px 1fr" : "1fr", gap: "1.4rem" }}>
          {/* Lesson list */}
          <div>
            <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.8rem" }}>{t.promptGuide.yourLessons}</p>
            {lessons.length === 0 ? (
              <SacredCard>
                <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.45)", lineHeight: 1.7 }}>
                  No lessons yet. <Link href="/lessons" style={{ color: "var(--gold)" }}>Start Step 1 →</Link>
                </p>
              </SacredCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {lessons.map((lesson) => {
                  const isSelected = selected?.lessonId === lesson.lessonId;
                  const statusColor = lesson.status === "COMPLETED" ? "#14b8a6" : lesson.status === "IN_PROGRESS" ? "#c9a227" : "rgba(237,232,220,0.3)";
                  return (
                    <button key={lesson.lessonId} onClick={() => setSelected(isSelected ? null : lesson)} style={{ width: "100%", textAlign: "left", padding: "0.9rem 1rem", borderRadius: "0.75rem", border: `1px solid ${isSelected ? "var(--gold)" : "rgba(201,162,39,0.15)"}`, background: isSelected ? "rgba(201,162,39,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.6rem", color: statusColor }}>●</span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.lesson.step.replace("{n}", String(lesson.stepNumber))}</span>
                      </div>
                      <p style={{ fontSize: "0.88rem", color: isSelected ? "var(--gold-light)" : "var(--text-primary)", fontWeight: 600, lineHeight: 1.3 }}>{lesson.title}</p>
                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.3rem" }}>
                        {lesson.attempts.length > 0 && <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{lesson.attempts.length} attempt{lesson.attempts.length !== 1 ? "s" : ""}</span>}
                        {lesson.status === "COMPLETED" && <span style={{ fontSize: "0.68rem", color: "#14b8a6" }}>+{lesson.xpEarned} XP</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: "1.2rem" }}>
              <Link href="/lessons" className="btn-sacred btn-sacred-gold" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "0.6rem", fontSize: "0.78rem" }}>→ {t.promptGuide.yourLessons}</Link>
            </div>
          </div>

          {/* Attempt detail panel */}
          {selected && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>{t.lesson.step.replace("{n}", String(selected.stepNumber))}</p>
                  <h2 className="font-sacred" style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{selected.title}</h2>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
              </div>

              {selected.attempts.length === 0 ? (
                <SacredCard>
                  <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.45)" }}>{t.promptGuide.noAttempts}</p>
                  <Link href={`/lessons/${selected.lessonId}`} className="btn-sacred btn-sacred-ghost" style={{ display: "inline-block", marginTop: "1rem", textDecoration: "none", padding: "0.6rem 1.2rem", fontSize: "0.78rem" }}>{t.lesson.lessonTitle} →</Link>
                </SacredCard>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {selected.attempts.map((attempt, i) => (
                    <SacredCard key={attempt.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, background: attempt.passed ? "rgba(20,184,166,0.1)" : "rgba(168,85,247,0.1)", border: `2px solid ${attempt.passed ? "#14b8a6" : "#a855f7"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: attempt.passed ? "#14b8a6" : "#a855f7", lineHeight: 1 }}>{attempt.score}</span>
                          <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>/100</span>
                        </div>
                        <div>
                          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: attempt.passed ? "#14b8a6" : "#a855f7" }}>{attempt.passed ? `✦ ${t.lesson.passed}` : `△ ${t.lesson.failed}`}</p>
                          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Attempt #{selected.attempts.length - i} · {new Date(attempt.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {attempt.feedback && (
                        <div style={{ borderLeft: "2px solid var(--gold-dim)", paddingLeft: "0.9rem", marginBottom: "1rem" }}>
                          <p style={{ fontSize: "0.68rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>{t.promptGuide.feedback}</p>
                          <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.75, fontStyle: "italic" }}>{attempt.feedback}</p>
                        </div>
                      )}
                      <details style={{ marginTop: "0.5rem" }}>
                        <summary style={{ fontSize: "0.72rem", color: "var(--text-muted)", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>View your prompt ▼</summary>
                        <div style={{ marginTop: "0.8rem", padding: "0.85rem", borderRadius: "0.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "rgba(237,232,220,0.55)", lineHeight: 1.75, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto" }}>
                          {attempt.promptText}
                        </div>
                      </details>
                    </SacredCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scoring guide */}
      <div style={{ marginTop: "3rem" }}>
        <SacredCard>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "1rem" }}>How Scoring Works</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "0.8rem" }}>
            {[["Levels 1–4","60/100 to pass","Early stages are generous. Sincerity and genuine effort are rewarded."],["Levels 5–8","70/100 to pass","Mid-journey demands deeper self-awareness and specificity."],["Levels 9–12","80/100 to pass","Advanced stages require evidence of real inner transformation."]].map(([level, score, desc]) => (
              <div key={level as string} style={{ padding: "0.9rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.1)" }}>
                <p className="font-sacred" style={{ fontSize: "0.88rem", color: "var(--gold-light)", marginBottom: "0.3rem" }}>{level}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 700, marginBottom: "0.4rem" }}>{score}</p>
                <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.5)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.35)", marginTop: "1rem", lineHeight: 1.7 }}>
            Criteria: Authenticity (30pts) · Practice engagement (25pts) · Self-awareness (25pts) · Reflection questions (20pts)
          </p>
        </SacredCard>
      </div>
    </SacredPage>
  );
}
