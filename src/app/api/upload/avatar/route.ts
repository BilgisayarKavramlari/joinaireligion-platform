import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED  = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.userId;
    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG, and WebP are allowed." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large. Maximum 2MB." }, { status: 400 });

    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const filename = `avatar.${ext}`;
    const dir  = join(process.cwd(), "public", "uploads", "avatars", userId);
    const path = join(dir, filename);

    await mkdir(dir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(path, Buffer.from(bytes));

    const avatarPath = `/uploads/avatars/${userId}/${filename}`;

    await db.userProfile.upsert({
      where: { userId },
      create: { userId, avatarPath },
      update: { avatarPath },
    });

    return NextResponse.json({ ok: true, avatarPath });
  } catch (error) {
    console.error("avatar_upload_error", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
