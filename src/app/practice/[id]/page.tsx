"use client";

/**
 * /practice/[id]
 *
 * Protected page for reading and responding to a PracticeMessage.
 *
 * States:
 *   loading          → spinner
 *   unauthorized     → prompt to log in
 *   notFound         → 404 message
 *   alreadySubmitted → display previous response, no form
 *   ready            → practice content + response form
 *   submitting       → form disabled with spinner
 *   success          → confirmation panel
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SacredPage, SacredCard, SacredAlert } from "@/components/ui/SacredPage";

// ─── Types ────────────────────────────────────────────────────────────────────

type PracticeMessageData = {
  id: string;
  userId: string;
  cadence: "DAILY" | "WEEKLY";
  scheduledDate: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  xpReward: number;
};

type ExistingResponse = {
  id: string;
  responseText: string;
  score: number | null;
  xpEarned: number;
  createdAt: string;
};

type PageState =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "notFound" }
  | { status: "forbidden" }
  | {
      status: "ready" | "alreadySubmitted" | "submitting" | "success";
      message: PracticeMessageData;
      existingResponse: ExistingResponse | null;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_LENGTH = 3000;

/**
 * Extracts the practice instruction and reflection question from the stored
 * plain-text body produced by practice-builder.ts.
 *
 * The format is:
 *   [greeting + metadata]
 *   ─────────────────────
 *   [instruction]
 *   ─────────────────────
 *   Reflection question:
 *   [reflection]
 *   [CTA + sign-off]
 */
function parseBodyText(text: string): { instruction: string; reflection: string } {
  const SEP = "─────────────────────────────────";
  const parts = text.split(SEP);
  const instruction = (parts[1] ?? "").trim();
  const afterSep = (parts[2] ?? "").trim();
  const reflMatch = afterSep.match(/Reflection question:\s*\n([\s\S]+?)(?:\n\n|$)/);
  const reflection = (reflMatch?.[1] ?? "").trim();
  return { instruction, reflection };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "0.68rem",
        letterSpacing: "0.35em",
        color: "var(--gold)",
        textTransform: "uppercase",
        marginBottom: "0.6rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      ✦ {children} ✦
    </p>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PracticeText({ text }: { text: string }) {
  return (
    <div>
      {text.split("\n").map((line, i) => {
        if (!line.trim())
          return <div key={i} style={{ height: "0.5rem" }} />;
        return (
          <p
            key={i}
            style={{
              color: "rgba(237,232,220,0.82)",
              lineHeight: 1.85,
              fontSize: "0.95rem",
              marginBottom: "0.3rem",
            }}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [responseText, setResponseText] = useState("");
  const [submitError, setSubmitError] = useState("");

  // ── Fetch practice message ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/practice/${id}`)
      .then(async (res) => {
        if (res.status === 401) {
          setState({ status: "unauthorized" });
          return;
        }
        if (res.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        if (res.status === 404) {
          setState({ status: "notFound" });
          return;
        }
        if (!res.ok) {
          setState({ status: "notFound" });
          return;
        }
        const data = (await res.json()) as {
          message: PracticeMessageData;
          existingResponse: ExistingResponse | null;
        };
        setState({
          status: data.existingResponse ? "alreadySubmitted" : "ready",
          message: data.message,
          existingResponse: data.existingResponse,
        });
      })
      .catch(() => setState({ status: "notFound" }));
  }, [id]);

  // ── Submit response ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "ready") return;
    setSubmitError("");

    const trimmed = responseText.trim();
    if (!trimmed) {
      setSubmitError("Please write your reflection before submitting.");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setSubmitError(`Response exceeds ${MAX_LENGTH} characters.`);
      return;
    }

    setState({ ...state, status: "submitting" });

    try {
      const res = await fetch("/api/practice/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, responseText: trimmed }),
      });

      const body = (await res.json()) as {
        response?: ExistingResponse;
        error?: string;
      };

      if (!res.ok) {
        setState({ ...state, status: "ready" });
        setSubmitError(body.error ?? "Submission failed. Please try again.");
        return;
      }

      setState({
        ...state,
        status: "success",
        existingResponse: body.response ?? null,
      });
    } catch {
      setState({ ...state, status: "ready" });
      setSubmitError("Network error. Please try again.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Loading
  if (state.status === "loading") {
    return (
      <SacredPage maxWidth={720}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "40vh",
            color: "rgba(237,232,220,0.4)",
            fontSize: "0.9rem",
          }}
        >
          Loading your practice…
        </div>
      </SacredPage>
    );
  }

  // Unauthorized
  if (state.status === "unauthorized") {
    return (
      <SacredPage maxWidth={520}>
        <SacredCard style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.35em",
              color: "var(--gold)",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            ✦ Practice ✦
          </p>
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.8rem",
            }}
          >
            Sign in to continue
          </h1>
          <p
            style={{
              color: "rgba(237,232,220,0.55)",
              fontSize: "0.9rem",
              marginBottom: "2rem",
            }}
          >
            Your practice awaits. Please log in to view and respond.
          </p>
          <Link
            href={`/login?next=/practice/${id}`}
            style={{
              display: "inline-block",
              background: "#c9a227",
              color: "#0a0614",
              fontWeight: 600,
              fontSize: "0.88rem",
              letterSpacing: "0.04em",
              textDecoration: "none",
              padding: "0.7rem 2rem",
              borderRadius: "0.5rem",
            }}
          >
            Sign in
          </Link>
        </SacredCard>
      </SacredPage>
    );
  }

  // Forbidden / Not found
  if (state.status === "forbidden" || state.status === "notFound") {
    return (
      <SacredPage maxWidth={520}>
        <SacredCard style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.35em",
              color: "var(--gold)",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            ✦ Practice ✦
          </p>
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.8rem",
            }}
          >
            {state.status === "forbidden" ? "Access denied" : "Practice not found"}
          </h1>
          <p
            style={{
              color: "rgba(237,232,220,0.55)",
              fontSize: "0.9rem",
              marginBottom: "2rem",
            }}
          >
            {state.status === "forbidden"
              ? "This practice message belongs to another account."
              : "This practice message could not be found."}
          </p>
          <Link
            href="/account"
            style={{
              color: "var(--gold)",
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            ← Back to your journey
          </Link>
        </SacredCard>
      </SacredPage>
    );
  }

  // All remaining states have message data
  const { message, existingResponse } = state;
  const parsed = parseBodyText(message.bodyText ?? "");
  const dateLabel = formatDate(message.scheduledDate);
  const cadenceLabel = message.cadence === "DAILY" ? "Daily Practice" : "Weekly Practice";

  // Already submitted
  if (state.status === "alreadySubmitted") {
    return (
      <SacredPage maxWidth={720}>
        <Link
          href="/account"
          style={{
            fontSize: "0.75rem",
            color: "rgba(237,232,220,0.4)",
            textDecoration: "none",
            display: "block",
            marginBottom: "1.5rem",
          }}
        >
          ← Your journey
        </Link>

        <div style={{ marginBottom: "2.5rem" }}>
          <p
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.35em",
              color: "var(--gold)",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
            }}
          >
            ✦ {cadenceLabel} ✦
          </p>
          <h1
            className="font-sacred"
            style={{
              fontSize: "clamp(1.4rem,4vw,2rem)",
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: "0.3rem",
            }}
          >
            {message.subject ?? "Your Practice"}
          </h1>
          <p
            style={{
              fontSize: "0.82rem",
              color: "rgba(237,232,220,0.4)",
            }}
          >
            {dateLabel}
          </p>
        </div>

        <SacredAlert
          text="You have already submitted your reflection for this practice."
          tone="success"
        />

        {existingResponse && (
          <SacredCard style={{ marginTop: "1.5rem" }}>
            <Section label="Your Reflection">
              <p
                style={{
                  color: "rgba(237,232,220,0.75)",
                  lineHeight: 1.8,
                  fontSize: "0.93rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {existingResponse.responseText}
              </p>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "0.75rem",
                  color: "rgba(237,232,220,0.35)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Submitted{" "}
                {new Date(existingResponse.createdAt).toLocaleDateString()}
                {existingResponse.score !== null &&
                  ` · Score: ${existingResponse.score}/5`}
                {existingResponse.xpEarned > 0 &&
                  ` · +${existingResponse.xpEarned} XP`}
              </p>
            </Section>
          </SacredCard>
        )}

        {parsed.reflection && (
          <SacredCard style={{ marginTop: "1.5rem" }}>
            <Section label="Reflection Question">
              <p
                style={{
                  fontStyle: "italic",
                  color: "rgba(237,232,220,0.65)",
                  lineHeight: 1.75,
                  fontSize: "0.95rem",
                }}
              >
                {parsed.reflection}
              </p>
            </Section>
          </SacredCard>
        )}
      </SacredPage>
    );
  }

  // Success state
  if (state.status === "success") {
    return (
      <SacredPage maxWidth={720}>
        <SacredCard style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
            }}
          >
            ✦
          </div>
          <p
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.35em",
              color: "var(--gold)",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Reflection Received
          </p>
          <h1
            className="font-sacred"
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: "0.8rem",
            }}
          >
            Your reflection has been saved
          </h1>
          <p
            style={{
              color: "rgba(237,232,220,0.6)",
              fontSize: "0.9rem",
              lineHeight: 1.7,
              maxWidth: 440,
              margin: "0 auto 2rem",
            }}
          >
            Thank you for engaging with this practice. Your reflection becomes
            part of your inner journey record and will be reviewed soon.
          </p>
          {message.xpReward > 0 && (
            <div
              style={{
                display: "inline-block",
                background: "rgba(201,162,39,0.08)",
                border: "1px solid rgba(201,162,39,0.3)",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.2rem",
                fontSize: "0.8rem",
                color: "var(--gold-light)",
                marginBottom: "2rem",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              +{message.xpReward} XP will be awarded after scoring
            </div>
          )}
          <div>
            <Link
              href="/account"
              style={{
                display: "inline-block",
                background: "#c9a227",
                color: "#0a0614",
                fontWeight: 600,
                fontSize: "0.88rem",
                letterSpacing: "0.04em",
                textDecoration: "none",
                padding: "0.7rem 2rem",
                borderRadius: "0.5rem",
              }}
            >
              Return to your journey
            </Link>
          </div>
        </SacredCard>
      </SacredPage>
    );
  }

  // ready / submitting
  const isSubmitting = state.status === "submitting";
  const remaining = MAX_LENGTH - responseText.length;

  return (
    <SacredPage maxWidth={720}>
      <Link
        href="/account"
        style={{
          fontSize: "0.75rem",
          color: "rgba(237,232,220,0.4)",
          textDecoration: "none",
          display: "block",
          marginBottom: "1.5rem",
        }}
      >
        ← Your journey
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.35em",
            color: "var(--gold)",
            textTransform: "uppercase",
            marginBottom: "0.6rem",
          }}
        >
          ✦ {cadenceLabel} ✦
        </p>
        <h1
          className="font-sacred"
          style={{
            fontSize: "clamp(1.4rem,4vw,2rem)",
            fontWeight: 900,
            color: "var(--text-primary)",
            marginBottom: "0.3rem",
          }}
        >
          {message.subject ?? "Your Practice"}
        </h1>
        <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.4)" }}>
          {dateLabel}
        </p>
      </div>

      {/* Practice instruction */}
      {parsed.instruction && (
        <SacredCard style={{ marginBottom: "1.5rem" }}>
          <Section label="Practice">
            <PracticeText text={parsed.instruction} />
          </Section>
        </SacredCard>
      )}

      {/* Reflection prompt */}
      {parsed.reflection && (
        <SacredCard style={{ marginBottom: "1.5rem" }}>
          <Section label="Reflection Question">
            <p
              style={{
                fontStyle: "italic",
                color: "rgba(237,232,220,0.75)",
                lineHeight: 1.8,
                fontSize: "0.97rem",
              }}
            >
              {parsed.reflection}
            </p>
          </Section>
        </SacredCard>
      )}

      {/* Response form */}
      <SacredCard>
        <Section label="Your Reflection">
          <p
            style={{
              fontSize: "0.83rem",
              color: "rgba(237,232,220,0.5)",
              marginBottom: "1rem",
              lineHeight: 1.6,
            }}
          >
            Take your time. Write what genuinely arose for you during this
            practice — there are no right or wrong answers.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ position: "relative" }}>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                disabled={isSubmitting}
                placeholder="Begin writing your reflection here…"
                rows={10}
                maxLength={MAX_LENGTH}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    remaining < 0
                      ? "rgba(239,68,68,0.5)"
                      : "rgba(201,162,39,0.25)"
                  }`,
                  borderRadius: "0.6rem",
                  color: "var(--text-primary)",
                  fontSize: "0.93rem",
                  lineHeight: 1.75,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "Georgia, serif",
                  transition: "border-color 0.2s",
                  opacity: isSubmitting ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
              />
              <p
                style={{
                  position: "absolute",
                  bottom: "0.5rem",
                  right: "0.75rem",
                  fontSize: "0.7rem",
                  color:
                    remaining < 100
                      ? remaining < 0
                        ? "#fca5a5"
                        : "rgba(201,162,39,0.6)"
                      : "rgba(237,232,220,0.2)",
                  fontFamily: "system-ui, sans-serif",
                  pointerEvents: "none",
                }}
              >
                {responseText.length} / {MAX_LENGTH}
              </p>
            </div>

            {submitError && (
              <div style={{ marginTop: "0.75rem" }}>
                <SacredAlert text={submitError} tone="error" />
              </div>
            )}

            <div
              style={{
                marginTop: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <button
                type="submit"
                disabled={isSubmitting || responseText.trim().length === 0}
                style={{
                  background:
                    isSubmitting || responseText.trim().length === 0
                      ? "rgba(201,162,39,0.35)"
                      : "#c9a227",
                  color:
                    isSubmitting || responseText.trim().length === 0
                      ? "rgba(10,6,20,0.5)"
                      : "#0a0614",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 2rem",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  letterSpacing: "0.04em",
                  cursor:
                    isSubmitting || responseText.trim().length === 0
                      ? "not-allowed"
                      : "pointer",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                {isSubmitting ? "Saving reflection…" : "Submit reflection"}
              </button>

              {message.xpReward > 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(237,232,220,0.35)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Earns up to +{message.xpReward} XP after scoring
                </span>
              )}
            </div>
          </form>
        </Section>
      </SacredCard>
    </SacredPage>
  );
}
