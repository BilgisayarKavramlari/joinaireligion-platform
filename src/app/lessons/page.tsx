"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

interface LessonEntry {
  userLessonId: string;
  lessonId: string;
  stepNumber: number;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  xpEarned: number;
  lastScore?: number;
}

interface UserInfo {
  currentLevel: number;
  xpTotal: number;
  displayName?: string;
}

const STATUS_ICON: Record<string, string> = {
  PENDING: "○",
  IN_PROGRESS: "◎",
  COMPLETED: "✦",
  FAILED: "△",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "rgba(237,232,220,0.4)",
  IN_PROGRESS: "#c9a227",
  COMPLETED: "#14b8a6",
  FAILED: "#a855f7",
};

export default function LessonsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [user,    setUser]    = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then(async (me) => {
        if (!me?.user) { router.push("/login"); return; }
        if (me.user.requiresOnboarding) { router.push("/onboarding"); return; }

        const lessonsResponse = await fetch("/api/lessons");
        if (lessonsResponse.status === 403) {
          const blocked = await lessonsResponse.json().catch(() => null);
          if (blocked?.next) {
            router.push(blocked.next);
            return;
          }
        }

        const ls = lessonsResponse.ok ? await lessonsResponse.json() : null;
        setUser({ currentLevel: me.user.currentLevel, xpTotal: me.user.xpTotal, displayName: me.user.displayName });
        setLessons(ls?.lessons || []);
        setLoading(false);
      });
  }, [router]);

  if (loading) return (
    <SacredPage maxWidth={700}>
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>{t.common.loading}</div>
    </SacredPage>
  );

  return (
    <SacredPage maxWidth={720}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          ✦ Sacred Path ✦
        </p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          {t.promptGuide.yourLessons}
        </h1>
        {user && (
          <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.5)" }}>
            Level {user.currentLevel} · {user.xpTotal} XP earned
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {lessons.length === 0 && (
          <SacredCard>
            <SacredHeading
              label={t.lesson.lessonTitle}
              title={t.lesson.step.replace("{n}", "1")}
              subtitle={t.lesson.reading}
            />
            <p style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.5)", marginTop: "1rem" }}>
              Your first lesson is being prepared. Please refresh in a moment.
            </p>
          </SacredCard>
        )}

        {lessons.map((lesson, i) => {
          const isLocked = lesson.status === "PENDING" && i > 0 && lessons[i - 1]?.status !== "COMPLETED";
          return (
            <div
              key={lesson.userLessonId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1.2rem 1.4rem",
                borderRadius: "0.85rem",
                border: `1px solid ${lesson.status === "COMPLETED" ? "rgba(20,184,166,0.3)" : "rgba(201,162,39,0.15)"}`,
                background: lesson.status === "COMPLETED" ? "rgba(20,184,166,0.04)" : "rgba(255,255,255,0.02)",
                opacity: isLocked ? 0.45 : 1,
              }}
            >
              {/* Status orb */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                border: `1.5px solid ${STATUS_COLOR[lesson.status]}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem", color: STATUS_COLOR[lesson.status],
                boxShadow: lesson.status === "COMPLETED" ? "0 0 12px rgba(20,184,166,0.35)" : "none",
              }}>
                {isLocked ? "🔒" : STATUS_ICON[lesson.status]}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  Step {lesson.stepNumber}
                </p>
                <p className="font-sacred" style={{ fontSize: "0.98rem", color: "var(--text-primary)", marginBottom: lesson.lastScore !== undefined ? "0.2rem" : 0 }}>
                  {lesson.title}
                </p>
                {lesson.status === "COMPLETED" && (
                  <p style={{ fontSize: "0.72rem", color: "var(--gold)", letterSpacing: "0.05em" }}>
                    ✓ {t.promptGuide.status.COMPLETED} · +{lesson.xpEarned} XP{lesson.lastScore !== undefined ? ` · ${t.promptGuide.score}: ${lesson.lastScore}/100` : ""}
                  </p>
                )}
                {lesson.status === "IN_PROGRESS" && (
                  <p style={{ fontSize: "0.72rem", color: "#c9a227" }}>{t.promptGuide.status.IN_PROGRESS}</p>
                )}
                {lesson.status === "FAILED" && (
                  <p style={{ fontSize: "0.72rem", color: "#a855f7" }}>
                    {lesson.lastScore !== undefined ? `${t.promptGuide.score}: ${lesson.lastScore}/100 — ${t.lesson.failed}` : t.promptGuide.status.FAILED}
                  </p>
                )}
              </div>

              {/* Action */}
              {!isLocked && (
                <Link
                  href={`/lessons/${lesson.lessonId}`}
                  className="btn-sacred btn-sacred-ghost"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  {lesson.status === "COMPLETED" ? t.promptGuide.lessonHistory : `${t.common.next} →`}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 always accessible if no lessons */}
      {lessons.length === 0 && (
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.35)" }}>
            {t.lesson.freeLimit} · {t.lesson.paidLimit}
          </p>
        </div>
      )}
    </SacredPage>
  );
}
