export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ padding: "1.2rem 1.4rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,162,39,0.15)", borderRadius: "0.85rem" }}>
      <p style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: "rgba(237,232,220,0.4)", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</p>
      <p style={{ fontFamily: "Georgia,serif", fontSize: "2rem", fontWeight: 700, color: "#f0d47a", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "0.68rem", color: "rgba(237,232,220,0.35)", marginTop: "0.3rem" }}>{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  try { await requireAdminSession(); } catch { redirect("/admin/login"); }

  const now = new Date();
  const dayAgo  = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    totalUsers, verifiedUsers, onboardedUsers, paidUsers,
    totalLessons, completedLessons, totalAttempts, passedAttempts,
    dailyRegistrations, weeklyRegistrations,
    totalRevenueCents,
    recentUsers, recentAttempts, recentVisits,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerifiedAt: { not: null } } }),
    db.user.count({ where: { onboarding: { some: {} } } }),
    db.user.count({ where: { subscription: { status: "ACTIVE" } } }),
    db.userLesson.count(),
    db.userLesson.count({ where: { status: "COMPLETED" } }),
    db.lessonAttempt.count(),
    db.lessonAttempt.count({ where: { passed: true } }),
    db.user.count({ where: { createdAt: { gte: dayAgo } } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.invoiceRecord.aggregate({ _sum: { amountCents: true }, where: { status: "paid" } }),
    db.user.findMany({ take: 10, orderBy: { createdAt: "desc" }, select: { id: true, email: true, displayName: true, currentLevel: true, xpTotal: true, onboarding: { take: 1, select: { id: true } }, createdAt: true, subscription: { select: { status: true } } } }),
    db.lessonAttempt.findMany({ take: 10, orderBy: { createdAt: "desc" }, select: { id: true, userId: true, score: true, passed: true, createdAt: true, userLesson: { select: { lesson: { select: { stepNumber: true, title: true } } } }, user: { select: { email: true } } } }),
    Promise.resolve(0), // SiteVisit model not yet in schema
  ]);

  const totalRevenue = ((totalRevenueCents._sum.amountCents || 0) / 100).toFixed(2);

  return (
    <div style={{ minHeight: "100vh", background: "#04000c", color: "#ede8dc", padding: "2rem" }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "#c9a227", textTransform: "uppercase", marginBottom: "0.3rem" }}>✦ Admin Panel ✦</p>
            <h1 style={{ fontFamily: "Georgia,serif", fontSize: "1.8rem", fontWeight: 900, color: "#f0d47a", margin: 0 }}>Sacred Dashboard</h1>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {[["Users","/admin/users"],["Lessons","/admin/lessons"],["Payments","/admin/subscriptions"],["Activity","/admin/activity"],["Dialogues","/admin/dialogues"],["Feedback","/admin/feedback"],["Autonomy","/admin/autonomy"],["Agents","/admin/agents"]].map(([label,href]) => (
              <Link key={href as string} href={href as string} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid rgba(201,162,39,0.25)", color: "rgba(237,232,220,0.7)", textDecoration: "none", fontSize: "0.78rem", background: "rgba(255,255,255,0.02)" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard label="Total Users" value={totalUsers} sub={`+${dailyRegistrations} today`} />
          <StatCard label="Verified" value={verifiedUsers} sub={`${Math.round(verifiedUsers/Math.max(totalUsers,1)*100)}% of users`} />
          <StatCard label="Onboarded" value={onboardedUsers} />
          <StatCard label="Paid Members" value={paidUsers} sub="Active subscriptions" />
          <StatCard label="Total Revenue" value={`$${totalRevenue}`} sub="All time" />
          <StatCard label="New (7d)" value={weeklyRegistrations} />
          <StatCard label="Lessons Done" value={completedLessons} sub={`of ${totalLessons} total`} />
          <StatCard label="Pass Rate" value={`${Math.round(passedAttempts/Math.max(totalAttempts,1)*100)}%`} sub={`${passedAttempts}/${totalAttempts} attempts`} />
          <StatCard label="Daily Visits" value={recentVisits} sub="Last 24h" />
        </div>

        {/* Recent users */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
            <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "rgba(237,232,220,0.4)", textTransform: "uppercase" }}>Recent Users</p>
            <Link href="/admin/users" style={{ fontSize: "0.72rem", color: "#c9a227" }}>View all →</Link>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.12)", borderRadius: "0.85rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.1)" }}>
                  {["Email","Name","Level","XP","Plan","Onboarded","Joined"].map((h) => (
                    <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", color: "rgba(237,232,220,0.35)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < recentUsers.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <Link href={`/admin/users/${u.id}`} style={{ color: "#c9a227", textDecoration: "none" }}>{u.email}</Link>
                    </td>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(237,232,220,0.6)" }}>{u.displayName || "—"}</td>
                    <td style={{ padding: "0.7rem 1rem", color: "#f0d47a" }}>{u.currentLevel}</td>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(237,232,220,0.6)" }}>{u.xpTotal}</td>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span style={{ padding: "0.2rem 0.6rem", borderRadius: "0.3rem", fontSize: "0.68rem", background: u.subscription?.status === "ACTIVE" ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.05)", color: u.subscription?.status === "ACTIVE" ? "#14b8a6" : "rgba(237,232,220,0.4)" }}>
                        {u.subscription?.status || "Free"}
                      </span>
                    </td>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span style={{ color: u.onboarding.length > 0 ? "#14b8a6" : "rgba(237,232,220,0.3)" }}>{u.onboarding.length > 0 ? "✓" : "○"}</span>
                    </td>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(237,232,220,0.4)", fontSize: "0.72rem" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent lesson attempts */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
            <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "rgba(237,232,220,0.4)", textTransform: "uppercase" }}>Recent Prompt Submissions</p>
            <Link href="/admin/dialogues" style={{ fontSize: "0.72rem", color: "#c9a227" }}>View all →</Link>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,162,39,0.12)", borderRadius: "0.85rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.1)" }}>
                  {["User","Step","Score","Result","Date"].map((h) => (
                    <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", color: "rgba(237,232,220,0.35)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < recentAttempts.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(237,232,220,0.6)", fontSize: "0.78rem" }}>{a.user.email}</td>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(237,232,220,0.55)", fontSize: "0.78rem" }}>Step {a.userLesson.lesson.stepNumber}</td>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span style={{ color: a.score >= 70 ? "#14b8a6" : a.score >= 60 ? "#c9a227" : "#a855f7", fontWeight: 700 }}>{a.score}</span>
                      <span style={{ color: "rgba(237,232,220,0.3)", fontSize: "0.7rem" }}>/100</span>
                    </td>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span style={{ color: a.passed ? "#14b8a6" : "rgba(237,232,220,0.35)" }}>{a.passed ? "✦ Passed" : "✗ Failed"}</span>
                    </td>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(237,232,220,0.35)", fontSize: "0.72rem" }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
