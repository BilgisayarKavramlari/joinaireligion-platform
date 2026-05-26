import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin";

export default async function Page() { await requireAdminAccess(); const users = await db.user.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { subscription: true, profile: true, quota: true } }); return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><h1 className="text-2xl">Users</h1>{users.map((u)=><div key={u.id} className="border-b border-slate-700 py-2"><Link href={`/admin/users/${u.id}`}>{u.email}</Link> · {u.displayName ?? "-"} · {u.role} · {u.emailVerifiedAt?"verified":"unverified"} · {u.subscription?.status ?? "free"}</div>)}</main>; }
