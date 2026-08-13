import { ActivityEventType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { isSameOriginReflectionRequest } from "@/lib/reflection-companion";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const [legacyQueries, metadataOnlyDialogues] = await Promise.all([
    db.aiQuery.count({ where: { userId: user.id } }),
    db.aiDialogue.count({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ legacyQueries, metadataOnlyDialogues, currentConversationTextStored: false }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginReflectionRequest(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const [queries, dialogues] = await db.$transaction([
    db.aiQuery.deleteMany({ where: { userId: user.id } }),
    db.aiDialogue.deleteMany({ where: { userId: user.id } }),
  ]);
  await db.userActivityLog.create({
    data: {
      userId: user.id,
      eventType: ActivityEventType.USER,
      eventName: "reflection_history_deleted",
      path: "/companion",
      method: "DELETE",
      metadata: { legacyQueriesDeleted: queries.count, metadataRowsDeleted: dialogues.count, containsConversationText: false },
    },
  });
  return NextResponse.json({ ok: true, deleted: queries.count + dialogues.count }, { headers: { "Cache-Control": "no-store" } });
}
