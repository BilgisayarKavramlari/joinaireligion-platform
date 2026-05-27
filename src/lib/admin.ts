import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getSessionFromCookie } from "@/lib/auth";

export function getAdminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? "admin@example.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdminSession(): Promise<string> {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
  if (!session) throw new Error("UNAUTHORIZED");
  if (!getAdminEmails().includes(session.email.toLowerCase())) throw new Error("FORBIDDEN_ADMIN");
  return session.email;
}

export function assertInternalApiKey(request: Request): boolean {
  const key = request.headers.get("x-internal-agent-key");
  return Boolean(key && env.INTERNAL_AGENT_API_KEY && key === env.INTERNAL_AGENT_API_KEY);
}
