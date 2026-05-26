import { NextResponse } from "next/server";

// Placeholder — session cookie auth gelince gerçek kullanıcıyı döndürecek.
// Şimdilik sadece 401 döndürüyor; header bunu null kullanıcı olarak yorumlar.
export async function GET() {
  return NextResponse.json({ user: null }, { status: 401 });
}
