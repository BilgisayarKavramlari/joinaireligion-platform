export const dynamic = "force-dynamic";

import {
  AgentRunStatus,
  FeedbackStatus,
  SupportTriageStatus,
} from "@prisma/client";

import { classifySupportTicket, type SupportTicketCategory } from "@/lib/cron/support-ticket-classifier";
import {
  classifySupportTicketSeverity,
  type SupportTicketSeverity,
} from "@/lib/cron/support-ticket-severity";
import {
  classifySupportTicketRecommendedAction,
  type SupportTicketRecommendedAction,
} from "@/lib/cron/support-ticket-action";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const AGENT_NAME = "support-triage";
const TASK_TYPE = "SUPPORT_TRIAGE_ANALYSIS";
const SAMPLE_RESULT_LIMIT = 5;

type CategoryCounts = Record<SupportTicketCategory, number>;
type SeverityCounts = Record<SupportTicketSeverity, number>;
type ActionCounts = Record<SupportTicketRecommendedAction, number>;

type AnalysisResult = {
  id: string;
  category: SupportTicketCategory;
  severity: SupportTicketSeverity;
  recommendedAction: SupportTicketRecommendedAction;
};

function createCategoryCounts(): CategoryCounts {
  return {
    BUG: 0,
    ACCOUNT: 0,
    BILLING: 0,
    CONTENT: 0,
    I18N: 0,
    UX: 0,
    SPAM: 0,
    OTHER: 0,
  };
}

function createSeverityCounts(): SeverityCounts {
  return {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
}

function createActionCounts(): ActionCounts {
  return {
    AUTO_REPLY_DRAFT: 0,
    CREATE_CODING_TASK: 0,
    ESCALATE_TO_ADMIN: 0,
    MARK_SPAM: 0,
    MONITOR: 0,
  };
}

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
        implementation: "dry-run-analysis",
      },
    },
  });

  try {
    const openFeedbackItems = await db.feedbackItem.findMany({
      where: { status: FeedbackStatus.OPEN },
      select: {
        id: true,
        message: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const openFeedbackCount = openFeedbackItems.length;
    const categoryCounts = createCategoryCounts();
    const severityCounts = createSeverityCounts();
    const actionCounts = createActionCounts();

    const analysisResults = openFeedbackItems.map((item): AnalysisResult => {
      const category = classifySupportTicket(item.message);
      const severity = classifySupportTicketSeverity(item.message, category);
      const recommendedAction = classifySupportTicketRecommendedAction(
        item.message,
        category,
        severity
      );

      categoryCounts[category]++;
      severityCounts[severity]++;
      actionCounts[recommendedAction]++;

      return {
        id: item.id,
        category,
        severity,
        recommendedAction,
      };
    });
    const analyzedCount = analysisResults.length;
    const sampleResults = analysisResults.slice(0, SAMPLE_RESULT_LIMIT);

    for (const result of analysisResults) {
      const decision = await db.supportTriageDecision.create({
        data: {
          feedbackItemId: result.id,
          agentRunId: agentRun.id,
          decisionSource: "DETERMINISTIC",
          category: result.category,
          severity: result.severity,
          recommendedAction: result.recommendedAction,
          reasonSummary: "Deterministic support-triage analysis.",
          reasonJson: {
            source: "deterministic",
            version: "phase-1-task-3a-1d",
            category: result.category,
            severity: result.severity,
            recommendedAction: result.recommendedAction,
          },
        },
        select: { id: true },
      });

      await db.feedbackItem.update({
        where: { id: result.id },
        data: {
          triageCategory: result.category,
          triageSeverity: result.severity,
          recommendedAction: result.recommendedAction,
          triageStatus: SupportTriageStatus.TRIAGED,
          triagedAt: startedAt,
          triageRunId: agentRun.id,
          latestTriageDecisionId: decision.id,
        },
      });
    }

    const completedAt = new Date();
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.SUCCESS,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        output: {
          openFeedbackCount,
          analyzedCount,
          categoryCounts,
          severityCounts,
          actionCounts,
          sampleResults,
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
      analyzedCount,
      categoryCounts,
      severityCounts,
      actionCounts,
      sampleResults,
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
