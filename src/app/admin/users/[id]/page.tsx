export const dynamic = "force-dynamic";
import { db } from "@/lib/db"; import { requireAdminAccess } from "@/lib/admin";
import { redirect } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { await requireAdminAccess(); const {id}=await params; const data = await db.user.findUnique({ where:{id}, include:{subscription:true,profile:true,quota:true, onboarding:true, dialogues:{take:10,orderBy:{createdAt:"desc"}} } }); return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><h1 className="text-2xl">User detail</h1><pre>{JSON.stringify(data,null,2)}</pre></main>; }
