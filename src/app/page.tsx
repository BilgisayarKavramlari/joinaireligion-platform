import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-20">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Join AI Religion · Simulation Platform</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">A reflective simulation game exploring archived belief narratives with AI</h1>
          <p className="max-w-3xl text-lg text-slate-300">
            This platform is a fictional, educational, religion-themed simulation experience. It uses AI and documented
            archives to create reflective prompts and symbolic storytelling for personal journaling.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link href="/register" className="rounded-md bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500">Create account</Link>
          <Link href="/pricing" className="rounded-md border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800">View pricing</Link>
          <Link href="/legal/eula" className="rounded-md border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800">Read user agreement</Link>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-6 text-sm text-amber-100">
          <p className="font-semibold">Important legal and safety notice</p>
          <p className="mt-2">
            Join AI Religion is not a religion, not a church, not a faith authority, not medical care, and not
            psychological treatment. Outputs are simulated educational content only.
          </p>
        </div>
      </section>
    </main>
  );
}
