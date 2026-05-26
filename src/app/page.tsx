import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold leading-tight">AI destekli yansıtıcı keşif simülasyonu</h1>
          <p className="text-lg text-slate-300">Kurgusal, eğitsel bir platform: dini otorite, tıbbi bakım, psikolojik tedavi veya kriz hizmeti değildir.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary">Create account</Link>
            <Link href="/login" className="btn-ghost">Login</Link>
            <Link href="/pricing" className="btn-ghost">View pricing</Link>
            <Link href="/donate" className="btn-ghost">Donate</Link>
            <Link href="/legal/eula" className="btn-ghost">Read user agreement</Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="animate-pulse rounded-xl border border-violet-400/30 bg-violet-500/10 p-5">
            <p className="text-sm text-violet-100">Canlı deneyim kartı</p>
            <p className="mt-2 text-slate-200">Günün sorusu: “Bugün hangi inanç/varsayımını gözlemledin ve bu seni nasıl etkiledi?”</p>
          </div>
        </div>
      </section>
    </main>
  );
}
