import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

  const user = email
    ? await db.user.findUnique({
        where: { email },
        include: { subscription: true, emailLogs: true },
      })
    : null;

  const aiConversationCount = user
    ? await db.aiQuery.count({
        where: { userId: user.id },
      })
    : 0;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-1">
          <h1 className="text-2xl font-semibold">Profil</h1>
          <p className="mt-2 text-slate-300">Avatar URL, isim ve kişisel bilgilerini yönet.</p>
          <form className="mt-4 space-y-3">
            <input className="w-full rounded bg-slate-950 p-2" placeholder="Display name" defaultValue={user?.displayName ?? ""} />
            <button type="button" className="btn-primary w-full">Kaydet</button>
          </form>
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold">Hesap Özeti</h2>
          {!user ? (
            <p className="mt-3 text-slate-300">`?email=` query param ile profil verisi görüntülenir (MVP).</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded border border-white/10 p-3">Email: {user.email}</div>
              <div className="rounded border border-white/10 p-3">Üyelik: {user.subscription?.status ?? "FREE"}</div>
              <div className="rounded border border-white/10 p-3">Kayıt: {user.createdAt.toISOString()}</div>
              <div className="rounded border border-white/10 p-3">Aldığı email: {user.emailLogs.length}</div>
              <div className="rounded border border-white/10 p-3">AI konuşma: {aiConversationCount}</div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
