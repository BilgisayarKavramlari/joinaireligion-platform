import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.userId;
    const { displayName, tradition, bio, country, city, phone, secondaryEmail, socialMedia } = await req.json();

    // Update display name on User
    await db.user.update({
      where: { id: userId },
      data: { displayName: displayName ?? null },
    });

    // Upsert UserProfile
    await db.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        tradition: tradition ?? null,
        bio: bio ?? null,
        country: country ?? null,
        city: city ?? null,
        phone: phone ?? null,
        secondaryEmail: secondaryEmail ?? null,
        socialMedia: socialMedia ?? null,
      },
      update: {
        tradition: tradition ?? null,
        bio: bio ?? null,
        country: country ?? null,
        city: city ?? null,
        phone: phone ?? null,
        secondaryEmail: secondaryEmail ?? null,
        socialMedia: socialMedia ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("profile_save_error", error);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
