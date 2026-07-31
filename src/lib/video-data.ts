import { AgentArtifactStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { VideoEpisode } from "@/lib/video";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseEpisode(artifact: { id: string; title: string; summary: string | null; locale: string | null; payload: unknown; createdAt: Date }): VideoEpisode | null {
  const payload = asRecord(artifact.payload);
  const videoBytes = Number(payload.videoBytes || 0);
  const durationSeconds = Number(payload.durationSeconds || 0);
  const publishedAt = new Date(String(payload.publishedAt || artifact.createdAt.toISOString()));
  if (
    typeof payload.guid !== "string" || typeof payload.articleUrl !== "string"
    || typeof payload.videoUrl !== "string" || typeof payload.thumbnailUrl !== "string"
    || videoBytes <= 0 || durationSeconds <= 0 || Number.isNaN(publishedAt.getTime())
  ) return null;
  return {
    id: artifact.id,
    guid: payload.guid,
    title: artifact.title,
    summary: artifact.summary || "A short educational reflection from Join AI Religion.",
    articleUrl: payload.articleUrl,
    videoUrl: payload.videoUrl,
    thumbnailUrl: payload.thumbnailUrl,
    videoBytes,
    durationSeconds,
    publishedAt,
    locale: artifact.locale || "en",
  };
}

export async function getVideoEpisodes(): Promise<VideoEpisode[]> {
  const artifacts = await db.agentArtifact.findMany({
    where: { agentName: "video-publisher", artifactType: "VIDEO_EPISODE", status: AgentArtifactStatus.READY },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, summary: true, locale: true, payload: true, createdAt: true },
  });
  return artifacts.flatMap((artifact) => {
    const episode = parseEpisode(artifact);
    return episode ? [episode] : [];
  });
}

export async function getVideoEpisode(id: string): Promise<VideoEpisode | null> {
  const artifact = await db.agentArtifact.findFirst({
    where: { id, agentName: "video-publisher", artifactType: "VIDEO_EPISODE", status: AgentArtifactStatus.READY },
    select: { id: true, title: true, summary: true, locale: true, payload: true, createdAt: true },
  });
  return artifact ? parseEpisode(artifact) : null;
}
