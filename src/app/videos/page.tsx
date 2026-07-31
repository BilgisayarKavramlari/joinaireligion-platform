export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getVideoEpisodes } from "@/lib/video-data";

export const metadata: Metadata = {
  title: "Reflective Video | Join AI Religion",
  description: "Short educational video editions of reviewed reflections, with clear AI-assistance disclosure.",
  alternates: { canonical: "https://joinaireligion.com/videos", types: { "application/rss+xml": "https://joinaireligion.com/video.xml" } },
  openGraph: { title: "Join AI Religion — Reflective Video", description: "Short educational video reflections.", images: [{ url: "https://joinaireligion.com/visuals/reflective-audio-cover.jpg", width: 3000, height: 3000 }] },
};

export default async function VideosPage() {
  const episodes = await getVideoEpisodes();
  return (
    <main className="video-shell">
      <section className="video-hero">
        <div>
          <p className="topic-hub-eyebrow">Reflective Video</p>
          <h1 className="font-sacred">Watch a question unfold</h1>
          <p>Short English video editions created only from independently reviewed, published reflections. Visuals and narration are AI-assisted.</p>
          <div className="podcast-actions"><Link href="/video.xml">Video RSS</Link><Link href="/video-sitemap.xml">Video sitemap</Link><Link href="/podcast">Listen instead</Link></div>
        </div>
        <Image src="/visuals/reflective-audio-cover.jpg" width={420} height={420} alt="Reflective Video" priority />
      </section>
      <section className="video-grid" aria-label="Video episodes">
        {episodes.map((episode) => (
          <article key={episode.id} className="sacred-card video-card">
            <Link href={`/videos/${episode.id}`}><Image src={episode.thumbnailUrl} width={640} height={360} alt="" /></Link>
            <div><p>{episode.publishedAt.toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })} · AI-assisted</p><h2 className="font-sacred"><Link href={`/videos/${episode.id}`}>{episode.title}</Link></h2><p>{episode.summary}</p></div>
          </article>
        ))}
        {episodes.length === 0 && <p className="podcast-empty">The first video reflection is being prepared. The feed lists only completed, validated video files.</p>}
      </section>
    </main>
  );
}
