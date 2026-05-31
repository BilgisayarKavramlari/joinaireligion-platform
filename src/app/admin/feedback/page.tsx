/**
 * /admin/feedback
 *
 * Admin review surface for FeedbackItem records.
 * Server component — fetches items on render, supports status update via POST.
 * Pagination: 50 items per page, newest first.
 * Filter: category, status.
 */

export const dynamic = "force-dynamic";

import React from "react";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  FeedbackAuthState,
  FeedbackCategory,
  FeedbackStatus,
  SupportTriageCategory,
  SupportTriageRecommendedAction,
  SupportTriageSeverity,
  SupportTriageStatus,
} from "@prisma/client";

// ─── Status update action ──────────────────────────────────────────────────────

async function updateFeedbackStatus(formData: FormData) {
  "use server";
  const id        = formData.get("id")         as string;
  const status    = formData.get("status")     as FeedbackStatus;
  const adminNotes = (formData.get("adminNotes") as string | null) ?? undefined;
  if (!id || !status) return;
  await db.feedbackItem.update({
    where: { id },
    data: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
  });
}

// ─── Category / status display helpers ────────────────────────────────────────

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  BUG:              "🐛 Bug",
  TRANSLATION:      "🌐 Translation",
  CONTENT:          "📖 Content",
  COMPLAINT:        "⚠️ Complaint",
  FEATURE_REQUEST:  "💡 Feature Request",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  OPEN:        "#f97316",
  IN_REVIEW:   "#c9a227",
  RESOLVED:    "#14b8a6",
  WONT_FIX:    "#6b7280",
};

const AUTH_STATE_COLORS: Record<FeedbackAuthState, string> = {
  AUTHENTICATED: "#14b8a6",
  ANONYMOUS: "#94a3b8",
};

const FEEDBACK_USER_SELECT = { email: true, displayName: true, role: true } as const;

const FEEDBACK_FULL_SELECT = {
  id: true,
  userId: true,
  category: true,
  status: true,
  authState: true,
  submitterEmail: true,
  submitterLocale: true,
  pageUrl: true,
  userAgent: true,
  pageContext: true,
  message: true,
  adminNotes: true,
  triageCategory: true,
  triageSeverity: true,
  recommendedAction: true,
  triageStatus: true,
  triagedAt: true,
  createdAt: true,
  user: { select: FEEDBACK_USER_SELECT },
} as const;

const FEEDBACK_LEGACY_SELECT = {
  id: true,
  userId: true,
  category: true,
  status: true,
  pageContext: true,
  message: true,
  adminNotes: true,
  createdAt: true,
  user: { select: FEEDBACK_USER_SELECT },
} as const;

type FeedbackListItem = {
  id: string;
  userId: string | null;
  category: FeedbackCategory;
  status: FeedbackStatus;
  authState: FeedbackAuthState;
  submitterEmail: string | null;
  submitterLocale: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  pageContext: string | null;
  message: string;
  adminNotes: string | null;
  triageCategory: SupportTriageCategory | null;
  triageSeverity: SupportTriageSeverity | null;
  recommendedAction: SupportTriageRecommendedAction | null;
  triageStatus: SupportTriageStatus | null;
  triagedAt: Date | null;
  createdAt: Date;
  user: {
    email: string;
    displayName: string | null;
    role: string;
  } | null;
};

async function loadFeedbackItems(args: {
  where: Record<string, unknown>;
  page: number;
  pageSize: number;
}): Promise<{ items: FeedbackListItem[]; compatibilityMode: boolean }> {
  const queryArgs = {
    where: args.where,
    orderBy: { createdAt: "desc" as const },
    skip: (args.page - 1) * args.pageSize,
    take: args.pageSize,
  };

  try {
    const items = await db.feedbackItem.findMany({
      ...queryArgs,
      select: FEEDBACK_FULL_SELECT,
    });

    return {
      compatibilityMode: false,
      items: items.map((item) => ({
        ...item,
        authState: item.authState ?? (item.userId ? FeedbackAuthState.AUTHENTICATED : FeedbackAuthState.ANONYMOUS),
        submitterEmail: item.submitterEmail ?? null,
        submitterLocale: item.submitterLocale ?? null,
        pageUrl: item.pageUrl ?? item.pageContext ?? null,
        userAgent: item.userAgent ?? null,
        pageContext: item.pageContext ?? null,
        adminNotes: item.adminNotes ?? null,
        triageCategory: item.triageCategory ?? null,
        triageSeverity: item.triageSeverity ?? null,
        recommendedAction: item.recommendedAction ?? null,
        triageStatus: item.triageStatus ?? null,
        triagedAt: item.triagedAt ?? null,
      })),
    };
  } catch (error) {
    console.warn("admin_feedback_legacy_query_fallback", error);

    const legacyItems = await db.feedbackItem.findMany({
      ...queryArgs,
      select: FEEDBACK_LEGACY_SELECT,
    });

    return {
      compatibilityMode: true,
      items: legacyItems.map((item) => ({
        ...item,
        authState: item.userId ? FeedbackAuthState.AUTHENTICATED : FeedbackAuthState.ANONYMOUS,
        submitterEmail: item.user?.email ?? null,
        submitterLocale: null,
        pageUrl: item.pageContext ?? null,
        userAgent: null,
        pageContext: item.pageContext ?? null,
        adminNotes: item.adminNotes ?? null,
        triageCategory: null,
        triageSeverity: null,
        recommendedAction: null,
        triageStatus: null,
        triagedAt: null,
      })),
    };
  }
}

const TRIAGE_SEVERITY_COLORS: Record<SupportTriageSeverity, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#c9a227",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const TRIAGE_ACTION_COLORS: Record<SupportTriageRecommendedAction, string> = {
  AUTO_REPLY_DRAFT: "#14b8a6",
  CREATE_CODING_TASK: "#c9a227",
  ESCALATE_TO_ADMIN: "#f97316",
  MARK_SPAM: "#ef4444",
  MONITOR: "#94a3b8",
};

function formatTriageLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; status?: string }>;
}

export default async function AdminFeedbackPage({ searchParams }: PageProps) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const sp         = await searchParams;
  const page       = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize   = 50;
  const filterCat  = sp.category as FeedbackCategory | undefined;
  const filterStat = sp.status   as FeedbackStatus   | undefined;

  const where = {
    ...(filterCat  ? { category: filterCat  } : {}),
    ...(filterStat ? { status:   filterStat  } : {}),
  };

  const [{ items, compatibilityMode }, total] = await Promise.all([
    loadFeedbackItems({ where, page, pageSize }),
    db.feedbackItem.count({ where }),
  ]);

  // Summary counts for status tabs
  const statusCounts = await db.feedbackItem.groupBy({
    by:      ["status"],
    _count:  { _all: true },
  });
  const countsByStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, r._count._all])
  ) as Partial<Record<FeedbackStatus, number>>;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          ✦ Admin
        </p>
        <h1 className="font-sacred" style={{ fontSize: "2rem", color: "var(--text-primary)", marginBottom: "0.4rem" }}>
          Feedback Review
        </h1>
        <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.45)" }}>
          {total} total submissions
        </p>
        {compatibilityMode && (
          <p style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: "#f0d47a" }}>
            Compatibility mode active: rendering feedback with legacy-safe fields while newer metadata columns are unavailable.
          </p>
        )}
      </div>

      {/* Status summary tabs */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {(["OPEN", "IN_REVIEW", "RESOLVED", "WONT_FIX"] as FeedbackStatus[]).map((s) => (
          <a
            key={s}
            href={`/admin/feedback?status=${s}`}
            style={{
              padding:      "0.35rem 0.85rem",
              borderRadius: "2rem",
              fontSize:     "0.72rem",
              border:       `1px solid ${filterStat === s ? STATUS_COLORS[s] : "rgba(255,255,255,0.1)"}`,
              background:   filterStat === s ? `${STATUS_COLORS[s]}22` : "transparent",
              color:        filterStat === s ? STATUS_COLORS[s] : "rgba(237,232,220,0.5)",
              textDecoration: "none",
              letterSpacing: "0.05em",
            }}
          >
            {s.replace("_", " ")} {countsByStatus[s] ? `(${countsByStatus[s]})` : ""}
          </a>
        ))}
        {filterStat && (
          <a href="/admin/feedback" style={{ padding: "0.35rem 0.85rem", fontSize: "0.72rem", color: "rgba(237,232,220,0.35)", textDecoration: "none" }}>
            ✕ Clear
          </a>
        )}
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(237,232,220,0.35)", fontSize: "0.88rem" }}>
            No feedback items match these filters.
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding:      "1.1rem 1.3rem",
              borderRadius: "0.75rem",
              border:       `1px solid rgba(255,255,255,0.07)`,
              background:   "rgba(255,255,255,0.02)",
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBottom: "0.6rem" }}>
              <span style={{
                padding:      "0.2rem 0.6rem",
                borderRadius: "0.3rem",
                fontSize:     "0.68rem",
                background:   "rgba(201,162,39,0.12)",
                color:        "var(--gold)",
                border:       "1px solid rgba(201,162,39,0.2)",
              }}>
                {CATEGORY_LABELS[item.category]}
              </span>
              <span style={{
                padding:      "0.2rem 0.6rem",
                borderRadius: "0.3rem",
                fontSize:     "0.68rem",
                background:   `${STATUS_COLORS[item.status]}15`,
                color:        STATUS_COLORS[item.status],
                border:       `1px solid ${STATUS_COLORS[item.status]}40`,
              }}>
                {item.status.replace("_", " ")}
              </span>
              <span style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.3)", marginLeft: "auto" }}>
                {item.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.7rem" }}>
              <span style={{
                padding:      "0.2rem 0.6rem",
                borderRadius: "0.3rem",
                fontSize:     "0.68rem",
                background:   `${AUTH_STATE_COLORS[item.authState]}15`,
                color:        AUTH_STATE_COLORS[item.authState],
                border:       `1px solid ${AUTH_STATE_COLORS[item.authState]}40`,
              }}>
                {item.authState === "AUTHENTICATED" ? "authenticated session" : "anonymous session"}
              </span>
              <span style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.55)" }}>
                {item.user?.email
                  ? `Linked user: ${item.user.displayName ?? item.user.email}${item.user.role !== "USER" ? ` · ${item.user.role}` : ""}`
                  : item.submitterEmail
                  ? `Submitted as: ${item.submitterEmail}`
                  : "No linked user"}
              </span>
            </div>

            {/* Message */}
            <p style={{ fontSize: "0.84rem", color: "rgba(237,232,220,0.8)", lineHeight: 1.6, marginBottom: item.pageUrl || item.submitterLocale || item.userAgent ? "0.4rem" : "0.8rem" }}>
              {item.message}
            </p>

            {(item.pageUrl || item.submitterLocale || item.userAgent) && (
              <div style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.3)", marginBottom: "0.8rem", display: "grid", gap: "0.2rem" }}>
                {item.pageUrl && <p>Page: {item.pageUrl}</p>}
                {item.submitterLocale && <p>Locale: {item.submitterLocale}</p>}
                {item.userAgent && <p>User agent: {item.userAgent}</p>}
              </div>
            )}

            {(item.triageCategory || item.triageSeverity || item.recommendedAction || item.triageStatus || item.triagedAt) && (
              <div
                style={{
                  marginBottom: "0.8rem",
                  padding: "0.7rem 0.8rem",
                  borderRadius: "0.55rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: item.triagedAt ? "0.45rem" : 0 }}>
                  {item.triageCategory && (
                    <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", background: "rgba(201,162,39,0.12)", color: "var(--gold)", border: "1px solid rgba(201,162,39,0.2)" }}>
                      triage: {formatTriageLabel(item.triageCategory)}
                    </span>
                  )}
                  {item.triageSeverity && (
                    <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", background: `${TRIAGE_SEVERITY_COLORS[item.triageSeverity]}15`, color: TRIAGE_SEVERITY_COLORS[item.triageSeverity], border: `1px solid ${TRIAGE_SEVERITY_COLORS[item.triageSeverity]}40` }}>
                      severity: {formatTriageLabel(item.triageSeverity)}
                    </span>
                  )}
                  {item.recommendedAction && (
                    <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", background: `${TRIAGE_ACTION_COLORS[item.recommendedAction]}15`, color: TRIAGE_ACTION_COLORS[item.recommendedAction], border: `1px solid ${TRIAGE_ACTION_COLORS[item.recommendedAction]}40` }}>
                      action: {formatTriageLabel(item.recommendedAction)}
                    </span>
                  )}
                  {item.triageStatus && (
                    <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", background: "rgba(148,163,184,0.14)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.24)" }}>
                      triage status: {formatTriageLabel(item.triageStatus)}
                    </span>
                  )}
                </div>
                {item.triagedAt && (
                  <p style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.38)" }}>
                    Triaged at: {item.triagedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </p>
                )}
              </div>
            )}

            {item.adminNotes && (
              <p style={{ fontSize: "0.75rem", color: "rgba(201,162,39,0.6)", marginBottom: "0.8rem", padding: "0.5rem 0.7rem", background: "rgba(201,162,39,0.05)", borderRadius: "0.4rem", border: "1px solid rgba(201,162,39,0.15)" }}>
                Admin notes: {item.adminNotes}
              </p>
            )}

            {/* Status update form */}
            <form action={updateFeedbackStatus} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <input type="hidden" name="id" value={item.id} />
              <select
                name="status"
                defaultValue={item.status}
                style={{
                  padding:      "0.3rem 0.6rem",
                  borderRadius: "0.4rem",
                  border:       "1px solid rgba(255,255,255,0.1)",
                  background:   "rgba(255,255,255,0.04)",
                  color:        "var(--text-primary)",
                  fontSize:     "0.75rem",
                }}
              >
                {(["OPEN", "IN_REVIEW", "RESOLVED", "WONT_FIX"] as FeedbackStatus[]).map((s) => (
                  <option key={s} value={s} style={{ background: "#1a1610" }}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <input
                name="adminNotes"
                type="text"
                defaultValue={item.adminNotes ?? ""}
                placeholder="Admin notes (optional)"
                style={{
                  flex:         1,
                  minWidth:     140,
                  padding:      "0.3rem 0.6rem",
                  borderRadius: "0.4rem",
                  border:       "1px solid rgba(255,255,255,0.1)",
                  background:   "rgba(255,255,255,0.04)",
                  color:        "var(--text-primary)",
                  fontSize:     "0.75rem",
                }}
              />
              <button
                type="submit"
                style={{
                  padding:      "0.3rem 0.8rem",
                  borderRadius: "0.4rem",
                  border:       "1px solid rgba(201,162,39,0.3)",
                  background:   "rgba(201,162,39,0.08)",
                  color:        "var(--gold)",
                  fontSize:     "0.72rem",
                  cursor:       "pointer",
                }}
              >
                Update
              </button>
            </form>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", justifyContent: "center" }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/feedback?page=${p}${filterCat ? `&category=${filterCat}` : ""}${filterStat ? `&status=${filterStat}` : ""}`}
              style={{
                padding:        "0.35rem 0.75rem",
                borderRadius:   "0.4rem",
                fontSize:       "0.75rem",
                border:         `1px solid ${p === page ? "rgba(201,162,39,0.5)" : "rgba(255,255,255,0.1)"}`,
                background:     p === page ? "rgba(201,162,39,0.12)" : "transparent",
                color:          p === page ? "var(--gold)" : "rgba(237,232,220,0.5)",
                textDecoration: "none",
              }}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
