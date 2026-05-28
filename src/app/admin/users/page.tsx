export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin";
import type { Prisma } from "@prisma/client";

// ─── constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── types ────────────────────────────────────────────────────────────────────

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  emailVerifiedAt: true,
  currentLevel: true,
  xpTotal: true,
  onboardingDone: true,
  createdAt: true,
  subscription: { select: { status: true } },
  _count: { select: { onboarding: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

// ─── styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "#04000c",
    color: "#ede8dc",
    padding: "32px 40px",
    fontFamily: "system-ui, sans-serif",
  } satisfies React.CSSProperties,
  heading: {
    fontFamily: "Georgia, serif",
    fontSize: "1.6rem",
    color: "#f0d47a",
    marginBottom: "8px",
    fontWeight: 600,
  } satisfies React.CSSProperties,
  backLink: {
    color: "#c9a227",
    textDecoration: "none",
    fontSize: "0.85rem",
    display: "inline-block",
    marginBottom: "20px",
  } satisfies React.CSSProperties,
  countLine: {
    fontSize: "0.82rem",
    color: "rgba(237,232,220,0.55)",
    marginBottom: "16px",
  } satisfies React.CSSProperties,
  searchForm: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
  } satisfies React.CSSProperties,
  searchInput: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(201,162,39,0.25)",
    color: "#ede8dc",
    borderRadius: "4px",
    padding: "6px 10px",
    fontSize: "0.875rem",
    width: "280px",
    outline: "none",
  } satisfies React.CSSProperties,
  searchBtn: {
    background: "rgba(201,162,39,0.12)",
    border: "1px solid rgba(201,162,39,0.3)",
    color: "#c9a227",
    borderRadius: "4px",
    padding: "6px 14px",
    fontSize: "0.875rem",
    cursor: "pointer",
  } satisfies React.CSSProperties,
  clearLink: {
    color: "rgba(237,232,220,0.4)",
    textDecoration: "none",
    fontSize: "0.82rem",
    lineHeight: "2",
  } satisfies React.CSSProperties,
  tableWrap: {
    overflowX: "auto" as const,
    borderRadius: "6px",
    border: "1px solid rgba(201,162,39,0.15)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.82rem",
  },
  th: {
    padding: "10px 12px",
    textAlign: "left" as const,
    color: "rgba(237,232,220,0.5)",
    fontWeight: 500,
    borderBottom: "1px solid rgba(201,162,39,0.2)",
    whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "9px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    verticalAlign: "top" as const,
  } satisfies React.CSSProperties,
  emailLink: {
    color: "#c9a227",
    textDecoration: "none",
    fontWeight: 500,
  } satisfies React.CSSProperties,
  muted: {
    color: "rgba(237,232,220,0.35)",
  } satisfies React.CSSProperties,
  teal: {
    color: "#14b8a6",
    fontSize: "0.78rem",
    fontWeight: 500,
  } satisfies React.CSSProperties,
  badge: (active: boolean): React.CSSProperties => ({
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "0.72rem",
    fontWeight: 600,
    background: active ? "rgba(20,184,166,0.12)" : "rgba(255,255,255,0.05)",
    color: active ? "#14b8a6" : "rgba(237,232,220,0.35)",
    border: `1px solid ${active ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.1)"}`,
  }),
  roleBadge: (role: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "0.72rem",
    fontWeight: 600,
    background:
      role === "SUPER_ADMIN"
        ? "rgba(201,162,39,0.18)"
        : role === "ADMIN"
        ? "rgba(201,162,39,0.10)"
        : "rgba(255,255,255,0.04)",
    color:
      role === "SUPER_ADMIN" || role === "ADMIN"
        ? "#f0d47a"
        : "rgba(237,232,220,0.45)",
    border: `1px solid ${
      role === "SUPER_ADMIN" || role === "ADMIN"
        ? "rgba(201,162,39,0.3)"
        : "rgba(255,255,255,0.08)"
    }`,
  }),
  planBadge: (status: string | null): React.CSSProperties => {
    const s = status?.toLowerCase() ?? "none";
    const active = s === "active";
    const trial = s === "trial" || s === "trialing";

    return {
      display: "inline-block",
      padding: "2px 6px",
      borderRadius: "3px",
      fontSize: "0.72rem",
      fontWeight: 600,
      background: active
        ? "rgba(20,184,166,0.12)"
        : trial
        ? "rgba(201,162,39,0.10)"
        : "rgba(255,255,255,0.04)",
      color: active
        ? "#14b8a6"
        : trial
        ? "#f0d47a"
        : "rgba(237,232,220,0.35)",
      border: `1px solid ${
        active
          ? "rgba(20,184,166,0.3)"
          : trial
          ? "rgba(201,162,39,0.25)"
          : "rgba(255,255,255,0.08)"
      }`,
    };
  },
  pagination: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginTop: "20px",
    fontSize: "0.82rem",
  } satisfies React.CSSProperties,
  pageLink: {
    color: "#c9a227",
    textDecoration: "none",
    padding: "4px 10px",
    border: "1px solid rgba(201,162,39,0.3)",
    borderRadius: "4px",
  } satisfies React.CSSProperties,
  pageDisabled: {
    color: "rgba(237,232,220,0.2)",
    padding: "4px 10px",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "4px",
    cursor: "default",
  } satisfies React.CSSProperties,
  pageInfo: {
    color: "rgba(237,232,220,0.45)",
  } satisfies React.CSSProperties,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function buildWhere(q: string): Prisma.UserWhereInput | undefined {
  if (!q) return undefined;
  return {
    OR: [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ],
  };
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const where = buildWhere(q);

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      take: PAGE_SIZE,
      skip: (pageNum - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: userSelect,
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (pageNum - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageNum * PAGE_SIZE, total);

  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const prevHref = pageNum > 1 ? `?page=${pageNum - 1}${qParam}` : null;
  const nextHref = pageNum < totalPages ? `?page=${pageNum + 1}${qParam}` : null;

  return (
    <main style={S.page}>
      <a href="/admin" style={S.backLink}>← Admin dashboard</a>
      <h1 style={S.heading}>Users</h1>

      {/* Search form */}
      <form method="get" style={S.searchForm}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email or name…"
          style={S.searchInput}
          autoComplete="off"
        />
        {/* Reset page to 1 on new search */}
        <input type="hidden" name="page" value="1" />
        <button type="submit" style={S.searchBtn}>Search</button>
        {q && (
          <a href="/admin/users" style={S.clearLink}>Clear</a>
        )}
      </form>

      {/* Count line */}
      <p style={S.countLine}>
        {total === 0
          ? "No users found"
          : `Showing ${from}–${to} of ${total} user${total === 1 ? "" : "s"}`}
        {q && (
          <span style={{ marginLeft: "6px" }}>
            for <strong style={{ color: "#ede8dc" }}>&ldquo;{q}&rdquo;</strong>
          </span>
        )}
      </p>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Email", "Name", "Role", "Verified", "Plan", "Onboarded", "Level", "XP", "Joined"].map(
                (h) => (
                  <th key={h} style={S.th}>{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ ...S.td, textAlign: "center", padding: "32px", ...S.muted }}
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u: UserRow) => (
                <tr key={u.id}>
                  <td style={S.td}>
                    <a href={`/admin/users/${u.id}`} style={S.emailLink}>
                      {u.email}
                    </a>
                  </td>
                  <td style={{ ...S.td, ...(!u.displayName ? S.muted : {}) }}>
                    {u.displayName ?? "—"}
                  </td>
                  <td style={S.td}>
                    <span style={S.roleBadge(u.role)}>{u.role}</span>
                  </td>
                  <td style={S.td}>
                    {u.emailVerifiedAt ? (
                      <span style={S.teal}>✓</span>
                    ) : (
                      <span style={S.muted}>—</span>
                    )}
                  </td>
                  <td style={S.td}>
                    <span style={S.planBadge(u.subscription?.status ?? null)}>
                      {u.subscription?.status ?? "free"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <span style={S.badge(u.onboardingDone)}>
                      {u.onboardingDone ? "yes" : "no"}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: "#ede8dc" }}>{u.currentLevel}</td>
                  <td style={{ ...S.td, color: "#ede8dc" }}>{u.xpTotal}</td>
                  <td style={{ ...S.td, ...S.muted }}>{fmtDate(u.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={S.pagination}>
        {prevHref ? (
          <a href={prevHref} style={S.pageLink}>← Previous</a>
        ) : (
          <span style={S.pageDisabled}>← Previous</span>
        )}
        <span style={S.pageInfo}>
          Page {pageNum} of {totalPages}
        </span>
        {nextHref ? (
          <a href={nextHref} style={S.pageLink}>Next →</a>
        ) : (
          <span style={S.pageDisabled}>Next →</span>
        )}
      </div>
    </main>
  );
}
