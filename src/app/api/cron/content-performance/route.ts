export const dynamic = "force-dynamic";

import { handleGrowthAgentRequest } from "@/lib/growth-agents/http";

export async function POST(request: Request): Promise<Response> {
  return handleGrowthAgentRequest(request, "content-performance");
}
