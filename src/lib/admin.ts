import { headers } from "next/headers";
import { env } from "@/lib/env";

export function getAdminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? "admin@example.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdminAccess() {
  const h = await headers();
  const email = h.get("x-admin-email")?.toLowerCase();
  if (!email || !getAdminEmails().includes(email)) throw new Error("FORBIDDEN_ADMIN");
  return email;
}

export function assertInternalApiKey(request: Request): boolean {
  const key = request.headers.get("x-internal-agent-key");
  return Boolean(key && env.INTERNAL_AGENT_API_KEY && key === env.INTERNAL_AGENT_API_KEY);
}
