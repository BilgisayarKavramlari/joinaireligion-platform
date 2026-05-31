export const dynamic = "force-dynamic";

import { AgentRunStatus, FeedbackStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

const AGENT_NAME = "support-triage";
const TASK_TYPE = "SUPPORT_TRIAGE_SKELETON";

export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (
    !env.CRON_SECRET ||
    !authHeader ||
    authHeader !== `Bearer ${env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const agentRun = await db.agentRun.create({
    data: {
      agentName: AGENT_NAME,
      taskType: TASK_TYPE,
      status: AgentRunStatus.RUNNING,
      startedAt,
      input: {
        triggerDate: startedAt.toISOString(),
        implementation: "skeleton",
      },
    },
  });

  try {
    const openFeedbackCount = await db.feedbackItem.count({
      where: { status: FeedbackStatus.OPEN },
    });

    const completedAt = new Date();
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.SUCCESS,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        output: {
          openFeedbackCount,
          classified: 0,
          repliesDrafted: 0,
          repliesSent: 0,
          codingTasksCreated: 0,
        },
      },
    });

    return Response.json({
      ok: true,
      agentName: AGENT_NAME,
      openFeedbackCount,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      status: AgentRunStatus.SUCCESS,
    });
  } catch (error) {
    const completedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);

    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.FAILED,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        errorMessage: message,
      },
    });

    return Response.json(
      {
        ok: false,
        agentName: AGENT_NAME,
        openFeedbackCount: 0,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        status: AgentRunStatus.FAILED,
      },
      { status: 500 }
    );
  }
}
