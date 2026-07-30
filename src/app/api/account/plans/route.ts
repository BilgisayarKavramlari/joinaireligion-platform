import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { encryptPrivatePayload, PRIVATE_DATA_ENCRYPTION_VERSION } from "@/lib/private-data";
import { boundedText, isValidationError, parseActivityType, parseDate, parseDuration, parsePlanStatus } from "@/lib/journey-planner";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const status = body.status === undefined ? "PLANNED" : parsePlanStatus(body.status);
    const scheduledFor = parseDate(body.scheduledFor);
    const plan = await db.personalPlan.create({
      data: {
        userId: user.id,
        activityType: parseActivityType(body.activityType),
        status,
        scheduledFor,
        durationMins: parseDuration(body.durationMins),
        completedAt: status === "COMPLETED" ? scheduledFor : null,
        encryptedPayload: encryptPrivatePayload({
          title: boundedText(body.title, 120, true),
          details: boundedText(body.details, 2_000),
        }),
        encryptionVersion: PRIVATE_DATA_ENCRYPTION_VERSION,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: plan.id }, { status: 201 });
  } catch (error) {
    if (isValidationError(error)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    console.error("personal_plan_create_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
