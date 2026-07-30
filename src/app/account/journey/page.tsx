"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SacredAlert, SacredCard, SacredHeading, SacredInput, SacredPage, SacredSelect } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { getJourneyPlannerCopy } from "@/lib/journey-planner-copy";
import { PERSONAL_ACTIVITY_TYPES } from "@/lib/journey-planner";

type CalendarEvent = {
  id: string;
  source: string;
  activityType: string;
  status: string;
  title: string;
  details: string;
  startsAt: string;
  durationMins: number | null;
  completedAt: string | null;
  editable: boolean;
};

type PrivateNote = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  aiAccessEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const buttonStyle = {
  border: "1px solid rgba(201,162,39,0.35)", borderRadius: "0.6rem", padding: "0.6rem 0.9rem",
  background: "rgba(201,162,39,0.08)", color: "var(--gold-light)", cursor: "pointer", fontWeight: 700,
} as const;

const textareaStyle = {
  width: "100%", padding: "0.75rem 0.9rem", background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border-gold)", borderRadius: "0.6rem", color: "var(--text-primary)",
  fontSize: "0.9rem", lineHeight: 1.6, resize: "vertical" as const,
};

function localInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateKey(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function JourneyPlannerPage() {
  const router = useRouter();
  const { status } = useSession();
  const { lang } = useLanguage();
  const c = getJourneyPlannerCopy(lang);
  const [tab, setTab] = useState<"calendar" | "notes">("calendar");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planDetails, setPlanDetails] = useState("");
  const [activityType, setActivityType] = useState("MEDITATION");
  const [scheduledFor, setScheduledFor] = useState(() => localInputValue());
  const [durationMins, setDurationMins] = useState("15");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [retentionDays, setRetentionDays] = useState("");
  const [aiAccessEnabled, setAiAccessEnabled] = useState(false);

  useEffect(() => { if (status === "anonymous") router.push("/login"); }, [router, status]);

  const days = useMemo(() => calendarDays(month), [month]);
  const loadCalendar = useCallback(async () => {
    const from = new Date(days[0]);
    const to = new Date(days[days.length - 1]);
    to.setDate(to.getDate() + 1);
    const response = await fetch(`/api/account/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" });
    if (!response.ok) throw new Error("calendar");
    const data = await response.json();
    setEvents(data.events || []);
  }, [days]);

  const loadNotes = useCallback(async () => {
    const response = await fetch("/api/account/notes", { cache: "no-store" });
    if (!response.ok) throw new Error("notes");
    const data = await response.json();
    setNotes(data.notes || []);
  }, []);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true); setError("");
    try { await Promise.all([loadCalendar(), loadNotes()]); }
    catch { setError(c.loadError); }
    finally { setLoading(false); }
  }, [c.loadError, loadCalendar, loadNotes, status]);

  useEffect(() => { void refresh(); }, [refresh]);

  const eventGroups = useMemo(() => events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    const key = dateKey(event.startsAt);
    (groups[key] ||= []).push(event);
    return groups;
  }, {}), [events]);

  async function createPlan(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/account/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: planTitle, details: planDetails, activityType, scheduledFor: new Date(scheduledFor).toISOString(), durationMins }) });
      if (!response.ok) throw new Error("save");
      setPlanTitle(""); setPlanDetails(""); await loadCalendar();
    } catch { setError(c.saveError); } finally { setSaving(false); }
  }

  async function quickLog(type: string) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/account/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: c.activities[type], details: "", activityType: type, status: "COMPLETED", scheduledFor: new Date().toISOString() }) });
      if (!response.ok) throw new Error("save");
      setSelectedDate(dateKey(new Date())); await loadCalendar();
    } catch { setError(c.saveError); } finally { setSaving(false); }
  }

  async function changePlan(event: CalendarEvent, nextStatus: string) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/account/plans/${event.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: event.title, details: event.details, activityType: event.activityType, status: nextStatus, scheduledFor: event.startsAt, durationMins: event.durationMins }) });
      if (!response.ok) throw new Error("save");
      await loadCalendar();
    } catch { setError(c.saveError); } finally { setSaving(false); }
  }

  async function deleteItem(kind: "plans" | "notes", id: string) {
    if (!window.confirm(c.confirmDelete)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/account/${kind}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      if (kind === "plans") await loadCalendar(); else await loadNotes();
    } catch { setError(c.saveError); } finally { setSaving(false); }
  }

  function resetNoteForm() {
    setEditingNoteId(null); setNoteTitle(""); setNoteBody(""); setNoteTags(""); setRetentionDays(""); setAiAccessEnabled(false);
  }

  function editNote(note: PrivateNote) {
    setEditingNoteId(note.id); setNoteTitle(note.title); setNoteBody(note.body); setNoteTags(note.tags.join(", ")); setAiAccessEnabled(note.aiAccessEnabled);
    if (!note.expiresAt) setRetentionDays("");
    else {
      const remaining = Math.max(1, Math.ceil((new Date(note.expiresAt).getTime() - Date.now()) / 86_400_000));
      setRetentionDays(remaining <= 30 ? "30" : remaining <= 90 ? "90" : "365");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(editingNoteId ? `/api/account/notes/${editingNoteId}` : "/api/account/notes", {
        method: editingNoteId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, body: noteBody, tags: noteTags.split(",").map((tag) => tag.trim()).filter(Boolean), retentionDays: retentionDays || null, aiAccessEnabled }),
      });
      if (!response.ok) throw new Error("save");
      resetNoteForm(); await loadNotes();
    } catch { setError(c.saveError); } finally { setSaving(false); }
  }

  const selectedEvents = eventGroups[selectedDate] || [];
  const monthLabel = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(month);
  const statusLabels: Record<string, string> = { PLANNED: c.planned, COMPLETED: c.completed, SKIPPED: c.skipped, CANCELLED: c.cancelled };

  if (status !== "authenticated") return <SacredPage><div style={{ textAlign: "center", padding: "4rem" }}>{c.saving}</div></SacredPage>;

  return (
    <SacredPage maxWidth={1120}>
      <Link href="/account" style={{ color: "var(--gold-light)", textDecoration: "none", fontSize: "0.82rem" }}>← Account</Link>
      <div style={{ marginTop: "1.25rem" }}><SacredHeading label={c.label} title={c.title} subtitle={c.subtitle} /></div>
      <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setTab("calendar")} style={{ ...buttonStyle, background: tab === "calendar" ? "rgba(201,162,39,0.22)" : buttonStyle.background }}>{c.calendar}</button>
        <button type="button" onClick={() => setTab("notes")} style={{ ...buttonStyle, background: tab === "notes" ? "rgba(201,162,39,0.22)" : buttonStyle.background }}>{c.notes}</button>
      </div>
      {error && <div style={{ marginBottom: "1rem" }}><SacredAlert text={error} /></div>}
      {loading ? <SacredCard><p>{c.saving}</p></SacredCard> : tab === "calendar" ? (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <SacredCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button type="button" style={buttonStyle} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>{c.previous}</button>
              <h2 className="font-sacred" style={{ color: "var(--gold-light)", textTransform: "capitalize" }}>{monthLabel}</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}><button type="button" style={buttonStyle} onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(dateKey(now)); }}>{c.today}</button><button type="button" style={buttonStyle} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>{c.next}</button></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {c.weekdays.map((day) => <div key={day} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.68rem", padding: "0.4rem 0" }}>{day}</div>)}
              {days.map((day) => {
                const key = dateKey(day); const count = eventGroups[key]?.length || 0; const active = key === selectedDate; const inMonth = day.getMonth() === month.getMonth();
                return <button key={key} type="button" onClick={() => setSelectedDate(key)} style={{ minHeight: 64, borderRadius: "0.55rem", border: active ? "1px solid var(--gold)" : "1px solid rgba(201,162,39,0.12)", background: active ? "rgba(201,162,39,0.16)" : "rgba(255,255,255,0.02)", color: inMonth ? "var(--text-primary)" : "rgba(237,232,220,0.25)", cursor: "pointer", position: "relative" }}><span>{day.getDate()}</span>{count > 0 && <span style={{ display: "block", color: "var(--gold-light)", fontSize: "0.65rem", marginTop: 6 }}>● {count}</span>}</button>;
              })}
            </div>
          </SacredCard>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            <SacredCard><h3 className="font-sacred" style={{ color: "var(--gold-light)", marginBottom: "1rem" }}>{c.selectedDay}: {selectedDate}</h3>{selectedEvents.length === 0 ? <p style={{ color: "var(--text-muted)" }}>{c.noEvents}</p> : <div style={{ display: "grid", gap: "0.75rem" }}>{selectedEvents.map((item) => <div key={item.id} style={{ border: "1px solid rgba(201,162,39,0.16)", borderRadius: "0.7rem", padding: "0.85rem" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}><strong style={{ color: "var(--text-primary)" }}>{item.title}</strong><span style={{ color: "var(--gold-light)", fontSize: "0.68rem" }}>{statusLabels[item.status] || item.status}</span></div><div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 5 }}>{c.activities[item.activityType] || item.activityType} · {new Date(item.startsAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}{item.durationMins ? ` · ${item.durationMins} min` : ""}</div>{item.details && <p style={{ color: "rgba(237,232,220,0.65)", fontSize: "0.8rem", marginTop: 8, whiteSpace: "pre-wrap" }}>{item.details}</p>}{item.editable && item.status === "PLANNED" && <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.7rem", flexWrap: "wrap" }}><button type="button" style={buttonStyle} disabled={saving} onClick={() => void changePlan(item, "COMPLETED")}>{c.complete}</button><button type="button" style={buttonStyle} disabled={saving} onClick={() => void changePlan(item, "SKIPPED")}>{c.skip}</button><button type="button" style={{ ...buttonStyle, color: "#fca5a5" }} disabled={saving} onClick={() => void deleteItem("plans", item.id)}>{c.remove}</button></div>}</div>)}</div>}</SacredCard>

            <SacredCard><h3 className="font-sacred" style={{ color: "var(--gold-light)", marginBottom: "1rem" }}>{c.addPlan}</h3><form onSubmit={createPlan} style={{ display: "grid", gap: "0.8rem" }}><SacredInput label={c.planTitle} value={planTitle} maxLength={120} required onChange={(e) => setPlanTitle(e.target.value)} /><SacredSelect label={c.activity} value={activityType} onChange={(e) => setActivityType(e.target.value)}>{PERSONAL_ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{c.activities[type]}</option>)}</SacredSelect><SacredInput label={c.dateTime} type="datetime-local" value={scheduledFor} required onChange={(e) => setScheduledFor(e.target.value)} /><SacredInput label={c.duration} type="number" min={1} max={1440} value={durationMins} onChange={(e) => setDurationMins(e.target.value)} /><textarea aria-label={c.details} style={textareaStyle} rows={3} maxLength={2000} placeholder={c.details} value={planDetails} onChange={(e) => setPlanDetails(e.target.value)} /><button type="submit" style={buttonStyle} disabled={saving}>{saving ? c.saving : c.savePlan}</button></form></SacredCard>
          </div>

          <SacredCard><h3 className="font-sacred" style={{ color: "var(--gold-light)", marginBottom: "0.8rem" }}>{c.quickLog}</h3><div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>{["MEDITATION", "YOGA", "READING", "REFLECTION"].map((type) => <button key={type} type="button" style={buttonStyle} disabled={saving} onClick={() => void quickLog(type)}>✓ {c.activities[type]}</button>)}</div></SacredCard>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "1.25rem", alignItems: "start" }}>
          <SacredCard><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}><div><h3 className="font-sacred" style={{ color: "var(--gold-light)" }}>{c.newNote}</h3><p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: 4 }}>🔐 {c.encrypted}</p></div>{editingNoteId && <button type="button" style={buttonStyle} onClick={resetNoteForm}>×</button>}</div><form onSubmit={saveNote} style={{ display: "grid", gap: "0.8rem" }}><SacredInput label={c.noteTitle} value={noteTitle} maxLength={160} required onChange={(e) => setNoteTitle(e.target.value)} /><textarea aria-label={c.noteBody} style={textareaStyle} rows={9} maxLength={20000} required placeholder={c.noteBody} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} /><SacredInput label={`${c.tags} · ${c.tagsHint}`} value={noteTags} onChange={(e) => setNoteTags(e.target.value)} /><SacredSelect label={c.retention} value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)}><option value="">{c.forever}</option><option value="30">{c.days30}</option><option value="90">{c.days90}</option><option value="365">{c.days365}</option></SacredSelect><label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", color: "rgba(237,232,220,0.72)", fontSize: "0.78rem", lineHeight: 1.5 }}><input type="checkbox" checked={aiAccessEnabled} onChange={(e) => setAiAccessEnabled(e.target.checked)} /><span>{c.aiAccess}<small style={{ display: "block", color: "var(--text-muted)", marginTop: 3 }}>{c.aiAccessHint}</small></span></label><button type="submit" style={buttonStyle} disabled={saving}>{saving ? c.saving : editingNoteId ? c.updateNote : c.saveNote}</button></form></SacredCard>
          <div style={{ display: "grid", gap: "0.9rem" }}><div style={{ display: "flex", justifyContent: "flex-end" }}><a href="/api/account/notes?export=1" style={{ ...buttonStyle, textDecoration: "none" }}>{c.exportNotes}</a></div>{notes.length === 0 ? <SacredCard><p style={{ color: "var(--text-muted)" }}>{c.noNotes}</p></SacredCard> : notes.map((note) => <SacredCard key={note.id}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}><div><h3 className="font-sacred" style={{ color: "var(--gold-light)" }}>{note.title}</h3><p style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginTop: 4 }}>{new Date(note.updatedAt).toLocaleString(lang)} · {note.aiAccessEnabled ? "AI opt-in" : "AI off"}</p></div><div style={{ display: "flex", gap: "0.4rem" }}><button type="button" style={buttonStyle} onClick={() => editNote(note)}>{c.edit}</button><button type="button" style={{ ...buttonStyle, color: "#fca5a5" }} onClick={() => void deleteItem("notes", note.id)}>{c.remove}</button></div></div><p style={{ color: "rgba(237,232,220,0.78)", whiteSpace: "pre-wrap", lineHeight: 1.65, marginTop: "0.9rem" }}>{note.body}</p>{note.tags.length > 0 && <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.8rem" }}>{note.tags.map((tag) => <span key={tag} style={{ fontSize: "0.68rem", color: "var(--gold-light)", border: "1px solid rgba(201,162,39,0.2)", borderRadius: 999, padding: "0.2rem 0.5rem" }}>#{tag}</span>)}</div>}</SacredCard>)}</div>
        </div>
      )}
    </SacredPage>
  );
}
