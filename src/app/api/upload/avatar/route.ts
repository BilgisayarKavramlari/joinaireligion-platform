import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { extname, resolve, sep } from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUserFromCookies } from "@/lib/auth";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function hasValidMagicBytes(buf: Buffer, type: string) {
  if (type === "image/png") return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
  if (type === "image/webp") return buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function assertInside(base: string, target: string) {
  const normalizedBase = resolve(base) + sep;
  const normalizedTarget = resolve(target);
  if (!normalizedTarget.startsWith(normalizedBase)) throw new Error("UPLOAD_PATH_TRAVERSAL");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPG, PNG, and WebP are allowed." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large. Maximum 2MB." }, { status: 400 });
    if (extname(file.name).includes("..") || file.name.includes("/") || file.name.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasValidMagicBytes(bytes, file.type)) return NextResponse.json({ error: "Invalid image content." }, { status: 400 });

    const ext = ALLOWED.get(file.type)!;
    const filename = `${randomUUID()}.${ext}`;
    const uploadRoot = resolve(process.cwd(), "public", "uploads", "avatars");
    const userDir = resolve(uploadRoot, session.id);
    const targetPath = resolve(userDir, filename);
    assertInside(uploadRoot, userDir);
    assertInside(uploadRoot, targetPath);

    await mkdir(userDir, { recursive: true });
    await writeFile(targetPath, bytes, { flag: "wx" });

    const avatarPath = `/uploads/avatars/${encodeURIComponent(session.id)}/${filename}`;
    await db.userProfile.upsert({
      where: { userId: session.id },
      create: { userId: session.id, avatarPath },
      update: { avatarPath },
    });

    return NextResponse.json({ ok: true, avatarPath });
  } catch (error) {
    console.error("avatar_upload_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
