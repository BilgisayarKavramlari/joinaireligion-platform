import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { SupportReplyStatus, SupportReplyVisibility } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

function redirectToFeedback(request: Request, returnTo: string | null) {
  const destination = safeInternalPath(returnTo, "/admin/feedback");
  if (!destination.startsWith("/admin/feedback")) return NextResponse.redirect(new URL("/admin/feedback", request.url), 303);
  return NextResponse.redirect(new URL(destination, request.url), 303);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    return NextResponse.json(
      { error: message === "FORBIDDEN_ADMIN" ? "Forbidden" : "Unauthorized" },
      { status: message === "FORBIDDEN_ADMIN" ? 403 : 401 }
    );
  }

  try {
    const { id } = await params;
    let returnTo: string | null = null;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      returnTo = (formData.get("returnTo") as string | null) ?? null;
    }

    const existingReply = await db.supportReply.findUnique({
      where: { id },
      select: {
        id: true,
        feedbackItemId: true,
        visibility: true,
        status: true,
      },
    });

    if (!existingReply) {
      if (returnTo) return redirectToFeedback(request, returnTo);
      return NextResponse.json({ error: "Support reply not found." }, { status: 404 });
    }

    const isEligibleDraft =
      existingReply.visibility === SupportReplyVisibility.ADMIN_ONLY &&
      existingReply.status === SupportReplyStatus.DRAFT;

    if (!isEligibleDraft) {
      if (returnTo) return redirectToFeedback(request, returnTo);
      return NextResponse.json(
        { error: "Only ADMIN_ONLY draft replies can be approved for user visibility." },
        { status: 409 }
      );
    }

    const updatedReply = await db.supportReply.update({
      where: { id: existingReply.id },
      data: {
        visibility: SupportReplyVisibility.USER_VISIBLE,
        status: SupportReplyStatus.APPROVED,
      },
      select: {
        id: true,
        feedbackItemId: true,
        visibility: true,
        status: true,
        updatedAt: true,
      },
    });

    revalidatePath("/admin/feedback");
    revalidatePath("/account/support");

    if (returnTo) return redirectToFeedback(request, returnTo);

    return NextResponse.json({
      ok: true,
      reply: {
        ...updatedReply,
        updatedAt: updatedReply.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("admin_support_reply_approve_error", error);
    return NextResponse.json({ error: "Failed to approve support reply." }, { status: 500 });
  }
}
