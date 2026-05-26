import { env } from "@/lib/env";
import { db } from "@/lib/db";

export async function sendVerificationEmail(email: string, token: string, locale = "en") {
  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    await db.emailLog.create({ data: { userId: (await db.user.findUnique({ where: { email }, select: { id: true } }))?.id || "", template: "verify_email", status: "not_sent_missing_provider", metadata: { email, locale, verifyUrl } } }).catch(()=>{});
    return { ok: false, reason: "RESEND_API_KEY or EMAIL_FROM missing" };
  }
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM, to: email, subject: locale === "tr" ? "E-posta doğrulama" : "Verify your email", html: `<p>Verify: <a href='${verifyUrl}'>${verifyUrl}</a></p>` }) });
  await db.emailLog.create({ data: { userId: (await db.user.findUnique({ where: { email }, select: { id: true } }))?.id || "", template: "verify_email", status: r.ok ? "sent" : "failed", metadata: { email, locale, verifyUrl } } }).catch(()=>{});
  return { ok: r.ok, reason: r.ok ? undefined : "resend_failed" };
}
