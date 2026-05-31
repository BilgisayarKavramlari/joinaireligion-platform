export const dynamic = "force-dynamic";

import {
  AgentRunStatus,
  FeedbackStatus,
  SupportReplyAuthorType,
  SupportReplyStatus,
  SupportReplyVisibility,
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
const HIGH_RISK_REPLY_PATTERNS = [
  /\b(?:refund|chargeback|charged twice|billing|payment|invoice)\b/i,
  /\b(?:hack|hacked|breach|compromised|unauthorized access|security|privacy)\b/i,
  /\b(?:lawsuit|legal|policy|compliance|gdpr|delete my data|delete my account)\b/i,
  /\b(?:press|public review|reputation|scam|fraud)\b/i,
];

type CategoryCounts = Record<SupportTicketCategory, number>;
type SeverityCounts = Record<SupportTicketSeverity, number>;
type ActionCounts = Record<SupportTicketRecommendedAction, number>;

type AnalysisResult = {
  id: string;
  message: string;
  category: SupportTicketCategory;
  severity: SupportTicketSeverity;
  recommendedAction: SupportTicketRecommendedAction;
};

function shouldCreateSupportIdeaRecord(result: AnalysisResult): boolean {
  return result.recommendedAction === "CREATE_CODING_TASK";
}

function createSupportIdeaTitle(result: AnalysisResult): string {
  return `Support ticket: ${result.category.toLowerCase()} issue (${result.id})`;
}

function createSupportIdeaSummary(result: AnalysisResult): string {
  return `Created from support ticket ${result.id} after deterministic triage. Category: ${result.category}. Severity: ${result.severity}. Recommended action: ${result.recommendedAction}.`;
}

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

function isHighRiskForReplyDraft(
  message: string,
  category: SupportTicketCategory,
  severity: SupportTicketSeverity
): boolean {
  if (severity === "CRITICAL") return true;
  if (category === "BILLING" || category === "ACCOUNT" || category === "SPAM" || category === "OTHER") {
    return true;
  }
  return HIGH_RISK_REPLY_PATTERNS.some((pattern) => pattern.test(message));
}

function shouldCreateAdminOnlyDraft(result: AnalysisResult): boolean {
  if (result.recommendedAction !== "AUTO_REPLY_DRAFT") return false;
  if (isHighRiskForReplyDraft(result.message, result.category, result.severity)) return false;
  return true;
}

function createDeterministicReplyDraftBody(result: AnalysisResult): string {
  const topic =
    result.category === "I18N"
      ? "the translation issue"
      : result.category === "CONTENT"
      ? "the content issue"
      : result.category === "UX"
      ? "the navigation or experience issue"
      : result.category === "BUG"
      ? "the technical issue"
      : "your message";

  return `Thank you for reaching out. We have received ${topic} you reported, and our team is reviewing it carefully. We will share an update here once we have a confirmed next step.`;
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
    let repliesDrafted = 0;
    let ideasCreated = 0;

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
        message: item.message,
        category,
        severity,
        recommendedAction,
      };
    });
    const analyzedCount = analysisResults.length;
    const sampleResults = analysisResults
      .slice(0, SAMPLE_RESULT_LIMIT)
      .map(({ id, category, severity, recommendedAction }) => ({
        id,
        category,
        severity,
        recommendedAction,
      }));

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

      if (shouldCreateAdminOnlyDraft(result)) {
        const existingDraft = await db.supportReply.findFirst({
          where: {
            feedbackItemId: result.id,
            authorType: SupportReplyAuthorType.SUPPORT_AGENT,
            visibility: SupportReplyVisibility.ADMIN_ONLY,
            status: SupportReplyStatus.DRAFT,
          },
          select: { id: true },
        });

        if (!existingDraft) {
          await db.supportReply.create({
            data: {
              feedbackItemId: result.id,
              authorType: SupportReplyAuthorType.SUPPORT_AGENT,
              visibility: SupportReplyVisibility.ADMIN_ONLY,
              status: SupportReplyStatus.DRAFT,
              body: createDeterministicReplyDraftBody(result),
              rationaleSummary:
                "Deterministic low-risk support draft created for admin review before any user-visible response.",
              agentRunId: agentRun.id,
            },
          });
          repliesDrafted += 1;
        }
      }

      if (shouldCreateSupportIdeaRecord(result)) {
        const existingActiveIdea = await db.ideaRecord.findFirst({
          where: {
            sourceType: "SUPPORT",
            sourceRef: result.id,
            status: {
              notIn: ["REJECTED", "DONE"],
            },
          },
          select: { id: true },
        });

        if (!existingActiveIdea) {
          await db.ideaRecord.create({
            data: {
              sourceType: "SUPPORT",
              sourceRef: result.id,
              title: createSupportIdeaTitle(result),
              summary: createSupportIdeaSummary(result),
              reporterType: "SUPPORT_AGENT",
              status: "NEW",
            },
          });
          ideasCreated += 1;
        }
      }
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
          repliesDrafted,
          repliesSent: 0,
          ideasCreated,
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
