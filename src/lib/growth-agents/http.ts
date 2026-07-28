import { env } from "@/lib/env";
import { runGrowthAgentByName, type GrowthAgentName } from "@/lib/growth-agents/runners";

export async function handleGrowthAgentRequest(
  request: Request,
  agentName: GrowthAgentName
): Promise<Response> {
  const authorization = request.headers.get("authorization");
  if (!env.CRON_SECRET || authorization !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runGrowthAgentByName(agentName);
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json(
      { error: "Agent execution failed. Review the internal AgentRun log." },
      { status: 500 }
    );
  }
}
