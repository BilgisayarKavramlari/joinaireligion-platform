import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "joinaireligion-platform",
    timestamp: new Date().toISOString(),
  });
}
