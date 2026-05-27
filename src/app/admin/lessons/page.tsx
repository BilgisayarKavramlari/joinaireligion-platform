export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export default async function AdminLessonsPage() {
  try { await requireAdminSession(); } catch { redirect("/admin/login"); }

  const attempts = await db.lessonAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      user: { select: { email: true, displayName: true } },
      userLesson: { include: { lesson: { select: { stepNumber: true, title: true } } } },
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#04000c", color: "#ede8dc", padding: "2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <Link href="/admin" style={{ color: "rgba(237,232,220,0.4)", fontSize: "0.78rem", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "1.6rem", color: "#f0d47a", margin: 0 }}>Lesson Attempts</h1>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.12)", borderRadius: "0.85rem", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.1)" }}>
                {["User","Step / Title","Score","Passed","Tokens","Date","Detail"].map((h) => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", color: "rgba(237,232,220,0.35)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < attempts.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.78rem" }}>
                    <div style={{ color: "rgba(237,232,220,0.8)" }}>{a.user.email}</div>
                    {a.user.displayName && <div style={{ color: "rgba(237,232,220,0.35)", fontSize: "0.68rem" }}>{a.user.displayName}</div>}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <div style={{ color: "#c9a227", fontSize: "0.72rem" }}>Step {a.userLesson.lesson.stepNumber}</div>
                    <div style={{ color: "rgba(237,232,220,0.6)", fontSize: "0.78rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.userLesson.lesson.title}</div>
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <span style={{ fontWeight: 700, color: a.score >= 70 ? "#14b8a6" : a.score >= 60 ? "#c9a227" : "#a855f7" }}>{a.score}</span>
                    <span style={{ color: "rgba(237,232,220,0.3)", fontSize: "0.7rem" }}>/100</span>
                  </td>
                  <td style={{ padding: "0.8rem 1rem", color: a.passed ? "#14b8a6" : "rgba(237,232,220,0.35)" }}>{a.passed ? "✦" : "✗"}</td>
                  <td style={{ padding: "0.8rem 1rem", color: "rgba(237,232,220,0.4)", fontSize: "0.72rem" }}>{a.tokensUsed ?? "—"}</td>
                  <td style={{ padding: "0.8rem 1rem", color: "rgba(237,232,220,0.35)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{new Date(a.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <details>
                      <summary style={{ color: "#c9a227", cursor: "pointer", fontSize: "0.72rem" }}>View</summary>
                      <div style={{ marginTop: "0.5rem", maxWidth: 400 }}>
                        <div style={{ marginBottom: "0.5rem" }}>
                          <p style={{ fontSize: "0.65rem", color: "rgba(237,232,220,0.35)", textTransform: "uppercase", marginBottom: "0.2rem" }}>Prompt</p>
                          <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.55)", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>{a.promptText.slice(0, 400)}{a.promptText.length > 400 ? "…" : ""}</p>
                        </div>
                        {a.feedback && (
                          <div>
                            <p style={{ fontSize: "0.65rem", color: "rgba(237,232,220,0.35)", textTransform: "uppercase", marginBottom: "0.2rem" }}>AI Feedback</p>
                            <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.55)", lineHeight: 1.6, fontStyle: "italic" }}>{a.feedback}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
