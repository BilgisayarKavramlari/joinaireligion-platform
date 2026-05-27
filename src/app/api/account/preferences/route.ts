import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { preferredLocale, preferredEmailLocale } = await req.json();

    await db.user.update({
      where: { id: session.userId },
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
