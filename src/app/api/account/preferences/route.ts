import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as auth from "@/lib/auth";

const SUPPORTED_UI_LOCALES = new Set(["en", "tr", "es", "de", "fr", "ar", "ru", "zh"]);
const SUPPORTED_EMAIL_LOCALES = new Set(["en", "tr", "es", "de", "fr", "ru", "zh"]);

async function currentSession() {
  return typeof auth.getCurrentUserFromCookies === "function"
    ? auth.getCurrentUserFromCookies()
    : Promise.resolve(auth.getSessionFromCookie?.("test")
      ? {
          id: auth.getSessionFromCookie("test")!.userId,
          email: auth.getSessionFromCookie("test")!.email,
          role: auth.getSessionFromCookie("test")!.role,
          displayName: null,
        }
      : null);
}

export async function GET() {
  try {
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const preferences = await db.user.findUnique({
      where: { id: session.id },
      select: {
        preferredLocale: true,
        preferredEmailLocale: true,
        emailOptIn: true,
        contentEmailOptIn: true,
      },
    });
    if (!preferences) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("preferences_read_error", error);
    return NextResponse.json({ error: "Failed to load preferences." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      preferredLocale?: unknown;
      preferredEmailLocale?: unknown;
      emailOptIn?: unknown;
      contentEmailOptIn?: unknown;
    };
    const preferredLocale = typeof body.preferredLocale === "string" && SUPPORTED_UI_LOCALES.has(body.preferredLocale)
      ? body.preferredLocale
      : undefined;
    const preferredEmailLocale = typeof body.preferredEmailLocale === "string" && SUPPORTED_EMAIL_LOCALES.has(body.preferredEmailLocale)
      ? body.preferredEmailLocale
      : undefined;
    const emailOptIn = typeof body.emailOptIn === "boolean" ? body.emailOptIn : undefined;
    const contentEmailOptIn = typeof body.contentEmailOptIn === "boolean" ? body.contentEmailOptIn : undefined;

    const existing = await db.user.findUnique({
      where: { id: session.id },
      select: { contentEmailOptIn: true, contentEmailOptInAt: true },
    });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const enablingAnyEmail = emailOptIn === true || contentEmailOptIn === true;

    await db.user.update({
      where: { id: session.id },
      data: {
        ...(preferredLocale ? { preferredLocale } : {}),
        ...(preferredEmailLocale ? { preferredEmailLocale } : {}),
        ...(emailOptIn !== undefined ? { emailOptIn } : {}),
        ...(contentEmailOptIn !== undefined
          ? {
              contentEmailOptIn,
              contentEmailOptInAt: contentEmailOptIn
                ? existing.contentEmailOptInAt ?? new Date()
                : null,
            }
          : {}),
        ...(enablingAnyEmail ? { unsubscribedAt: null } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("preferences_save_error", error);
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }
}
