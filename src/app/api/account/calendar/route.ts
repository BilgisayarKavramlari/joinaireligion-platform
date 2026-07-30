import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { decryptPrivatePayload } from "@/lib/private-data";
import type { PersonalPlanPayload } from "@/lib/journey-planner";
import { dedupeUserLessonsByStep } from "@/lib/lessons/dedupe";

const MAX_RANGE_MS = 370 * 86_400_000;

function rangeFromRequest(request: NextRequest) {
  const now = new Date();
  const searchParams = new URL(request.url).searchParams;
  const from = new Date(searchParams.get("from") || now.getTime() - 90 * 86_400_000);
  const to = new Date(searchParams.get("to") || now.getTime() + 180 * 86_400_000);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new Error("VALIDATION_ERROR");
  }
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { from, to } = rangeFromRequest(request);

    const [plans, practiceLogs, lessons, practiceMessages] = await Promise.all([
      db.personalPlan.findMany({
        where: { userId: user.id, scheduledFor: { gte: from, lt: to } },
        orderBy: { scheduledFor: "asc" },
      }),
      db.userPracticeLog.findMany({
        where: { userId: user.id, completedAt: { gte: from, lt: to } },
        orderBy: { completedAt: "asc" },
        select: { id: true, completedAt: true, durationMins: true, practice: { select: { title: true, type: true } } },
      }),
      db.userLesson.findMany({
        where: {
          userId: user.id,
          OR: [
            { completedAt: { gte: from, lt: to } },
            { completedAt: null, startedAt: { gte: from, lt: to } },
            { completedAt: null, startedAt: null, createdAt: { gte: from, lt: to } },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, startedAt: true, completedAt: true, createdAt: true, lesson: { select: { title: true, stepNumber: true } } },
      }),
      db.practiceMessage.findMany({
        where: { userId: user.id, scheduledDate: { gte: from, lt: to }, generationStatus: { not: "FAILED" } },
        orderBy: { scheduledDate: "asc" },
        select: { id: true, scheduledDate: true, cadence: true, subject: true, responses: { select: { id: true }, take: 1 } },
      }),
    ]);

    const personalEvents = plans.map((plan) => {
      const payload = decryptPrivatePayload<PersonalPlanPayload>(plan.encryptedPayload);
      return {
        id: plan.id,
        source: "PERSONAL_PLAN",
        activityType: plan.activityType,
        status: plan.status,
        title: payload.title,
        details: payload.details,
        startsAt: plan.scheduledFor.toISOString(),
        durationMins: plan.durationMins,
        completedAt: plan.completedAt?.toISOString() || null,
        editable: true,
      };
    });

    return NextResponse.json(
      {
        from: from.toISOString(),
        to: to.toISOString(),
        events: [
          ...personalEvents,
          ...practiceLogs.map((log) => ({
            id: `practice-log:${log.id}`,
            source: "PRACTICE_LOG",
            activityType: "PRACTICE",
            status: "COMPLETED",
            title: log.practice.title,
            details: "",
            startsAt: log.completedAt.toISOString(),
            durationMins: log.durationMins,
            completedAt: log.completedAt.toISOString(),
            editable: false,
          })),
          ...dedupeUserLessonsByStep(lessons).map((lesson) => ({
            id: `lesson:${lesson.id}`,
            source: "LESSON",
            activityType: "LESSON",
            status: lesson.status === "COMPLETED" ? "COMPLETED" : "PLANNED",
            title: lesson.lesson.title,
            details: "",
            startsAt: (lesson.completedAt || lesson.startedAt || lesson.createdAt).toISOString(),
            durationMins: null,
            completedAt: lesson.completedAt?.toISOString() || null,
            editable: false,
          })),
          ...practiceMessages.map((message) => ({
            id: `practice-message:${message.id}`,
            source: "PRACTICE_MESSAGE",
            activityType: "REFLECTION",
            status: message.responses.length > 0 ? "COMPLETED" : "PLANNED",
            title: message.subject || (message.cadence === "DAILY" ? "Daily reflection" : "Weekly reflection"),
            details: "",
            startsAt: message.scheduledDate.toISOString(),
            durationMins: null,
            completedAt: null,
            editable: false,
          })),
        ].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "VALIDATION_ERROR") {
      return NextResponse.json({ error: "Invalid calendar range" }, { status: 400 });
    }
    console.error("account_calendar_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
  }
}
