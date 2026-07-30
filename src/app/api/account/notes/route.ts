import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { decryptPrivatePayload, encryptPrivatePayload, PRIVATE_DATA_ENCRYPTION_VERSION } from "@/lib/private-data";
import { boundedText, expiryFromRetentionDays, isValidationError, parseTags, type PrivateNotePayload } from "@/lib/journey-planner";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await db.privateNote.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
    const notes = await db.privateNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    const decrypted = notes.map((note) => ({
      id: note.id,
      ...decryptPrivatePayload<PrivateNotePayload>(note.encryptedPayload),
      aiAccessEnabled: note.aiAccessEnabled,
      expiresAt: note.expiresAt?.toISOString() || null,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));
    if (new URL(request.url).searchParams.get("export") === "1") {
      return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), notes: decrypted }, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="joinai-private-notes-${new Date().toISOString().slice(0, 10)}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ notes: decrypted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("private_notes_read_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to load private notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const note = await db.privateNote.create({
      data: {
        userId: user.id,
        encryptedPayload: encryptPrivatePayload({
          title: boundedText(body.title, 160, true),
          body: boundedText(body.body, 20_000, true),
          tags: parseTags(body.tags),
        }),
        encryptionVersion: PRIVATE_DATA_ENCRYPTION_VERSION,
        aiAccessEnabled: body.aiAccessEnabled === true,
        expiresAt: expiryFromRetentionDays(body.retentionDays),
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: note.id }, { status: 201 });
  } catch (error) {
    if (isValidationError(error)) return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    console.error("private_note_create_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to save private note" }, { status: 500 });
  }
}
