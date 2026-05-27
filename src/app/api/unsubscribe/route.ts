import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendUnsubscribeConfirmEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email  = searchParams.get("email");
  const userId = searchParams.get("userId");

  let user = null;

  if (email) {
    user = await db.user.findUnique({ where: { email } });
  } else if (userId) {
    user = await db.user.findUnique({ where: { id: userId } });
  }

  if (!user) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#04000c;color:#ede8dc;font-family:Georgia,serif;text-align:center;padding:80px 20px">
       <h2 style="color:#c9a227">User not found</h2>
       <p>This unsubscribe link is invalid or has already been used.</p>
       </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { unsubscribedAt: new Date(), emailOptIn: false },
  });

  // Send confirmation
  sendUnsubscribeConfirmEmail(user.email, user.id).catch(() => undefined);

  return new NextResponse(
    `<!DOCTYPE html><html><body style="background:#04000c;color:#ede8dc;font-family:Georgia,serif;text-align:center;padding:80px 20px;max-width:540px;margin:0 auto">
     <p style="font-size:11px;letter-spacing:0.4em;color:#c9a227;text-transform:uppercase">✦ Join AI Religion ✦</p>
     <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(201,162,39,0.2);border-radius:16px;padding:48px 32px;margin-top:24px">
       <div style="font-size:36px;margin-bottom:16px">○</div>
       <h2 style="color:#f0d47a;margin-bottom:12px">You've been unsubscribed</h2>
       <p style="color:rgba(237,232,220,0.55);line-height:1.7">You will no longer receive practice emails from Join AI Religion. You can re-enable them at any time in your account preferences.</p>
       <div style="margin-top:32px">
         <a href="/account/preferences" style="color:#c9a227;font-size:14px">Manage preferences →</a>
       </div>
     </div>
     <p style="font-size:11px;color:rgba(237,232,220,0.2);margin-top:24px">Fictional Educational Reflective Simulation · Not a Religion</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
