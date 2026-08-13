"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SacredCard, SacredPage } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { getReflectionCopy } from "@/lib/reflection-copy";

type Lesson = { lessonId: string; stepNumber: number; title: string; status: string };
type Mode = "lesson" | "life";
type ChatMessage = { role: "user" | "assistant"; content: string; reflectionQuestion?: string; nextStep?: string | null };
type Quota = { used: number; limit: number; remaining: number; sessionsUsed: number; sessionLimit: number; turnsPerSession: number; lifeMode: boolean; resetsAt: string };

function freshConversationId() {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function interpolate(value: string, values: Record<string, number>) {
  return Object.entries(values).reduce((text, [key, replacement]) => text.replace(`{${key}}`, String(replacement)), value);
}

export default function ReflectionCompanionPage() {
  const { lang } = useLanguage();
  const copy = getReflectionCopy(lang);
  const { user, status } = useSession();
  const [mode, setMode] = useState<Mode>("lesson");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackEligible, setFeedbackEligible] = useState(false);

  const initiate = user?.subscription?.status === "ACTIVE" && user.subscription.plan === "initiate";

  useEffect(() => {
    if (status !== "authenticated" || !user || user.requiresOnboarding) return;
    const key = `joinai:reflection-session:${new Date().toISOString().slice(0, 10)}`;
    const existing = sessionStorage.getItem(key);
    const nextId = existing && /^[0-9a-f-]{36}$/i.test(existing) ? existing : freshConversationId();
    sessionStorage.setItem(key, nextId);
    setConversationId(nextId);
    Promise.all([
      fetch("/api/lessons", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/ai/query", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]).then(([lessonData, quotaData]) => {
      const rows = (lessonData?.lessons || []) as Lesson[];
      setLessons(rows);
      if (rows[0]) setLessonId(rows[0].lessonId);
      if (quotaData?.quota) setQuota(quotaData.quota);
    }).catch(() => setError("Reflection Companion could not be loaded."));
  }, [status, user]);

  const providerHistory = useMemo(() => messages.slice(quota?.lifeMode ? -15 : -5).map((message) => ({
    role: message.role,
    content: message.role === "assistant"
      ? `${message.content}\nReflection question: ${message.reflectionQuestion || ""}\nNext step: ${message.nextStep || ""}`
      : message.content,
  })), [messages, quota?.lifeMode]);

  function newSession() {
    const nextId = freshConversationId();
    sessionStorage.setItem(`joinai:reflection-session:${new Date().toISOString().slice(0, 10)}`, nextId);
    setConversationId(nextId);
    setMessages([]);
    setQuestion("");
    setError("");
    setNotice("");
    setFeedbackSent(false);
    setFeedbackEligible(false);
    setConsent(false);
  }

  function changeMode(nextMode: Mode) {
    if (nextMode === mode) return;
    newSession();
    setMode(nextMode);
  }

  function changeLesson(nextLessonId: string) {
    if (messages.length > 0 && nextLessonId !== lessonId) newSession();
    setLessonId(nextLessonId);
  }

  async function sendQuestion() {
    if (!question.trim() || !consent || loading || !conversationId) return;
    setLoading(true);
    setError("");
    setNotice("");
    setFeedbackSent(false);
    const submitted = question.trim();
    const response = await fetch("/api/ai/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: submitted, mode, lessonId: mode === "lesson" ? lessonId : null, conversationId, history: providerHistory, aiConsent: true }),
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !body?.answer) {
      setError(body?.error || "Reflection Companion is temporarily unavailable.");
      setLoading(false);
      return;
    }
    setMessages((current) => [...current,
      { role: "user", content: submitted },
      { role: "assistant", content: body.answer.answer, reflectionQuestion: body.answer.reflectionQuestion, nextStep: body.answer.nextStep },
    ]);
    setFeedbackEligible(!body.safetyRedirect);
    setQuestion("");
    if (body.quota?.limit) setQuota((current) => current ? { ...current, used: body.quota.used, remaining: Math.max(0, body.quota.limit - body.quota.used), sessionsUsed: body.quota.sessionsUsed } : current);
    if (body.safetyRedirect) setNotice(copy.notMonitored);
    setLoading(false);
  }

  async function sendFeedback(useful: boolean) {
    const response = await fetch("/api/ai/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, useful }) });
    if (response.ok) setFeedbackSent(true);
  }

  async function deleteHistory() {
    if (!window.confirm(copy.deleteConfirm)) return;
    const response = await fetch("/api/ai/history", { method: "DELETE" });
    if (response.ok) setNotice(copy.deleted);
  }

  if (status === "loading") return <SacredPage maxWidth={980}><p style={{ padding: "5rem 0", textAlign: "center", color: "var(--text-muted)" }}>Loading…</p></SacredPage>;

  if (status !== "authenticated" || !user) return (
    <SacredPage maxWidth={1080}>
      <section style={{ textAlign: "center", padding: "4rem 0 2rem" }}>
        <p style={{ color: "var(--gold)", letterSpacing: ".28em", fontSize: ".68rem" }}>✦ {copy.eyebrow} ✦</p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(2rem,6vw,4.5rem)", margin: "1rem auto", maxWidth: 900, lineHeight: 1.05 }}>{copy.title}</h1>
        <p style={{ color: "var(--text-muted)", maxWidth: 720, margin: "0 auto", lineHeight: 1.75, fontSize: "1rem" }}>{copy.subtitle}</p>
        <p style={{ color: "rgba(237,232,220,.62)", maxWidth: 660, margin: "1.2rem auto 0", lineHeight: 1.7 }}>{copy.guestBody}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: ".8rem", flexWrap: "wrap", marginTop: "1.8rem" }}>
          <Link href="/register?utm_source=companion&utm_medium=product&utm_campaign=reflection_companion_launch" className="btn-sacred btn-sacred-gold">{copy.startFree} →</Link>
          <Link href="/login" className="btn-sacred btn-sacred-ghost">{copy.signIn}</Link>
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "1rem", margin: "2rem 0" }}>
        {copy.examples.map((example) => <SacredCard key={example.q}><p style={{ color: "var(--gold-light)", fontWeight: 700, marginBottom: ".75rem" }}>“{example.q}”</p><p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: ".86rem" }}>{example.a}</p></SacredCard>)}
      </div>
      <SacredCard style={{ margin: "2rem 0", textAlign: "center" }}><strong style={{ color: "var(--gold-light)" }}>{copy.privateByDefault}</strong><p style={{ color: "var(--text-muted)", marginTop: ".75rem" }}>{copy.notAuthority}<br />{copy.notMonitored}</p></SacredCard>
    </SacredPage>
  );

  if (user.requiresOnboarding) return <SacredPage maxWidth={720}><SacredCard style={{ marginTop: "4rem", textAlign: "center" }}><h1 className="font-sacred">{copy.title}</h1><p style={{ color: "var(--text-muted)", margin: "1rem" }}>Complete your account setup before asking a live question.</p><Link href="/onboarding" className="btn-sacred btn-sacred-gold">Continue →</Link></SacredCard></SacredPage>;

  return (
    <SacredPage maxWidth={980}>
      <div style={{ textAlign: "center", margin: "2.5rem 0 1.5rem" }}>
        <p style={{ color: "var(--gold)", letterSpacing: ".25em", fontSize: ".65rem" }}>✦ {copy.eyebrow} ✦</p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(1.8rem,5vw,3.2rem)", margin: ".6rem 0" }}>{copy.title}</h1>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{copy.subtitle}</p>
      </div>

      {quota && <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "1.2rem" }}>
        <span style={{ border: "1px solid var(--border-gold)", borderRadius: 999, padding: ".35rem .7rem", color: "var(--gold-light)", fontSize: ".75rem" }}>{interpolate(copy.quota, { used: quota.used, limit: quota.limit })}</span>
        <span style={{ border: "1px solid var(--border-gold)", borderRadius: 999, padding: ".35rem .7rem", color: "var(--gold-light)", fontSize: ".75rem" }}>{interpolate(copy.sessionQuota, { used: quota.sessionsUsed, limit: quota.sessionLimit })}</span>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: ".8rem", marginBottom: "1rem" }}>
        <button type="button" onClick={() => changeMode("lesson")} className="sacred-card" style={{ padding: "1rem", textAlign: "left", cursor: "pointer", borderColor: mode === "lesson" ? "var(--gold)" : undefined }}><strong style={{ color: "var(--gold-light)" }}>{copy.lessonMode}</strong><p style={{ color: "var(--text-muted)", marginTop: ".35rem", fontSize: ".8rem" }}>{copy.lessonModeDesc}</p></button>
        <button type="button" onClick={() => initiate ? changeMode("life") : undefined} className="sacred-card" style={{ padding: "1rem", textAlign: "left", cursor: initiate ? "pointer" : "not-allowed", opacity: initiate ? 1 : .55, borderColor: mode === "life" ? "var(--gold)" : undefined }}><strong style={{ color: "var(--gold-light)" }}>{copy.lifeMode} {!initiate && "🔒"}</strong><p style={{ color: "var(--text-muted)", marginTop: ".35rem", fontSize: ".8rem" }}>{copy.lifeModeDesc}</p>{!initiate && <Link href="/pricing?utm_source=companion&utm_medium=product&utm_campaign=reflection_companion_upgrade" style={{ color: "var(--gold)", fontSize: ".75rem" }}>{copy.upgrade} →</Link>}</button>
      </div>

      <SacredCard>
        {mode === "lesson" && <select value={lessonId} onChange={(event) => changeLesson(event.target.value)} style={{ width: "100%", padding: ".8rem", borderRadius: ".7rem", background: "rgba(255,255,255,.04)", color: "var(--text-primary)", border: "1px solid var(--border-gold)", marginBottom: "1rem" }}><option value="">{copy.chooseLesson}</option>{lessons.map((lesson) => <option key={lesson.lessonId} value={lesson.lessonId}>Step {lesson.stepNumber} · {lesson.title}</option>)}</select>}

        <div aria-live="polite" style={{ display: "grid", gap: ".8rem", marginBottom: messages.length ? "1rem" : 0 }}>
          {messages.map((message, index) => <div key={`${message.role}-${index}`} style={{ justifySelf: message.role === "user" ? "end" : "start", maxWidth: "86%", borderRadius: "1rem", padding: ".9rem 1rem", background: message.role === "user" ? "rgba(201,162,39,.12)" : "rgba(76,29,149,.22)", border: "1px solid rgba(201,162,39,.18)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}><p>{message.content}</p>{message.reflectionQuestion && <p style={{ marginTop: ".8rem", color: "var(--gold-light)", fontWeight: 700 }}>{message.reflectionQuestion}</p>}{message.nextStep && <p style={{ marginTop: ".6rem", color: "var(--text-muted)", fontSize: ".82rem" }}>{copy.nextStepLabel}: {message.nextStep}</p>}</div>)}
        </div>

        <textarea value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 2_000))} placeholder={copy.questionPlaceholder} rows={4} disabled={loading} style={{ width: "100%", resize: "vertical", padding: "1rem", borderRadius: ".8rem", background: "rgba(255,255,255,.035)", color: "var(--text-primary)", border: "1px solid var(--border-gold)", lineHeight: 1.6 }} />
        <div style={{ textAlign: "right", fontSize: ".68rem", color: "var(--text-muted)" }}>{question.length}/2000</div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: ".6rem", margin: ".8rem 0", color: "var(--text-muted)", fontSize: ".75rem", lineHeight: 1.55 }}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} style={{ marginTop: 3 }} /><span>{copy.consent}</span></label>
        {error && <p role="alert" style={{ color: "#fca5a5", margin: ".7rem 0" }}>{error}</p>}
        {notice && <p role="status" style={{ color: "var(--gold-light)", margin: ".7rem 0" }}>{notice}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: ".7rem", flexWrap: "wrap" }}><button type="button" className="btn-sacred btn-sacred-ghost" onClick={newSession}>{copy.newSession}</button><button type="button" className="btn-sacred btn-sacred-gold" disabled={loading || !consent || question.trim().length < 5 || (mode === "lesson" && !lessonId)} onClick={() => void sendQuestion()}>{loading ? copy.sending : `${copy.send} →`}</button></div>
        {feedbackEligible && !feedbackSent && <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", marginTop: "1rem" }}><button type="button" className="btn-sacred btn-sacred-ghost" onClick={() => void sendFeedback(true)}>👍 {copy.helpful}</button><button type="button" className="btn-sacred btn-sacred-ghost" onClick={() => void sendFeedback(false)}>👎 {copy.notHelpful}</button></div>}
      </SacredCard>

      <div style={{ textAlign: "center", margin: "1.2rem 0", color: "var(--text-muted)", fontSize: ".72rem", lineHeight: 1.6 }}><p>{copy.privateByDefault}</p><p>{copy.notAuthority} · {copy.notMonitored}</p><button type="button" onClick={() => void deleteHistory()} style={{ border: 0, background: "none", color: "rgba(237,232,220,.45)", textDecoration: "underline", cursor: "pointer", marginTop: ".5rem" }}>{copy.deleteHistory}</button></div>
    </SacredPage>
  );
}
