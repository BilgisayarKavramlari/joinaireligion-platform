import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
        <h1 className="text-3xl font-semibold">Register</h1>
        <p className="mt-3 text-slate-300">Create your account for this fictional educational simulation platform.</p>

        <form className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Email</span>
            <input type="email" className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2" placeholder="you@example.com" />
          </label>

          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input type="checkbox" className="mt-1" required />
            <span>
              I agree to the <Link href="/legal/eula" className="text-violet-300 underline">End User Agreement</Link> and understand this is a simulation, not a religious authority, medical care, or psychological treatment.
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input type="checkbox" className="mt-1" name="emailOptIn" />
            <span>
              I consent to receive platform emails and notifications as described in the <Link href="/legal/email-consent" className="text-violet-300 underline">Email & Notifications Consent</Link> policy.
            </span>
          </label>

          <button type="button" className="rounded-md bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500">Continue</button>
        </form>
      </section>
    </main>
  );
}
