export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin";
import type { Prisma } from "@prisma/client";

// ─── Prisma select ────────────────────────────────────────────────────────────

const userDetailSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  currentLevel: true,
  xpTotal: true,
  daysActive: true,
  lastActiveDate: true,
  onboardingDone: true,
  onboardingDoneAt: true,
  unsubscribedAt: true,
  createdAt: true,
  _count: {
    select: {
      dialogues: true,
      userLessons: true,
    },
  },
  // 4a — Profile
  profile: {
    select: {
      bio: true,
      intent: true,
      timezone: true,
      tradition: true,
      country: true,
      city: true,
      phone: true,
      secondaryEmail: true,
      socialMedia: true,
      avatarPath: true,
    },
  },
  // 4b — Onboarding answers
  onboarding: {
    select: { id: true, questionKey: true, answer: true, createdAt: true },
    orderBy: { createdAt: "asc" as const },
  },
  // 4c — Subscription & invoices
  subscription: {
    select: {
      providerCustomerId: true,
      providerPlanId: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      canceledAt: true,
    },
  },
  invoices: {
    select: {
      id: true,
      providerInvoiceId: true,
      status: true,
      amountCents: true,
      currency: true,
      invoicePdfUrl: true,
      hostedInvoiceUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  // 4d — Journey & progress
  journeyLevels: {
    select: { id: true, level: true, label: true, unlockedAt: true },
    orderBy: { level: "asc" as const },
  },
  practiceLogs: {
    take: 20,
    select: {
      id: true,
      practiceId: true,
      durationMins: true,
      completedAt: true,
      practice: { select: { title: true } },
    },
    orderBy: { completedAt: "desc" as const },
  },
  // 4e — Lessons & attempts
  userLessons: {
    select: {
      id: true,
      status: true,
      xpEarned: true,
      startedAt: true,
      completedAt: true,
      lesson: { select: { stepNumber: true, title: true } },
      attempts: {
        take: 3,
        select: {
          id: true,
          score: true,
          passed: true,
          feedback: true,
          tokensUsed: true,
          latencyMs: true,
          createdAt: true,
          // large text columns intentionally excluded (see task 001 acceptance criterion 6)
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  // 4f — AI dialogues (last 30)
  dialogues: {
    take: 30,
    select: {
      id: true,
      conversationId: true,
      userPrompt: true,
      tokensInput: true,
      tokensOutput: true,
      latencyMs: true,
      safetyFlags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  // 4g — Email logs
  emailLogs: {
    select: {
      id: true,
      template: true,
      status: true,
      providerMsgId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  // 4h — Activity logs (last 100, no PII columns)
  activityLogs: {
    take: 100,
    select: {
      id: true,
      eventType: true,
      eventName: true,
      path: true,
      method: true,
      createdAt: true,
      // metadata, ipHash, userAgent intentionally excluded from default select
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.UserSelect;

type UserDetail = Prisma.UserGetPayload<{ select: typeof userDetailSelect }>;

// ─── Style tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#04000c",
  text: "#ede8dc",
  gold: "#c9a227",
  goldLight: "#f0d47a",
  teal: "#14b8a6",
  muted: "rgba(237,232,220,0.38)",
  border: "rgba(201,162,39,0.18)",
  borderStrong: "rgba(201,162,39,0.28)",
  cardBg: "rgba(255,255,255,0.025)",
  cardBgAlt: "rgba(255,255,255,0.04)",
};

const pgStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  padding: "32px 40px 80px",
  fontFamily: "system-ui, sans-serif",
};

const sectionCard: React.CSSProperties = {
  background: C.cardBg,
  border: `1px solid ${C.border}`,
  borderRadius: "6px",
  padding: "24px",
  marginBottom: "24px",
};

const sectionHeading: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: "1.05rem",
  color: C.goldLight,
  fontWeight: 600,
  marginBottom: "16px",
  paddingBottom: "10px",
  borderBottom: `1px solid ${C.border}`,
};

const tbl: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.82rem",
};

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  color: C.muted,
  fontWeight: 500,
  borderBottom: `1px solid ${C.borderStrong}`,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.035)",
  verticalAlign: "top",
};

const mutedTd: React.CSSProperties = { ...tdStyle, color: C.muted };

const kvGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  gap: "6px 16px",
  fontSize: "0.85rem",
};

const kvKey: React.CSSProperties = { color: C.muted, fontWeight: 500 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function D(d: Date | null | undefined, withTime = false): string {
  if (!d) return "—";
  const iso = d instanceof Date ? d.toISOString() : new Date(d).toISOString();
  return withTime ? iso.slice(0, 16).replace("T", " ") : iso.slice(0, 10);
}

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function dollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function scoreColor(score: number): string {
  if (score >= 70) return C.teal;
  if (score >= 60) return C.gold;
  return C.muted;
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function Badge({ label, active, color }: { label: string; active: boolean; color?: "teal" | "gold" }) {
  const c = color === "gold" ? C.gold : color === "teal" ? C.teal : active ? C.teal : C.muted;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: "3px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: active ? `${c}18` : "rgba(255,255,255,0.04)",
        color: active ? c : C.muted,
        border: `1px solid ${active ? `${c}40` : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isSA = role === "SUPER_ADMIN";
  const isA = role === "ADMIN";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: "3px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: isSA ? "rgba(201,162,39,0.2)" : isA ? "rgba(201,162,39,0.1)" : "rgba(255,255,255,0.05)",
        color: isSA || isA ? C.goldLight : C.muted,
        border: `1px solid ${isSA || isA ? "rgba(201,162,39,0.35)" : "rgba(255,255,255,0.1)"}`,
      }}
    >
      {role}
    </span>
  );
}

function PlanBadge({ status }: { status: string | null }) {
  const s = status?.toLowerCase() ?? "none";
  const on = s === "active" || s === "trialing" || s === "trial";
  const c = s === "active" ? C.teal : on ? C.gold : C.muted;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: "3px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: on ? `${c}18` : "rgba(255,255,255,0.04)",
        color: on ? c : C.muted,
        border: `1px solid ${on ? `${c}40` : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {status ?? "free"}
    </span>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function Header({ u }: { u: UserDetail }) {
  const completedLessons = u.userLessons.filter((l) => l.status === "COMPLETED").length;
  return (
    <div
      style={{
        ...sectionCard,
        background: C.cardBgAlt,
        display: "flex",
        gap: "24px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(201,162,39,0.1)",
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.6rem",
          color: C.gold,
          flexShrink: 0,
        }}
      >
        {(u.displayName ?? u.email).slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "6px" }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "1.4rem",
              color: C.goldLight,
              margin: 0,
              fontWeight: 600,
            }}
          >
            {u.displayName ?? u.email}
          </h1>
          <RoleBadge role={u.role} />
          <Badge label={u.emailVerifiedAt ? "Verified" : "Unverified"} active={!!u.emailVerifiedAt} color="teal" />
          <PlanBadge status={u.subscription?.status ?? null} />
        </div>
        <div style={{ color: C.muted, fontSize: "0.85rem", marginBottom: "16px" }}>{u.email}</div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "0.82rem" }}>
          {(
            [
              ["Level", u.currentLevel],
              ["XP", u.xpTotal],
              ["Days active", u.daysActive],
              ["Last active", D(u.lastActiveDate)],
              ["Last login", D(u.lastLoginAt)],
              ["Onboarding", <Badge key="ob" label={u.onboardingDone ? "Done" : "Pending"} active={u.onboardingDone} />],
              ["Unsubscribed", u.unsubscribedAt ? D(u.unsubscribedAt) : <span key="us" style={{ color: C.teal }}>—</span>],
              ["Lessons done", completedLessons],
              ["AI dialogues", u._count.dialogues],
              ["Joined", D(u.createdAt)],
            ] as [string, React.ReactNode][]
          ).map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ color: C.muted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </span>
              <span style={{ color: C.text, fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionProfile({ p }: { p: UserDetail["profile"] }) {
  if (!p) {
    return (
      <div style={sectionCard}>
        <h2 style={sectionHeading}>Profile</h2>
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No profile record.</p>
      </div>
    );
  }
  const rows: [string, React.ReactNode][] = [
    ["Bio", trunc(p.bio, 400)],
    ["Intent", p.intent ?? "—"],
    ["Timezone", p.timezone ?? "—"],
    ["Tradition", p.tradition ?? "—"],
    ["Country", p.country ?? "—"],
    ["City", p.city ?? "—"],
    ["Phone", p.phone ?? "—"],
    ["Secondary email", p.secondaryEmail ?? "—"],
    ["Avatar path", p.avatarPath ?? "—"],
    [
      "Social media",
      p.socialMedia ? (
        <pre
          key="sm"
          style={{
            margin: 0,
            fontSize: "0.78rem",
            color: C.muted,
            background: "rgba(255,255,255,0.03)",
            padding: "6px 8px",
            borderRadius: "3px",
            overflowX: "auto",
            maxWidth: "480px",
          }}
        >
          {JSON.stringify(p.socialMedia, null, 2)}
        </pre>
      ) : (
        "—"
      ),
    ],
  ];
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>Profile</h2>
      <div style={kvGrid}>
        {rows.map(([k, v]) => [
          <span key={`k-${k}`} style={kvKey}>{k}</span>,
          <span key={`v-${k}`} style={{ color: C.text }}>{v}</span>,
        ])}
      </div>
    </div>
  );
}

function SectionOnboarding({ answers }: { answers: UserDetail["onboarding"] }) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>
        Onboarding ({answers.length} answer{answers.length !== 1 ? "s" : ""})
      </h2>
      {answers.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No answers recorded.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Question key", "Answer", "Submitted"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answers.map((a) => (
                <tr key={a.id}>
                  <td style={{ ...tdStyle, color: C.gold, fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {a.questionKey}
                  </td>
                  <td style={tdStyle}>{a.answer}</td>
                  <td style={mutedTd}>{D(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionSubscription({
  sub,
  invoices,
}: {
  sub: UserDetail["subscription"];
  invoices: UserDetail["invoices"];
}) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>Subscription &amp; Payments</h2>
      {!sub ? (
        <p style={{ color: C.muted, fontSize: "0.85rem", marginBottom: "20px" }}>No subscription record.</p>
      ) : (
        <div style={{ ...kvGrid, marginBottom: "24px" }}>
          {(
            [
              ["Provider customer ID", trunc(sub.providerCustomerId, 30)],
              ["Plan ID", sub.providerPlanId ?? "—"],
              ["Status", <PlanBadge key="s" status={sub.status} />],
              ["Trial ends", D(sub.trialEndsAt)],
              ["Period ends", D(sub.currentPeriodEnd)],
              ["Canceled at", D(sub.canceledAt)],
            ] as [string, React.ReactNode][]
          ).map(([k, v]) => [
            <span key={`k-${k}`} style={kvKey}>{k}</span>,
            <span key={`v-${k}`} style={{ color: C.text }}>{v}</span>,
          ])}
        </div>
      )}
      <h3 style={{ fontSize: "0.9rem", color: C.muted, fontWeight: 500, marginBottom: "12px" }}>
        Invoices ({invoices.length})
      </h3>
      {invoices.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No invoices.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Invoice ID", "Status", "Amount", "Currency", "Date", "Links"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.78rem", color: C.muted }}>
                    {trunc(inv.providerInvoiceId, 24)}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={inv.status} active={inv.status === "paid"} color="teal" />
                  </td>
                  <td style={{ ...tdStyle, color: C.text }}>{dollars(inv.amountCents)}</td>
                  <td style={mutedTd}>{inv.currency?.toUpperCase() ?? "—"}</td>
                  <td style={mutedTd}>{D(inv.createdAt)}</td>
                  <td style={tdStyle}>
                    {inv.invoicePdfUrl && (
                      <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer"
                        style={{ color: C.gold, fontSize: "0.78rem", marginRight: "8px" }}>
                        PDF
                      </a>
                    )}
                    {inv.hostedInvoiceUrl && (
                      <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer"
                        style={{ color: C.gold, fontSize: "0.78rem" }}>
                        View
                      </a>
                    )}
                    {!inv.invoicePdfUrl && !inv.hostedInvoiceUrl && (
                      <span style={{ color: C.muted }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionJourney({
  u,
}: {
  u: Pick<UserDetail, "currentLevel" | "xpTotal" | "daysActive" | "lastActiveDate" | "journeyLevels" | "practiceLogs">;
}) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>Journey &amp; Progress</h2>
      <div style={{ display: "flex", gap: "32px", marginBottom: "24px", flexWrap: "wrap" }}>
        {(
          [
            ["Current level", u.currentLevel],
            ["XP total", u.xpTotal],
            ["Days active", u.daysActive],
            ["Last active", D(u.lastActiveDate)],
          ] as [string, React.ReactNode][]
        ).map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ ...kvKey, fontSize: "0.75rem" }}>{label}</span>
            <span style={{ color: C.goldLight, fontWeight: 600, fontSize: "1rem" }}>{value}</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: "0.9rem", color: C.muted, fontWeight: 500, marginBottom: "10px" }}>
        Journey levels ({u.journeyLevels.length})
      </h3>
      {u.journeyLevels.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem", marginBottom: "20px" }}>No levels unlocked.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: "24px" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Level", "Label", "Unlocked"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {u.journeyLevels.map((jl) => (
                <tr key={jl.id}>
                  <td style={{ ...tdStyle, color: C.goldLight, fontWeight: 600 }}>{jl.level}</td>
                  <td style={tdStyle}>{jl.label}</td>
                  <td style={mutedTd}>{D(jl.unlockedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ fontSize: "0.9rem", color: C.muted, fontWeight: 500, marginBottom: "10px" }}>
        Practice logs (last {u.practiceLogs.length})
      </h3>
      {u.practiceLogs.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No practice logs.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Practice", "Duration (min)", "Completed"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {u.practiceLogs.map((pl) => (
                <tr key={pl.id}>
                  <td style={tdStyle}>{pl.practice.title}</td>
                  <td style={{ ...tdStyle, color: C.text }}>{pl.durationMins ?? "—"}</td>
                  <td style={mutedTd}>{D(pl.completedAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionLessons({ userLessons }: { userLessons: UserDetail["userLessons"] }) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>Lessons &amp; Attempts ({userLessons.length})</h2>
      {userLessons.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No lesson records.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {userLessons.map((ul) => (
            <div
              key={ul.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(201,162,39,0.1)",
                borderRadius: "4px",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span style={{ color: C.muted, fontSize: "0.78rem" }}>Step {ul.lesson.stepNumber}</span>
                <span style={{ color: C.text, fontWeight: 500, fontSize: "0.88rem" }}>{ul.lesson.title}</span>
                <Badge
                  label={ul.status}
                  active={ul.status === "COMPLETED"}
                  color={ul.status === "COMPLETED" ? "teal" : undefined}
                />
                {ul.xpEarned != null && (
                  <span style={{ color: C.gold, fontSize: "0.78rem", marginLeft: "auto" }}>
                    +{ul.xpEarned} XP
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "0.78rem", color: C.muted, marginBottom: ul.attempts.length > 0 ? "10px" : 0 }}>
                <span>Started: {D(ul.startedAt)}</span>
                <span>Completed: {D(ul.completedAt)}</span>
                <span>Attempts: {ul.attempts.length}</span>
              </div>
              {ul.attempts.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ ...tbl, fontSize: "0.78rem" }}>
                    <thead>
                      <tr>
                        {["Score", "Result", "Feedback", "Tokens", "Latency (ms)", "Date"].map((h) => (
                          <th key={h} style={{ ...thStyle, fontSize: "0.72rem" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ul.attempts.map((a) => (
                        <tr key={a.id}>
                          <td style={{ ...tdStyle, color: scoreColor(a.score), fontWeight: 600 }}>{a.score}</td>
                          <td style={tdStyle}>
                            <Badge label={a.passed ? "Pass" : "Fail"} active={a.passed} color={a.passed ? "teal" : undefined} />
                          </td>
                          <td style={{ ...tdStyle, color: C.muted, maxWidth: "240px" }}>{trunc(a.feedback, 120)}</td>
                          <td style={mutedTd}>{a.tokensUsed ?? "—"}</td>
                          <td style={mutedTd}>{a.latencyMs ?? "—"}</td>
                          <td style={mutedTd}>{D(a.createdAt, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionDialogues({ dialogues }: { dialogues: UserDetail["dialogues"] }) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>AI Dialogues (last {dialogues.length})</h2>
      {dialogues.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No AI dialogue records.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Conv. ID", "Prompt (80 chars)", "Tokens in", "Tokens out", "Latency (ms)", "Flags", "Date"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dialogues.map((d) => (
                <tr key={d.id}>
                  <td style={{ ...mutedTd, fontFamily: "monospace", fontSize: "0.72rem" }}>
                    {d.conversationId.slice(0, 8)}…
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "280px", color: C.muted, fontSize: "0.8rem" }}>
                    {trunc(d.userPrompt, 80)}
                  </td>
                  <td style={mutedTd}>{d.tokensInput ?? "—"}</td>
                  <td style={mutedTd}>{d.tokensOutput ?? "—"}</td>
                  <td style={mutedTd}>{d.latencyMs ?? "—"}</td>
                  <td style={tdStyle}>
                    <Badge
                      label={d.safetyFlags != null ? "Y" : "N"}
                      active={d.safetyFlags != null}
                    />
                  </td>
                  <td style={mutedTd}>{D(d.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionEmailLogs({ emailLogs }: { emailLogs: UserDetail["emailLogs"] }) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>Email Logs ({emailLogs.length})</h2>
      {emailLogs.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No email logs.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Template", "Status", "Provider message ID", "Sent"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emailLogs.map((el) => (
                <tr key={el.id}>
                  <td style={{ ...tdStyle, color: C.text }}>{el.template}</td>
                  <td style={tdStyle}>
                    <Badge
                      label={el.status}
                      active={el.status === "sent" || el.status === "delivered"}
                      color="teal"
                    />
                  </td>
                  <td style={{ ...mutedTd, fontFamily: "monospace", fontSize: "0.78rem" }}>
                    {el.providerMsgId ? trunc(el.providerMsgId, 32) : "—"}
                  </td>
                  <td style={mutedTd}>{D(el.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionActivityLogs({ activityLogs }: { activityLogs: UserDetail["activityLogs"] }) {
  return (
    <div style={sectionCard}>
      <h2 style={sectionHeading}>Activity Logs (last {activityLogs.length})</h2>
      <p style={{ color: C.muted, fontSize: "0.78rem", marginBottom: "12px" }}>
        IP hash, user agent, and metadata are excluded from this view (PII).
      </p>
      {activityLogs.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>No activity logs.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr>
                {["Event type", "Event name", "Path", "Method", "Date"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((al) => (
                <tr key={al.id}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: "rgba(201,162,39,0.08)",
                        color: C.gold,
                        border: "1px solid rgba(201,162,39,0.2)",
                        fontFamily: "monospace",
                      }}
                    >
                      {al.eventType}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: C.text, fontSize: "0.82rem" }}>{al.eventName}</td>
                  <td style={{ ...mutedTd, fontFamily: "monospace", fontSize: "0.78rem" }}>{al.path ?? "—"}</td>
                  <td style={{ ...mutedTd, fontFamily: "monospace", fontSize: "0.78rem" }}>{al.method ?? "—"}</td>
                  <td style={mutedTd}>{D(al.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Anchor nav ───────────────────────────────────────────────────────────────

const NAV_ANCHORS = [
  { href: "#profile", label: "Profile" },
  { href: "#onboarding", label: "Onboarding" },
  { href: "#subscription", label: "Subscription" },
  { href: "#journey", label: "Journey" },
  { href: "#lessons", label: "Lessons" },
  { href: "#dialogues", label: "Dialogues" },
  { href: "#email-logs", label: "Email logs" },
  { href: "#activity", label: "Activity" },
];

// ─── Page entry ───────────────────────────────────────────────────────────────

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: userDetailSelect,
  });

  if (!user) {
    notFound();
  }

  return (
    <main style={pgStyle}>
      {/* Top nav bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <a href="/admin/users" style={{ color: C.gold, textDecoration: "none", fontSize: "0.85rem" }}>
          ← All users
        </a>
        <span style={{ color: "rgba(237,232,220,0.2)" }}>|</span>
        {NAV_ANCHORS.map((n) => (
          <a key={n.href} href={n.href} style={{ color: C.muted, textDecoration: "none", fontSize: "0.78rem" }}>
            {n.label}
          </a>
        ))}
      </div>

      <Header u={user} />

      <div id="profile"><SectionProfile p={user.profile} /></div>
      <div id="onboarding"><SectionOnboarding answers={user.onboarding} /></div>
      <div id="subscription"><SectionSubscription sub={user.subscription} invoices={user.invoices} /></div>
      <div id="journey"><SectionJourney u={user} /></div>
      <div id="lessons"><SectionLessons userLessons={user.userLessons} /></div>
      <div id="dialogues"><SectionDialogues dialogues={user.dialogues} /></div>
      <div id="email-logs"><SectionEmailLogs emailLogs={user.emailLogs} /></div>
      <div id="activity"><SectionActivityLogs activityLogs={user.activityLogs} /></div>
    </main>
  );
}
