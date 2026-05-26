export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { assertInternalApiKey } from "@/lib/admin";

export async function GET(request: Request) {
  if (!assertInternalApiKey(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 7 * 86400000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const totalDialogues = await db.aiDialogue.count({ where: { createdAt: { gte: from, lte: to } } });
  const averages = await db.aiDialogue.aggregate({ where: { createdAt: { gte: from, lte: to } }, _avg: { promptCharCount: true, totalTokens: true, latencyMs: true } });
  return Response.json({ from, to, totalDialogues, averages: averages._avg });
}
