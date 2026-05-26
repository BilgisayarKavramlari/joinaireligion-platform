export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Join AI Religion</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          AI-guided symbolic self-discovery for reflective practice
        </h1>
        <p className="max-w-2xl text-lg text-slate-300">
          A fictional and educational platform designed to help people explore symbolic narratives,
          journaling rituals, and personal reflection with AI support.
        </p>

        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-6 text-sm text-violet-100">
          <p className="font-semibold">Safety disclaimer</p>
          <p className="mt-2">
            Join AI Religion is not a religious authority, medical service, crisis line, or psychological
            treatment platform.
          </p>
        </div>
      </section>
    </main>
  );
}
