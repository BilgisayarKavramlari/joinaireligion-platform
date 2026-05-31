export const dynamic = "force-dynamic";

import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

type IdeaSourceType = "ADMIN_IDEA" | "SUPPORT" | "QA" | "GROWTH" | "SOCIAL" | "PRODUCT_NOTE";
type IdeaRecordStatus = "NEW" | "TRIAGED" | "PM_REVIEWED" | "CTO_REVIEWED" | "ACCEPTED" | "REJECTED" | "ESCALATED" | "BACKLOGGED" | "DONE";

const ideasDb = db as typeof db & {
  ideaRecord: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<Array<{
      id: string;
      sourceType: IdeaSourceType;
      title: string;
      summary: string | null;
      reporterType: string | null;
      status: IdeaRecordStatus;
      createdAt: Date;
      updatedAt: Date;
      _count: {
        assessments: number;
        backlogItems: number;
        adminQuestions: number;
      };
    }>>;
    count: (args?: unknown) => Promise<number>;
    groupBy: (args: unknown) => Promise<Array<{ status: IdeaRecordStatus; _count: { _all: number } }>>;
  };
};

async function createAdminIdea(formData: FormData) {
  "use server";

  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (!title) return;

  await ideasDb.ideaRecord.create({
    data: {
      sourceType: "ADMIN_IDEA",
      title,
      summary: summary || null,
      reporterType: "ADMIN",
      status: "NEW",
    },
  });
}

const STATUS_COLORS: Record<IdeaRecordStatus, string> = {
  NEW: "#f97316",
  TRIAGED: "#c9a227",
  PM_REVIEWED: "#8b5cf6",
  CTO_REVIEWED: "#3b82f6",
  ACCEPTED: "#14b8a6",
  REJECTED: "#ef4444",
  ESCALATED: "#f59e0b",
  BACKLOGGED: "#22c55e",
  DONE: "#94a3b8",
};

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}

type IdeaListItem = {
  id: string;
  sourceType: IdeaSourceType;
  title: string;
  summary: string | null;
  reporterType: string | null;
  status: IdeaRecordStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    assessments: number;
    backlogItems: number;
    adminQuestions: number;
  };
};

async function loadIdeas(): Promise<{
  compatibilityMode: boolean;
  ideas: IdeaListItem[];
  total: number;
  countsByStatus: Partial<Record<IdeaRecordStatus, number>>;
}> {
  try {
    const [ideas, total, grouped] = await Promise.all([
      ideasDb.ideaRecord.findMany({
        take: 50,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          sourceType: true,
          title: true,
          summary: true,
          reporterType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assessments: true,
              backlogItems: true,
              adminQuestions: true,
            },
          },
        },
      }),
      ideasDb.ideaRecord.count(),
      ideasDb.ideaRecord.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    return {
      compatibilityMode: false,
      ideas: ideas.map((idea) => ({
        ...idea,
        summary: idea.summary ?? null,
        reporterType: idea.reporterType ?? null,
      })),
      total,
      countsByStatus: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
    };
  } catch (error) {
    console.warn("admin_ideas_compatibility_fallback", error);
    return {
      compatibilityMode: true,
      ideas: [],
      total: 0,
      countsByStatus: {},
    };
  }
}

export default async function AdminIdeasPage() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { compatibilityMode, ideas, total, countsByStatus } = await loadIdeas();

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            ✦ Admin
          </p>
          <h1 className="font-sacred" style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>
            Unified Ideas
          </h1>
          <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.45)" }}>
            {compatibilityMode ? "Schema compatibility mode active." : `${total} recorded ideas`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link href="/admin/backlog" style={{ padding: "0.5rem 0.9rem", borderRadius: "0.55rem", border: "1px solid rgba(201,162,39,0.22)", color: "rgba(237,232,220,0.72)", textDecoration: "none", fontSize: "0.78rem" }}>
            View Backlog
          </Link>
          <Link href="/admin" style={{ padding: "0.5rem 0.9rem", borderRadius: "0.55rem", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(237,232,220,0.5)", textDecoration: "none", fontSize: "0.78rem" }}>
            Back to Admin
          </Link>
        </div>
      </div>

      {compatibilityMode && (
        <p style={{ marginBottom: "1rem", fontSize: "0.74rem", color: "#f0d47a" }}>
          Compatibility mode active: rendering a safe empty state until the unified idea/backlog tables exist in production.
        </p>
      )}

      {!compatibilityMode && (
        <form
          action={createAdminIdea}
          style={{
            marginBottom: "1.35rem",
            padding: "1rem",
            borderRadius: "0.8rem",
            border: "1px solid rgba(201,162,39,0.16)",
            background: "rgba(255,255,255,0.025)",
            display: "grid",
            gap: "0.7rem",
          }}
        >
          <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.7)" }}>Submit Admin Idea</p>
          <input
            name="title"
            type="text"
            placeholder="Idea title"
            required
            style={{ padding: "0.65rem 0.8rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
          />
          <textarea
            name="summary"
            placeholder="Short summary or context"
            rows={3}
            style={{ padding: "0.65rem 0.8rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", resize: "vertical" }}
          />
          <div>
            <button
              type="submit"
              style={{ padding: "0.55rem 0.95rem", borderRadius: "0.5rem", border: "1px solid rgba(201,162,39,0.3)", background: "rgba(201,162,39,0.08)", color: "var(--gold)", fontSize: "0.76rem", cursor: "pointer" }}
            >
              Create Idea
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        {(Object.keys(STATUS_COLORS) as IdeaRecordStatus[]).map((status) => (
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
        {ideas.length === 0 && (
          <div style={{ padding: "2.4rem", textAlign: "center", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", color: "rgba(237,232,220,0.38)" }}>
            No idea records yet.
          </div>
        )}

        {ideas.map((idea) => (
          <div
            key={idea.id}
            style={{
              padding: "1rem 1.15rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.55rem" }}>
              <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", color: "var(--gold)", background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.2)" }}>
                {formatLabel(idea.sourceType)}
              </span>
              <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", color: STATUS_COLORS[idea.status], background: `${STATUS_COLORS[idea.status]}15`, border: `1px solid ${STATUS_COLORS[idea.status]}40` }}>
                {formatLabel(idea.status)}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "rgba(237,232,220,0.35)" }}>
                Updated {idea.updatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
              </span>
            </div>

            <h2 style={{ fontSize: "1rem", marginBottom: "0.35rem" }}>{idea.title}</h2>
            {idea.summary && (
              <p style={{ fontSize: "0.84rem", color: "rgba(237,232,220,0.78)", lineHeight: 1.55, marginBottom: "0.55rem" }}>
                {idea.summary}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", fontSize: "0.7rem", color: "rgba(237,232,220,0.42)" }}>
              <span>Reporter: {idea.reporterType ?? "unknown"}</span>
              <span>Assessments: {idea._count.assessments}</span>
              <span>Backlog links: {idea._count.backlogItems}</span>
              <span>Admin questions: {idea._count.adminQuestions}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
