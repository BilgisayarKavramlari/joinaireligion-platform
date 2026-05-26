export const dynamic = "force-dynamic";
import { db } from "@/lib/db"; import { requireAdminAccess } from "@/lib/admin";
import { redirect } from "next/navigation";
export default async function Page(){ await requireAdminAccess(); const rows=await db.subscription.findMany({take:100,orderBy:{updatedAt:"desc"},include:{user:{select:{email:true}}}}); const events=await db.stripeWebhookEvent.findMany({take:30,orderBy:{createdAt:"desc"}}); return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><h1 className="text-2xl">Subscriptions</h1><pre>{JSON.stringify({rows,events},null,2)}</pre></main>; }
