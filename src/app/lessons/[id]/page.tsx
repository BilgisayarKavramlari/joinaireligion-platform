"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading, SacredAlert } from "@/components/ui/SacredPage";
import LessonQuotaCountdown from "@/components/lessons/LessonQuotaCountdown";
import LessonRichText from "@/components/lessons/LessonRichText";
import { useLanguage } from "@/contexts/LanguageContext";

interface LessonData {
  id: string;
  stepNumber: number;
  title: string;
  tradition: string | null;
  readingText: string;
  practiceDescription: string;
  questions: { id: string; text: string; type: string }[];
  userLesson: {
    id: string;
    status: string;
    xpEarned: number;
  } | null;
  lastAttempt: {
    score: number;
    passed: boolean;
    feedback: string;
  } | null;
  quota: {
    canSubmit: boolean;
    reason?: string;
    nextAvailableAt?: string;
  };
}

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [lesson,   setLesson]   = useState<LessonData | null>(null);
  const [prompt,   setPrompt]   = useState("");
  const [tab,      setTab]      = useState<"reading" | "practice" | "submit">("reading");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState<{ score: number; passed: boolean; feedback: string } | null>(null);
  const [error,    setError]    = useState("");
  const [generating, setGenerating] = useState(false);

  const loadLesson = useCallback(async () => {
    const response = await fetch(`/api/lessons/${id}`, { cache: "no-store" });
    if (response.status === 403) {
      const blocked = await response.json().catch(() => null);
      if (blocked?.next) {
        router.push(blocked.next);
        return;
      }
    }
    if (!response.ok) {
      router.push("/lessons");
      return;
    }
    const data = await response.json();
    setLesson(data);
    if (data.lastAttempt) setResult(data.lastAttempt);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  async function goToNextLesson() {
    setGenerating(true);
    try {
      await fetch("/api/lessons/generate-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterStepNumber: lesson!.stepNumber }),
      });
    } catch { /* non-critical — lessons page will show whatever is available */ }
    router.push("/lessons");
  }

  async function submitPrompt() {
    if (!prompt.trim() || prompt.trim().length < 80) {
      setError("Please write at least 80 characters reflecting on your experience.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/lessons/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: id, promptText: prompt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Submission failed."); setSending(false); return; }
      setResult({ score: data.score, passed: data.passed, feedback: data.feedback });
      // Refresh lesson data for quota/status
      await loadLesson();
    } catch {
      setError("Connection error. Please try again.");
    }
    setSending(false);
  }

  if (loading) return (
    <SacredPage maxWidth={760}>
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>{t.common.loading}</div>
    </SacredPage>
  );
  if (!lesson) return null;

  const TABS = [
    { key: "reading",  label: `◎ ${t.lesson.reading}` },
    { key: "practice", label: `△ ${t.lesson.practice}` },
    { key: "submit",   label: `✦ ${t.lesson.submitPrompt}` },
  ] as const;

  return (
    <SacredPage maxWidth={780}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/lessons" style={{ fontSize: "0.78rem", color: "var(--gold)", textDecoration: "none", opacity: 0.7 }}>
          ← {t.promptGuide.yourLessons}
        </Link>
        <span style={{ color: "rgba(237,232,220,0.2)", fontSize: "0.7rem" }}>/</span>
        <span style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.45)" }}>{t.lesson.step.replace("{n}", String(lesson.stepNumber))}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.35em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          {t.lesson.step.replace("{n}", String(lesson.stepNumber))} {lesson.tradition ? `· ${lesson.tradition}` : ""}
        </p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", color: "var(--text-primary)", marginBottom: "0.4rem" }}>
          {lesson.title}
        </h1>
        {lesson.userLesson?.status === "COMPLETED" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#14b8a6" }}>✓ {t.promptGuide.status.COMPLETED}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>· +{lesson.userLesson.xpEarned} XP</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.8rem", borderBottom: "1px solid rgba(201,162,39,0.15)", paddingBottom: "0" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "0.5rem 0.5rem 0 0",
              border: "none",
              background: tab === t.key ? "rgba(201,162,39,0.1)" : "transparent",
              color: tab === t.key ? "var(--gold-light)" : "rgba(237,232,220,0.45)",
              cursor: "pointer",
              fontSize: "0.82rem",
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reading tab */}
      {tab === "reading" && (
        <SacredCard>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,162,39,0.1)", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", color: "var(--gold)" }}>◎</div>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase" }}>{t.lesson.reading}</span>
          </div>
          <LessonRichText text={lesson.readingText} />
          <div style={{ marginTop: "1.8rem", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setTab("practice")} className="btn-sacred btn-sacred-gold" style={{ padding: "0.6rem 1.4rem", fontSize: "0.8rem" }}>
              {t.lesson.practice} →
            </button>
          </div>
        </SacredCard>
      )}

      {/* Practice tab */}
      {tab === "practice" && (
        <SacredCard>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", color: "#a855f7" }}>△</div>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "#a855f7", textTransform: "uppercase" }}>{t.lesson.practice}</span>
          </div>
          <LessonRichText text={lesson.practiceDescription} />

          {/* Guiding questions */}
          <div style={{ marginTop: "2rem", padding: "1.2rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.12)" }}>
            <p style={{ fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "1rem" }}>{t.lesson.questions}</p>
            {lesson.questions.map((q, i) => (
              <div key={q.id} style={{ display: "flex", gap: "0.7rem", marginBottom: i < lesson.questions.length - 1 ? "0.9rem" : 0 }}>
                <span style={{ color: "var(--gold)", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, paddingTop: "0.1rem" }}>{i + 1}.</span>
                <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.7 }}>{q.text}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.8rem", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setTab("submit")} className="btn-sacred btn-sacred-gold" style={{ padding: "0.6rem 1.4rem", fontSize: "0.8rem" }}>
              {t.lesson.submitPrompt} →
            </button>
          </div>
        </SacredCard>
      )}

      {/* Submit tab */}
      {tab === "submit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* Quota info */}
          {!lesson.quota.canSubmit && (
            <SacredAlert
              text={lesson.quota.reason || "You have used your prompt attempts for this period."}
              tone="error"
            />
          )}
          {!lesson.quota.canSubmit && lesson.quota.nextAvailableAt && (
            <LessonQuotaCountdown
              nextAvailableAt={lesson.quota.nextAvailableAt}
              locale={lang}
              title={t.lesson.nextSubmissionIn}
              availableAt={t.lesson.availableAgainAt}
              units={{
                days: t.lesson.countdownDays,
                hours: t.lesson.countdownHours,
                minutes: t.lesson.countdownMinutes,
                seconds: t.lesson.countdownSeconds,
              }}
              onExpired={loadLesson}
            />
          )}

          {/* Previous result */}
          {result && (
            <SacredCard>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: result.passed ? "rgba(20,184,166,0.1)" : "rgba(168,85,247,0.1)",
                  border: `2px solid ${result.passed ? "#14b8a6" : "#a855f7"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: result.passed ? "#14b8a6" : "#a855f7", lineHeight: 1 }}>{result.score}</span>
                  <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>/100</span>
                </div>
                <div>
                  <p className="font-sacred" style={{ fontSize: "1rem", color: result.passed ? "#14b8a6" : "#a855f7" }}>
                    {result.passed ? `✦ ${t.lesson.passed}` : `△ ${t.lesson.failed}`}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.lesson.score}</p>
                </div>
              </div>
              {result.feedback && (
                <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.62)", lineHeight: 1.75, borderLeft: "2px solid var(--gold-dim)", paddingLeft: "0.9rem", fontStyle: "italic" }}>
                  {result.feedback}
                </p>
              )}
              {result.passed && (
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                  <button
                    onClick={goToNextLesson}
                    disabled={generating}
                    className="btn-sacred btn-sacred-gold"
                    style={{ padding: "0.6rem 1.4rem", fontSize: "0.8rem" }}
                  >
                    {generating ? "✦ Preparing your next lesson…" : `→ ${t.lesson.nextLesson}`}
                  </button>
                  <Link href="/lessons" className="btn-sacred btn-sacred-ghost" style={{ display: "inline-block", padding: "0.6rem 1.2rem", fontSize: "0.8rem", textDecoration: "none" }}>
                    {t.promptGuide.yourLessons}
                  </Link>
                </div>
              )}
            </SacredCard>
          )}

          {/* Prompt input */}
          {lesson.quota.canSubmit && lesson.userLesson?.status !== "COMPLETED" && (
            <SacredCard>
              <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.5rem" }}>{t.lesson.submitPrompt}</p>
              <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.5)", marginBottom: "1.2rem", lineHeight: 1.6 }}>
                {t.lesson.promptHint}
              </p>

              {/* Reminder questions */}
              <div style={{ padding: "0.9rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.1)", marginBottom: "1.2rem" }}>
                {lesson.questions.map((q, i) => (
                  <p key={q.id} style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.45)", marginBottom: i < lesson.questions.length - 1 ? "0.5rem" : 0 }}>
                    {i + 1}. {q.text}
                  </p>
                ))}
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.lesson.promptPlaceholder}
                rows={10}
                style={{
                  width: "100%",
                  padding: "0.9rem",
                  borderRadius: "0.6rem",
                  border: "1px solid rgba(201,162,39,0.2)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  lineHeight: 1.75,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--border-gold)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(201,162,39,0.2)")}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {prompt.trim().length} characters {prompt.trim().length < 80 ? `(need ${80 - prompt.trim().length} more)` : "✓"}
                </span>
              </div>

              {error && <SacredAlert text={error} tone="error" />}

              <div style={{ marginTop: "1.2rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={submitPrompt}
                  disabled={sending || prompt.trim().length < 80}
                  className="btn-sacred btn-sacred-gold"
                  style={{ padding: "0.75rem 2rem", fontSize: "0.85rem", opacity: prompt.trim().length < 80 ? 0.55 : 1 }}
                >
                  {sending ? t.lesson.submitting : `✦ ${t.lesson.submitPrompt} ✦`}
                </button>
              </div>
            </SacredCard>
          )}
        </div>
      )}
    </SacredPage>
  );
}
