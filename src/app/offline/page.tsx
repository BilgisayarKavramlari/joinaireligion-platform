import Link from "next/link";

export const metadata = { title: "Offline | Join AI Religion", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <section className="sacred-card offline-card">
        <p className="topic-hub-eyebrow">Offline reflection</p>
        <h1 className="font-sacred">A quiet pause</h1>
        <p>The network is unavailable. Meaning Map remains available on this device, while account and private journey pages always wait for a secure connection.</p>
        <div className="podcast-actions">
          <Link href="/meaning-map">Open Meaning Map</Link>
          <Link href="/">Try again</Link>
        </div>
      </section>
    </main>
  );
}
