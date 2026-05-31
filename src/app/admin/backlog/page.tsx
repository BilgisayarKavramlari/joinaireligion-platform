export const dynamic = "force-dynamic";

import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

type BacklogItemStatus =
  | "PROPOSED"
  | "READY_FOR_DECOMPOSITION"
  | "READY_FOR_IMPLEMENTATION"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "QA_REVIEW"
  | "READY_FOR_RELEASE"
  | "RELEASED"
  | "CANCELLED";
type BacklogPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const backlogDb = db as typeof db & {
  backlogItem: {
    findMany: (args: unknown) => Promise<Array<{
      id: string;
      title: string;
      summary: string | null;
      status: BacklogItemStatus;
      priority: BacklogPriority | null;
      userImpact: string | null;
      revenueImpact: string | null;
      riskLevel: string | null;
      ownerAgent: string | null;
      createdAt: Date;
      updatedAt: Date;
      idea: { id: string; title: string } | null;
      targetRelease: { id: string; version: string; title: string | null } | null;
      _count: { engineeringTasks: number };
    }>>;
    count: (args?: unknown) => Promise<number>;
    groupBy: (args: unknown) => Promise<Array<{ status: BacklogItemStatus; _count: { _all: number } }>>;
  };
};

const STATUS_COLORS: Record<BacklogItemStatus, string> = {
  PROPOSED: "#94a3b8",
  READY_FOR_DECOMPOSITION: "#c9a227",
  READY_FOR_IMPLEMENTATION: "#3b82f6",
  IN_PROGRESS: "#14b8a6",
  BLOCKED: "#ef4444",
  QA_REVIEW: "#8b5cf6",
  READY_FOR_RELEASE: "#22c55e",
  RELEASED: "#06b6d4",
  CANCELLED: "#6b7280",
};

const PRIORITY_COLORS: Record<BacklogPriority, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#c9a227",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}

type BacklogListItem = {
  id: string;
  title: string;
  summary: string | null;
  status: BacklogItemStatus;
  priority: BacklogPriority | null;
  userImpact: string | null;
  revenueImpact: string | null;
  riskLevel: string | null;
  ownerAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  idea: { id: string; title: string } | null;
  targetRelease: { id: string; version: string; title: string | null } | null;
  _count: { engineeringTasks: number };
};

async function loadBacklog(): Promise<{
  compatibilityMode: boolean;
  items: BacklogListItem[];
  total: number;
  countsByStatus: Partial<Record<BacklogItemStatus, number>>;
}> {
  try {
    const [items, total, grouped] = await Promise.all([
      backlogDb.backlogItem.findMany({
        take: 50,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          summary: true,
          status: true,
          priority: true,
          userImpact: true,
          revenueImpact: true,
          riskLevel: true,
          ownerAgent: true,
          createdAt: true,
          updatedAt: true,
          idea: { select: { id: true, title: true } },
          targetRelease: { select: { id: true, version: true, title: true } },
          _count: { select: { engineeringTasks: true } },
        },
      }),
      backlogDb.backlogItem.count(),
      backlogDb.backlogItem.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    return {
      compatibilityMode: false,
      items: items.map((item) => ({
        ...item,
        summary: item.summary ?? null,
        priority: item.priority ?? null,
        userImpact: item.userImpact ?? null,
        revenueImpact: item.revenueImpact ?? null,
        riskLevel: item.riskLevel ?? null,
        ownerAgent: item.ownerAgent ?? null,
        idea: item.idea ?? null,
        targetRelease: item.targetRelease
          ? { ...item.targetRelease, title: item.targetRelease.title ?? null }
          : null,
      })),
      total,
      countsByStatus: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
    };
  } catch (error) {
    console.warn("admin_backlog_compatibility_fallback", error);
    return {
      compatibilityMode: true,
      items: [],
      total: 0,
      countsByStatus: {},
    };
  }
}

export default async function AdminBacklogPage() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { compatibilityMode, items, total, countsByStatus } = await loadBacklog();

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            ✦ Admin
          </p>
          <h1 className="font-sacred" style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>
            Backlog Foundation
          </h1>
          <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.45)" }}>
            {compatibilityMode ? "Schema compatibility mode active." : `${total} backlog items`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link href="/admin/ideas" style={{ padding: "0.5rem 0.9rem", borderRadius: "0.55rem", border: "1px solid rgba(201,162,39,0.22)", color: "rgba(237,232,220,0.72)", textDecoration: "none", fontSize: "0.78rem" }}>
            View Ideas
          </Link>
          <Link href="/admin" style={{ padding: "0.5rem 0.9rem", borderRadius: "0.55rem", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(237,232,220,0.5)", textDecoration: "none", fontSize: "0.78rem" }}>
            Back to Admin
          </Link>
        </div>
      </div>

      {compatibilityMode && (
        <p style={{ marginBottom: "1rem", fontSize: "0.74rem", color: "#f0d47a" }}>
          Compatibility mode active: rendering a safe empty backlog until the unified foundation tables are available in production.
        </p>
      )}

      <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        {(Object.keys(STATUS_COLORS) as BacklogItemStatus[]).map((status) => (
          <span
            key={status}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "999px",
              fontSize: "0.68rem",
              color: STATUS_COLORS[status],
              border: `1px solid ${STATUS_COLORS[status]}40`,
              background: `${STATUS_COLORS[status]}15`,
            }}
          >
            {formatLabel(status)} {countsByStatus[status] ? `(${countsByStatus[status]})` : ""}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: "0.8rem" }}>
        {items.length === 0 && (
          <div style={{ padding: "2.4rem", textAlign: "center", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", color: "rgba(237,232,220,0.38)" }}>
            No backlog items yet.
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "1rem 1.15rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.55rem" }}>
              <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", color: STATUS_COLORS[item.status], background: `${STATUS_COLORS[item.status]}15`, border: `1px solid ${STATUS_COLORS[item.status]}40` }}>
                {formatLabel(item.status)}
              </span>
              {item.priority && (
                <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", color: PRIORITY_COLORS[item.priority], background: `${PRIORITY_COLORS[item.priority]}15`, border: `1px solid ${PRIORITY_COLORS[item.priority]}40` }}>
                  priority: {formatLabel(item.priority)}
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "rgba(237,232,220,0.35)" }}>
                Updated {item.updatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
              </span>
            </div>

            <h2 style={{ fontSize: "1rem", marginBottom: "0.35rem" }}>{item.title}</h2>
            {item.summary && (
              <p style={{ fontSize: "0.84rem", color: "rgba(237,232,220,0.78)", lineHeight: 1.55, marginBottom: "0.55rem" }}>
                {item.summary}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", fontSize: "0.7rem", color: "rgba(237,232,220,0.42)" }}>
              <span>Tasks: {item._count.engineeringTasks}</span>
              {item.idea && <span>Idea: {item.idea.title}</span>}
              {item.targetRelease && <span>Release: {item.targetRelease.version}</span>}
              {item.ownerAgent && <span>Owner agent: {item.ownerAgent}</span>}
              {item.userImpact && <span>User impact: {item.userImpact}</span>}
              {item.revenueImpact && <span>Revenue impact: {item.revenueImpact}</span>}
              {item.riskLevel && <span>Risk: {item.riskLevel}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
