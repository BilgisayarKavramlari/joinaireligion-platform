import { getCurrentUserFromCookies } from "@/lib/auth";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "admin@example.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdminSession() {
  const user = await getCurrentUserFromCookies();
  if (!user) throw new Error("UNAUTHORIZED");
  const isDbAdmin = user.role === "ADMIN";
  const isAllowlisted = getAdminEmails().includes(user.email.toLowerCase());
  if (!isDbAdmin && !isAllowlisted) throw new Error("FORBIDDEN_ADMIN");
  return user.email;
}


export function assertInternalApiKey(request: Request) {
  const configured = process.env.INTERNAL_AGENT_API_KEY;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-internal-api-key");
  return Boolean(configured && provided === configured);
}
