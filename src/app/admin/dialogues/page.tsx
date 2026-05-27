export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin";

type DialogueRow = {
  conversationId:    string;
  promptCharCount:   number;
  checklistSnapshot: unknown;
  safetyFlags:       unknown;
  assistantResponse: string | null;
  createdAt:         Date;
  user:              { email: string };
};

export default async function Page() {
  await requireAdminSession();

  const rows = await db.aiDialogue.findMany({
    take: 150,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } },
  });

  const data = rows.map((r: DialogueRow) => ({
    conversationId:    r.conversationId,
    userEmail:         r.user.email,
    promptLength:      r.promptCharCount,
    checklistSnapshot: r.checklistSnapshot,
    safetyFlags:       r.safetyFlags,
    responseStatus:    r.assistantResponse ? "completed" : "pending",
    createdAt:         r.createdAt,
  }));

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-4 text-2xl font-semibold">Dialogues</h1>
      <pre className="overflow-auto rounded-lg bg-slate-900 p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
