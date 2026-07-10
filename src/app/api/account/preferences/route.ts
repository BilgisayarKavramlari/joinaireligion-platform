import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as auth from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await (typeof auth.getCurrentUserFromCookies === "function" ? auth.getCurrentUserFromCookies() : Promise.resolve(auth.getSessionFromCookie?.("test") ? { id: auth.getSessionFromCookie("test")!.userId, email: auth.getSessionFromCookie("test")!.email, role: auth.getSessionFromCookie("test")!.role, displayName: null } : null));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { preferredLocale, preferredEmailLocale } = await req.json();

    await db.user.update({
      where: { id: session.id },
      data: {
        ...(preferredLocale        ? { preferredLocale }        : {}),
        ...(preferredEmailLocale   ? { preferredEmailLocale }   : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("preferences_save_error", error);
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }
}
