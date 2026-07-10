import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies, revokeCurrentSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await revokeCurrentSession(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
