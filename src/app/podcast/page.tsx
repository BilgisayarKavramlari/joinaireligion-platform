export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPodcastEpisodes } from "@/lib/podcast-data";

export const metadata: Metadata = {
  title: "Reflective Audio | Join AI Religion",
  description: "Short, AI-voiced educational reflections on attention, meaning, values, and responsible AI.",
  alternates: {
    canonical: "https://joinaireligion.com/podcast",
    types: { "application/rss+xml": "https://joinaireligion.com/podcast.xml" },
  },
  openGraph: { title: "Join AI Religion — Reflective Audio", description: "Short educational reflections for thoughtful inquiry.", type: "website", images: [{ url: "https://joinaireligion.com/visuals/reflective-audio-cover.jpg", width: 3000, height: 3000 }] },
};

export default async function PodcastPage() {
  const episodes = await getPodcastEpisodes();
  return (
    <main className="podcast-shell">
      <div className="podcast-hero">
        <Image src="/visuals/reflective-audio-cover.jpg" alt="Reflective Audio by Join AI Religion" width={420} height={420} priority />
        <div>
          <p className="topic-hub-eyebrow">Reflective Audio</p>
          <h1 className="font-sacred">Listen to the questions</h1>
          <p>Short English audio editions of our multilingual educational reflections. Every episode clearly uses an AI-generated voice.</p>
          <div className="podcast-actions">
            <Link href="/podcast.xml">Podcast RSS</Link>
            <Link href="/content">Read in 8 languages</Link>
          </div>
        </div>
      </div>
      <section className="podcast-episodes" aria-label="Episodes">
        {episodes.map((episode) => (
          <article key={episode.guid} className="sacred-card podcast-episode">
            <p>{episode.publishedAt.toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })} · AI-generated voice</p>
            <h2 className="font-sacred"><Link href={episode.articleUrl}>{episode.title}</Link></h2>
            <p>{episode.summary}</p>
            <audio controls preload="metadata" src={episode.audioUrl}>Your browser does not support audio playback.</audio>
          </article>
        ))}
        {episodes.length === 0 && <p className="podcast-empty">The first audio reflection is being prepared. The RSS endpoint is active and will list only completed audio.</p>}
      </section>
    </main>
  );
}
