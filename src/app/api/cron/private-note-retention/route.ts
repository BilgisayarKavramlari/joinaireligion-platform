import { NextRequest, NextResponse } from "next/server";
import { AgentRunStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  return Boolean(env.CRON_SECRET && request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const startedAt = new Date();
  const run = await db.agentRun.create({
    data: {
      agentName: "private-note-retention",
      taskType: "DELETE_EXPIRED_PRIVATE_NOTES",
      status: AgentRunStatus.RUNNING,
      input: { cutoff: startedAt.toISOString(), contentAccessed: false },
    },
    select: { id: true },
  });
  try {
    const result = await db.privateNote.deleteMany({ where: { expiresAt: { not: null, lte: startedAt } } });
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.SUCCESS,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        output: { deletedExpiredNotes: result.count, contentAccessed: false },
      },
    });
    return NextResponse.json({ ok: true, deletedExpiredNotes: result.count, agentRunId: run.id });
  } catch (error) {
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.FAILED,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown retention error",
      },
    });
    return NextResponse.json({ error: "Retention job failed", agentRunId: run.id }, { status: 500 });
  }
}
