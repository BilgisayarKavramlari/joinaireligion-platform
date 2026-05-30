"use client";

/**
 * FeedbackButton — persistent bottom-right floating button.
 *
 * Rendered in the root layout so it appears on every page.
 * Submits to POST /api/feedback; works for authenticated users.
 * The button is intentionally unobtrusive until clicked.
 */

import { useState } from "react";

type FeedbackCategory =
  | "BUG"
  | "TRANSLATION"
  | "CONTENT"
  | "COMPLAINT"
  | "FEATURE_REQUEST";

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "BUG",              label: "🐛 Bug Report"         },
  { value: "TRANSLATION",      label: "🌐 Translation Issue"  },
  { value: "CONTENT",          label: "📖 Content Issue"      },
  { value: "COMPLAINT",        label: "⚠️ Complaint"           },
  { value: "FEATURE_REQUEST",  label: "💡 Feature Request"    },
];

type FormState = "idle" | "open" | "submitting" | "success" | "error";

export function FeedbackButton() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [category,  setCategory]  = useState<FeedbackCategory>("BUG");
  const [message,   setMessage]   = useState("");
  const [errorMsg,  setErrorMsg]  = useState("");

  function handleOpen() {
    setFormState("open");
    setMessage("");
    setErrorMsg("");
  }

  function handleClose() {
    setFormState("idle");
    setMessage("");
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Please describe the issue or request.");
      return;
    }
    setFormState("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          category,
          message: message.trim(),
          pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? "Submission failed. Please try again.");
        setFormState("open");
        return;
      }
      setFormState("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setFormState("open");
    }
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={handleOpen}
        aria-label="Send feedback"
        style={{
          position:     "fixed",
          bottom:       "1.5rem",
          right:        "1.5rem",
          zIndex:       9000,
          width:        44,
          height:       44,
          borderRadius: "50%",
          background:   "rgba(25, 22, 18, 0.92)",
          border:       "1.5px solid rgba(201,162,39,0.35)",
          color:        "rgba(201,162,39,0.75)",
          fontSize:     "1.1rem",
          cursor:       "pointer",
          display:      formState === "idle" || formState === "success" ? "flex" : "none",
          alignItems:   "center",
          justifyContent: "center",
          boxShadow:    "0 2px 12px rgba(0,0,0,0.5)",
          transition:   "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,162,39,0.7)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,162,39,0.35)";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(201,162,39,0.75)";
        }}
      >
        💬
      </button>

      {/* ── Modal overlay ── */}
      {(formState === "open" || formState === "submitting" || formState === "error") && (
        <div
          onClick={handleClose}
          style={{
            position:   "fixed",
            inset:      0,
            zIndex:     9001,
            background: "rgba(0,0,0,0.45)",
            display:    "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding:    "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width:        "min(380px, calc(100vw - 3rem))",
              background:   "rgba(18, 15, 10, 0.97)",
              border:       "1px solid rgba(201,162,39,0.3)",
              borderRadius: "1rem",
              padding:      "1.4rem",
              boxShadow:    "0 8px 40px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: "var(--gold)", textTransform: "uppercase" }}>
                ✦ Send Feedback
              </p>
              <button
                onClick={handleClose}
                style={{ background: "none", border: "none", color: "rgba(237,232,220,0.4)", cursor: "pointer", fontSize: "1rem", padding: "0.1rem 0.3rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Category selector */}
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.45)", display: "block", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>
                  CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                  style={{
                    width:        "100%",
                    padding:      "0.55rem 0.75rem",
                    borderRadius: "0.5rem",
                    border:       "1px solid rgba(201,162,39,0.25)",
                    background:   "rgba(255,255,255,0.04)",
                    color:        "var(--text-primary)",
                    fontSize:     "0.82rem",
                    outline:      "none",
                    cursor:       "pointer",
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} style={{ background: "#1a1610" }}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.45)", display: "block", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>
                  MESSAGE
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue, suggestion, or request…"
                  rows={4}
                  maxLength={2000}
                  style={{
                    width:        "100%",
                    padding:      "0.6rem 0.75rem",
                    borderRadius: "0.5rem",
                    border:       "1px solid rgba(201,162,39,0.2)",
                    background:   "rgba(255,255,255,0.03)",
                    color:        "var(--text-primary)",
                    fontSize:     "0.82rem",
                    lineHeight:   1.6,
                    resize:       "vertical",
                    outline:      "none",
                    fontFamily:   "inherit",
                    boxSizing:    "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(201,162,39,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(201,162,39,0.2)")}
                />
                <p style={{ fontSize: "0.62rem", color: "rgba(237,232,220,0.25)", marginTop: "0.25rem", textAlign: "right" }}>
                  {message.length}/2000
                </p>
              </div>

              {errorMsg && (
                <p style={{ fontSize: "0.75rem", color: "#f87171", marginBottom: "0.7rem", padding: "0.5rem 0.7rem", background: "rgba(248,113,113,0.08)", borderRadius: "0.4rem", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={formState === "submitting"}
                className="btn-sacred btn-sacred-gold"
                style={{ width: "100%", padding: "0.65rem", fontSize: "0.82rem", letterSpacing: "0.08em", opacity: formState === "submitting" ? 0.6 : 1 }}
              >
                {formState === "submitting" ? "Sending…" : "Send Feedback"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {formState === "success" && (
        <div
          onClick={() => setFormState("idle")}
          style={{
            position:     "fixed",
            bottom:       "4.5rem",
            right:        "1.5rem",
            zIndex:       9000,
            background:   "rgba(20,184,166,0.15)",
            border:       "1px solid rgba(20,184,166,0.4)",
            borderRadius: "0.75rem",
            padding:      "0.7rem 1rem",
            fontSize:     "0.78rem",
            color:        "#5eead4",
            cursor:       "pointer",
            boxShadow:    "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          ✓ Feedback received — thank you
        </div>
      )}
    </>
  );
}
