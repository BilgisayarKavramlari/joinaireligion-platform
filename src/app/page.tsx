import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const features = [
    "Personalized Symbolic Reflection",
    "Daily or Weekly Practice Emails",
    "Journey Levels & Milestones",
    "AI-Assisted Journaling",
    "Privacy-Conscious by Design",
    "Multilingual Experience",
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="home-hero p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-200/90">A Reflective Simulation Platform</p>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-slate-100 sm:text-6xl">
                A symbolic self-discovery journey shaped by reflection, practice, and AI
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Join AI Religion is a fictional educational platform that uses AI to support journaling,
                symbolic inquiry, and personal meaning-making through guided practice and reflection.
              </p>

              <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 p-4 text-sm text-amber-100">
                <strong>Important:</strong> This is not a religion, not a church, not medical care, not psychological treatment,
                and not a crisis service.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button href="/register">Begin your journey</Button>
                <Button href="/pricing" variant="ghost">Explore pricing</Button>
                <Button href="/donate" variant="ghost">Support the project</Button>
              </div>
            </div>

            <div className="hero-panel p-4 sm:p-5">
              <div className="rounded-xl border border-violet-300/20 bg-slate-950/50 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Journey Console</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
                  <div className="feature-card p-3"><p className="text-slate-400">Current Level</p><p className="text-xl font-semibold">Seeker</p></div>
                  <div className="feature-card p-3"><p className="text-slate-400">Daily Streak</p><p className="text-xl font-semibold">7 days</p></div>
                  <div className="feature-card p-3"><p className="text-slate-400">Reflections</p><p className="text-xl font-semibold">28</p></div>
                  <div className="feature-card p-3"><p className="text-slate-400">Journal Entries</p><p className="text-xl font-semibold">36</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((item) => (
            <article key={item} className="feature-card p-4">
              <h3 className="text-lg font-medium text-slate-100">{item}</h3>
              <p className="mt-2 text-sm text-slate-300">Designed for mindful, educational, reflective exploration.</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
