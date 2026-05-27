export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin";
type UserRow = {
  id:              string;
  email:           string;
  displayName:     string | null;
  role:            string;
  emailVerifiedAt: Date | null;
  subscription:    { status: string } | null;
  profile:         unknown;
  quota:           unknown;
};

export default async function Page() {
  await requireAdminSession();

  const users = await db.user.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { subscription: true, profile: true, quota: true },
  });

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-4 text-2xl font-semibold">Users</h1>
      <div className="space-y-1">
        {users.map((u: UserRow) => (
          <div key={u.id} className="border-b border-slate-700 py-2 text-sm">
            <Link href={`/admin/users/${u.id}`} className="text-violet-400 hover:underline">
              {u.email}
            </Link>
            {" · "}
            {u.displayName ?? "–"}
            {" · "}
            {u.role}
            {" · "}
            {u.emailVerifiedAt ? "verified" : "unverified"}
            {" · "}
            {u.subscription?.status ?? "free"}
          </div>
        ))}
      </div>
    </main>
  );
}
