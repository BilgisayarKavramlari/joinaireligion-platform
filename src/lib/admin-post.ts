import { requireAdminSession } from "@/lib/admin";

export type AdminPostAuthorization =
  | { ok: true }
  | { ok: false; error: "Unauthorized" | "Forbidden" | "Invalid origin"; status: 401 | 403 };

/**
 * Admin-only POST guard. Session auth and same-origin validation stay separate
 * from CRON_SECRET-authenticated machine routes.
 */
export async function authorizeAdminPost(request: Request): Promise<AdminPostAuthorization> {
  try {
    await requireAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    return message === "FORBIDDEN_ADMIN"
      ? { ok: false, error: "Forbidden", status: 403 }
      : { ok: false, error: "Unauthorized", status: 401 };
  }

  const origin = request.headers.get("origin");
  const requestHost = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host.toLowerCase() : "";
  } catch {
    return { ok: false, error: "Invalid origin", status: 403 };
  }

  if (origin && (!requestHost || originHost !== requestHost)) {
    return { ok: false, error: "Invalid origin", status: 403 };
  }

  return { ok: true };
}
