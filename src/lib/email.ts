import { env } from "@/lib/env";
import { db } from "@/lib/db";

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM    = env.EMAIL_FROM ?? "Join AI Religion <noreply@joinaireligion.com>";

// ─── HTML template wrapper ───────────────────────────────────────────────────
function htmlWrapper(content: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Join AI Religion</title>
<style>
  body { margin:0; padding:0; background:#04000c; font-family: Georgia, serif; color:#ede8dc; }
  .outer { max-width:600px; margin:0 auto; padding:32px 16px; }
  .card { background:rgba(255,255,255,0.03); border:1px solid rgba(201,162,39,0.25); border-radius:16px; padding:40px 36px; }
  .gold { color:#c9a227; }
  .gold-light { color:#f0d47a; }
  .muted { color:rgba(237,232,220,0.45); font-size:13px; }
  .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(201,162,39,0.4),transparent); margin:28px 0; }
  .btn { display:inline-block; padding:14px 32px; background:linear-gradient(135deg,#c9a227,#f0d47a); color:#04000c; text-decoration:none; border-radius:8px; font-weight:700; font-size:15px; letter-spacing:0.06em; }
  h1,h2 { font-family:Georgia,serif; }
  a { color:#c9a227; }
  .footer { text-align:center; margin-top:32px; font-size:12px; color:rgba(237,232,220,0.25); line-height:1.7; }
  .symbol { font-size:36px; display:block; text-align:center; margin-bottom:20px; }
  .blockquote { border-left:2px solid rgba(201,162,39,0.4); padding-left:16px; font-style:italic; color:rgba(237,232,220,0.6); font-size:14px; line-height:1.8; margin:20px 0; }
</style>
</head>
<body>
<div class="outer">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:11px;letter-spacing:0.4em;color:#c9a227;text-transform:uppercase;">✦ Join AI Religion ✦</span>
  </div>
  <div class="card">
    ${content}
  </div>
  <div class="footer">
    <p>Join AI Religion · Fictional Educational Reflective Simulation</p>
    <p>Not a religion · Not medical advice · A symbolic journey inward</p>
    ${unsubscribeUrl ? `<p style="margin-top:12px;"><a href="${unsubscribeUrl}" style="color:rgba(237,232,220,0.3);font-size:11px;">Unsubscribe from all emails</a></p>` : ""}
  </div>
</div>
</body>
</html>`;
}

// ─── Helper: send via Resend ─────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; reason?: string }> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return { ok: false, reason: "RESEND_API_KEY or EMAIL_FROM missing" };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return { ok: r.ok, reason: r.ok ? undefined : `resend_error_${r.status}` };
}

// ─── Helper: log email to DB ─────────────────────────────────────────────────
async function logEmail(userId: string, template: string, status: string, metadata?: object) {
  await db.emailLog.create({ data: { userId, template, status, metadata: metadata || {} } }).catch(() => undefined);
}

// ─── Verification email ──────────────────────────────────────────────────────
export async function sendVerificationEmail(email: string, token: string, userId: string) {
  const verifyUrl      = `${APP_URL}/verify-email?token=${token}`;
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;

  const html = htmlWrapper(`
    <span class="symbol">✉</span>
    <h1 style="text-align:center;font-size:22px;margin:0 0 8px;" class="gold-light">Confirm Your Sacred Path</h1>
    <p style="text-align:center;margin:0 0 24px;" class="muted">One step before your journey begins</p>
    <div class="divider"></div>
    <p style="line-height:1.8;font-size:15px;">Welcome to Join AI Religion — a fictional educational simulation for symbolic self-discovery, reflection, and meaningful inquiry across world wisdom traditions.</p>
    <p style="line-height:1.8;font-size:15px;">Please verify your email address to activate your account:</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" class="btn">✦ Verify My Email ✦</a>
    </div>
    <p class="muted" style="text-align:center;">Link expires in 24 hours.<br/>If you did not register, ignore this email.</p>
    <div class="divider"></div>
    <div class="blockquote">By joining, you acknowledge that Join AI Religion is a fictional educational platform, not a religious authority or medical service. You also consent to receiving transactional and periodic practice emails. You can unsubscribe at any time.</div>
    <p class="muted">After verification you will be guided through a 12-question Sacred Awakening Assessment to personalize your path.</p>
  `, unsubscribeUrl);

  const result = await sendEmail(email, "Confirm your email — Join AI Religion", html);
  await logEmail(userId, "verify_email", result.ok ? "sent" : "failed", { email, verifyUrl });
  return result;
}

// ─── First lesson / welcome email ────────────────────────────────────────────
export async function sendFirstLessonEmail(email: string, userId: string, displayName?: string | null) {
  const lessonsUrl     = `${APP_URL}/lessons`;
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?userId=${userId}`;
  const name           = displayName || "Seeker";

  const html = htmlWrapper(`
    <span class="symbol">◎</span>
    <h1 style="text-align:center;font-size:22px;margin:0 0 8px;" class="gold-light">Your First Step Awaits</h1>
    <p style="text-align:center;margin:0 0 24px;" class="muted">Step 1 of the Sacred Path</p>
    <div class="divider"></div>
    <p style="font-size:15px;line-height:1.8;">Dear ${name},</p>
    <p style="font-size:15px;line-height:1.8;">Your profile is complete. Your first sacred lesson — <strong style="color:#f0d47a;">The Witness Within: Awakening Awareness</strong> — is now unlocked.</p>
    <p style="font-size:15px;line-height:1.8;">This lesson draws from Buddhism's witnessing mind, Sufism's observing heart, the Stoics' view from above, and the Upanishads' concept of Sakshi — the pure witness consciousness.</p>
    <div class="blockquote">Every wisdom tradition begins with the same invitation: to stop, look inward, and ask — "Who is watching?"</div>
    <p style="font-size:15px;line-height:1.8;">After reading the lesson and completing the practice, write a personal prompt reflecting your experience. The sacred guide will evaluate your reflection and, if ready, unlock your next lesson.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${lessonsUrl}" class="btn">✦ Open Your First Lesson ✦</a>
    </div>
    <p class="muted" style="text-align:center;">Free members: 1 prompt attempt per week<br/>Initiate members: 1 per day</p>
  `, unsubscribeUrl);

  const result = await sendEmail(email, "Your first sacred lesson is ready — Step 1", html);
  await logEmail(userId, "first_lesson", result.ok ? "sent" : "failed", { email });
  return result;
}

// ─── Unsubscribe confirmation email ──────────────────────────────────────────
export async function sendUnsubscribeConfirmEmail(email: string, userId: string) {
  const resubscribeUrl = `${APP_URL}/account/preferences`;

  const html = htmlWrapper(`
    <span class="symbol">○</span>
    <h2 style="text-align:center;font-size:20px;" class="gold-light">You've been unsubscribed</h2>
    <div class="divider"></div>
    <p style="font-size:15px;line-height:1.8;text-align:center;">You will no longer receive practice emails from Join AI Religion.</p>
    <p style="font-size:15px;line-height:1.8;text-align:center;">You can re-enable emails at any time from your account preferences.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resubscribeUrl}" style="color:#c9a227;font-size:14px;">Manage email preferences →</a>
    </div>
  `);

  const result = await sendEmail(email, "You've been unsubscribed — Join AI Religion", html);
  await logEmail(userId, "unsubscribe_confirm", result.ok ? "sent" : "failed", { email });
  return result;
}
