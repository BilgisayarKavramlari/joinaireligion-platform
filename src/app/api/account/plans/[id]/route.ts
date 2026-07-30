import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { encryptPrivatePayload, PRIVATE_DATA_ENCRYPTION_VERSION } from "@/lib/private-data";
import { boundedText, isValidationError, parseActivityType, parseDate, parseDuration, parsePlanStatus } from "@/lib/journey-planner";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const existing = await db.personalPlan.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json();
    const status = parsePlanStatus(body.status);
    const scheduledFor = parseDate(body.scheduledFor);
    await db.personalPlan.update({
      where: { id },
      data: {
        activityType: parseActivityType(body.activityType),
        status,
        scheduledFor,
        durationMins: parseDuration(body.durationMins),
        completedAt: status === "COMPLETED" ? new Date() : null,
        encryptedPayload: encryptPrivatePayload({
          title: boundedText(body.title, 120, true),
          details: boundedText(body.details, 2_000),
        }),
        encryptionVersion: PRIVATE_DATA_ENCRYPTION_VERSION,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isValidationError(error)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    console.error("personal_plan_update_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const result = await db.personalPlan.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("personal_plan_delete_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
