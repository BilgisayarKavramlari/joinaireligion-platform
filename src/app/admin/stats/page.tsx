export const dynamic = "force-dynamic";
import { db } from "@/lib/db"; import { requireAdminAccess } from "@/lib/admin";
import { redirect } from "next/navigation";
export default async function Page(){ await requireAdminAccess(); const totals={users:await db.user.count(),queries:await db.aiQuery.count(),dialogues:await db.aiDialogue.count(),activityLogs:await db.userActivityLog.count()}; return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><h1 className="text-2xl">Stats</h1><pre>{JSON.stringify(totals,null,2)}</pre></main>; }
