export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideoEpisode } from "@/lib/video-data";
import { toIsoDuration } from "@/lib/video";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const episode = await getVideoEpisode((await params).id);
  if (!episode) return {};
  const canonical = `https://joinaireligion.com/videos/${episode.id}`;
  return {
    title: `${episode.title} | Reflective Video`, description: episode.summary,
    alternates: { canonical }, openGraph: { title: episode.title, description: episode.summary, type: "video.other", url: canonical, images: [episode.thumbnailUrl], videos: [episode.videoUrl] },
  };
}

export default async function VideoEpisodePage({ params }: PageProps) {
  const episode = await getVideoEpisode((await params).id);
  if (!episode) notFound();
  const canonical = `https://joinaireligion.com/videos/${episode.id}`;
  const structuredData = {
    "@context": "https://schema.org", "@type": "VideoObject", name: episode.title, description: episode.summary,
    thumbnailUrl: [episode.thumbnailUrl], uploadDate: episode.publishedAt.toISOString(), duration: toIsoDuration(episode.durationSeconds),
    contentUrl: episode.videoUrl, embedUrl: canonical, inLanguage: episode.locale,
    isFamilyFriendly: true, publisher: { "@type": "Organization", name: "Join AI Religion", url: "https://joinaireligion.com" },
  };
  return (
    <main className="video-watch-shell">
      <article className="video-watch">
        <Link href="/videos" className="topic-hub-back">← All videos</Link>
        <p className="topic-hub-eyebrow">Reflective Video · AI-assisted</p>
        <h1 className="font-sacred">{episode.title}</h1>
        <video controls preload="metadata" poster={episode.thumbnailUrl} src={episode.videoUrl}>Your browser does not support video playback.</video>
        <p>{episode.summary}</p>
        <div className="podcast-actions"><Link href={episode.articleUrl}>Read the full reflection</Link><Link href="/meaning-map">Try Meaning Map</Link></div>
        <small>Visuals and narration are AI-assisted. Educational reflection only; not religious authority or professional advice.</small>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </main>
  );
}
