export default function EmailConsentPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-8">
        <h1 className="text-3xl font-semibold">Email & Notifications Consent (Draft)</h1>
        <p className="text-slate-300">By opting in, you allow educational emails and product notifications related to your usage.</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-300">
          <li>Email is optional unless required for account verification/security notices.</li>
          <li>You may unsubscribe from non-essential emails at any time when controls are available.</li>
          <li>Message delivery may involve third-party processors (e.g., Resend).</li>
          <li>No guarantees are made about outcomes from reflective prompts.</li>
          <li>No manipulative, coercive, prophetic, or absolute religious instruction is intended.</li>
        </ul>
      </article>
    </main>
  );
}
