import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifyMetaSignedRequest } from "@/lib/meta-signed-request";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!env.THREADS_APP_SECRET) {
    return NextResponse.json({ error: "Threads callback is not configured." }, { status: 503 });
  }

  let signedRequest: FormDataEntryValue | null;
  try {
    signedRequest = (await request.formData()).get("signed_request");
  } catch {
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  }

  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "Missing signed request." }, { status: 400 });
  }

  const payload = verifyMetaSignedRequest(signedRequest, env.THREADS_APP_SECRET);
  if (!payload || typeof payload.user_id !== "string" || !payload.user_id) {
    return NextResponse.json({ error: "Invalid signed request." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
