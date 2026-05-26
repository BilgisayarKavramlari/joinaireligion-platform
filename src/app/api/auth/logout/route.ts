import { NextResponse } from "next/server";

export async function POST() {
  // Session cookie temizleme — auth sistemi tamamlanınca buraya gelecek.
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("session");
  return response;
}
