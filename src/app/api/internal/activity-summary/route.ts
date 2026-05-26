import { db } from "@/lib/db";
import { assertInternalApiKey } from "@/lib/admin";

export async function GET(request: Request) {
  if (!assertInternalApiKey(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 7 * 86400000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const grouped = await db.userActivityLog.groupBy({ by: ["eventName"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } });
  return Response.json({ from, to, grouped });
}
