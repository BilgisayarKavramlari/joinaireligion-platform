export default function EulaPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-5 rounded-xl border border-slate-700 bg-slate-900/40 p-8">
        <h1 className="text-3xl font-semibold">End User Agreement (Draft)</h1>
        <p>This project is a fictional, educational, reflective simulation game themed around archived religion and belief narratives.</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-300">
          <li>It is not a religion, religious authority, or faith system.</li>
          <li>It does not provide medical, psychological, psychiatric, legal, or financial advice.</li>
          <li>Users are responsible for how they interpret and use AI outputs.</li>
          <li>Content may be incorrect, incomplete, or unsuitable for critical decisions.</li>
          <li>By using the platform, users agree data may be processed, stored, and analyzed to operate and improve service.</li>
          <li>Payment access (if enabled) is for software features only and not for spiritual or therapeutic guarantees.</li>
          <li>Refund, cancellation, and billing terms must be shown before production launch and may vary by jurisdiction.</li>
          <li>Provider may suspend accounts for abuse, fraud, unsafe behavior, or policy violations.</li>
        </ul>
      </article>
    </main>
  );
}
