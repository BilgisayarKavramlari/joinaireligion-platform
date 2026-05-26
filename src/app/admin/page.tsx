export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function AdminHome() {
  try { await requireAdminAccess(); } catch { redirect("/forbidden"); }
  const [totalUsers, verifiedUsers, onboardingCompletedUsers, freeUsers, paidUsers, activeSubscriptions, canceledSubscriptions, dailyAiQueryCount, weeklyAiQueryCount, totalEmailSends, failedEmailSends, recentRegistrations, recentStripeEvents, recentAiDialogueLogs, recentChecklistWarnings] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerifiedAt: { not: null } } }),
    db.user.count({ where: { onboarding: { some: {} } } }),
    db.user.count({ where: { OR: [{ subscription: null }, { subscription: { status: { in: ["TRIAL", "CANCELED"] } } }] } }),
    db.user.count({ where: { subscription: { status: "ACTIVE" } } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscription.count({ where: { status: "CANCELED" } }),
    db.aiQuery.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    db.aiQuery.count({ where: { createdAt: { gte: new Date(Date.now() - 604800000) } } }),
    db.emailLog.count(),
    db.emailLog.count({ where: { status: { contains: "fail", mode: "insensitive" } } }),
    db.user.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { email: true, createdAt: true } }),
    db.stripeWebhookEvent.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    db.aiDialogue.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    db.userActivityLog.findMany({ take: 8, where: { OR: [{ eventName: { contains: "checklist" } }, { eventName: { contains: "prompt_too_long" } }] }, orderBy: { createdAt: "desc" } }),
  ]);
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><h1 className="mb-4 text-3xl">Admin dashboard</h1><pre>{JSON.stringify({totalUsers,verifiedUsers,onboardingCompletedUsers,freeUsers,paidUsers,activeSubscriptions,canceledSubscriptions,dailyAiQueryCount,weeklyAiQueryCount,totalEmailSends,failedEmailSends,recentRegistrations,recentStripeEvents,recentAiDialogueLogs,recentChecklistWarnings},null,2)}</pre></main>;
}
