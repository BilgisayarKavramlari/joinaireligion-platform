import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { encryptPrivatePayload, PRIVATE_DATA_ENCRYPTION_VERSION } from "@/lib/private-data";
import { boundedText, expiryFromRetentionDays, isValidationError, parseTags } from "@/lib/journey-planner";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const existing = await db.privateNote.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json();
    await db.privateNote.update({
      where: { id },
      data: {
        encryptedPayload: encryptPrivatePayload({
          title: boundedText(body.title, 160, true),
          body: boundedText(body.body, 20_000, true),
          tags: parseTags(body.tags),
        }),
        encryptionVersion: PRIVATE_DATA_ENCRYPTION_VERSION,
        aiAccessEnabled: body.aiAccessEnabled === true,
        expiresAt: expiryFromRetentionDays(body.retentionDays),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isValidationError(error)) return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    console.error("private_note_update_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to update private note" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const result = await db.privateNote.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("private_note_delete_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to delete private note" }, { status: 500 });
  }
}
