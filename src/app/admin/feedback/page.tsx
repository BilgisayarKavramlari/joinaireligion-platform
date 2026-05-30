/**
 * /admin/feedback
 *
 * Admin review surface for FeedbackItem records.
 * Server component — fetches items on render, supports status update via POST.
 * Pagination: 50 items per page, newest first.
 * Filter: category, status.
 */

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { FeedbackCategory, FeedbackStatus } from "@prisma/client";

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

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; status?: string }>;
}

export default async function AdminFeedbackPage({ searchParams }: PageProps) {
  await requireAdminSession();

  const sp         = await searchParams;
  const page       = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize   = 50;
  const filterCat  = sp.category as FeedbackCategory | undefined;
  const filterStat = sp.status   as FeedbackStatus   | undefined;

  const where = {
    ...(filterCat  ? { category: filterCat  } : {}),
    ...(filterStat ? { status:   filterStat  } : {}),
  };

  const [items, total] = await Promise.all([
    db.feedbackItem.findMany({
      where,
      include: { user: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
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
                {item.user?.email ? ` · ${item.user.displayName ?? item.user.email}` : " · anonymous"}
              </span>
            </div>

            {/* Message */}
            <p style={{ fontSize: "0.84rem", color: "rgba(237,232,220,0.8)", lineHeight: 1.6, marginBottom: item.pageContext ? "0.4rem" : "0.8rem" }}>
              {item.message}
            </p>

            {item.pageContext && (
              <p style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.3)", marginBottom: "0.8rem" }}>
                Page: {item.pageContext}
              </p>
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
