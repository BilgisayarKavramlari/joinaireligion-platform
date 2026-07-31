import { AgentArtifactStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { PodcastEpisode } from "@/lib/podcast";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function getPodcastEpisodes(): Promise<PodcastEpisode[]> {
  const artifacts = await db.agentArtifact.findMany({
    where: { agentName: "podcast-publisher", artifactType: "PODCAST_EPISODE", status: AgentArtifactStatus.READY },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return artifacts.flatMap((artifact) => {
    const payload = asRecord(artifact.payload);
    const audioBytes = Number(payload.audioBytes || 0);
    const publishedAt = new Date(String(payload.publishedAt || artifact.createdAt.toISOString()));
    if (
      typeof payload.guid !== "string"
      || typeof payload.articleUrl !== "string"
      || typeof payload.audioUrl !== "string"
      || !Number.isFinite(audioBytes)
      || audioBytes <= 0
      || Number.isNaN(publishedAt.getTime())
    ) return [];
    return [{
      guid: payload.guid,
      title: artifact.title,
      summary: artifact.summary || "A short educational reflection from Join AI Religion.",
      articleUrl: payload.articleUrl,
      audioUrl: payload.audioUrl,
      audioBytes,
      publishedAt,
      locale: artifact.locale || "en",
    }];
  });
}
