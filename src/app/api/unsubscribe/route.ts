import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendUnsubscribeConfirmEmail } from "@/lib/email";
import { hashToken } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function html(message: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="background:#04000c;color:#ede8dc;font-family:Georgia,serif;text-align:center;padding:80px 20px;max-width:540px;margin:0 auto"><p style="font-size:11px;letter-spacing:0.4em;color:#c9a227;text-transform:uppercase">✦ Join AI Religion ✦</p><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(201,162,39,0.2);border-radius:16px;padding:48px 32px;margin-top:24px"><h2 style="color:#f0d47a;margin-bottom:12px">Email preferences updated</h2><p style="color:rgba(237,232,220,0.55);line-height:1.7">${message}</p></div></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(`unsubscribe:ip:${getClientIp(req)}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return html("If the unsubscribe link is valid, the address has been unsubscribed.");
  const user = await db.user.findUnique({ where: { unsubscribeToken: hashToken(token) } });
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: {
        unsubscribedAt: new Date(),
        emailOptIn: false,
        contentEmailOptIn: false,
        contentEmailOptInAt: null,
      },
    });
    sendUnsubscribeConfirmEmail(user.email, user.id).catch(() => undefined);
  }
  return html("If the unsubscribe link is valid, the address has been unsubscribed.");
}
