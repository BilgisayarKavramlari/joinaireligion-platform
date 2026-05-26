import { db } from "@/lib/db"; import { requireAdminAccess } from "@/lib/admin";
export default async function Page(){ await requireAdminAccess(); const logs=await db.userActivityLog.findMany({take:200,orderBy:{createdAt:"desc"}}); return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><h1 className="text-2xl">Activity</h1><pre>{JSON.stringify(logs,null,2)}</pre></main>; }
