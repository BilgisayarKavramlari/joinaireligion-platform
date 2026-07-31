import { CONTENT_TOPICS, getTopicCluster, getTopicClusterForCategory, TOPIC_CLUSTERS } from "@/lib/content-topics";

describe("content topic clusters", () => {
  it("assigns every content topic to a public cluster", () => {
    const slugs = new Set(TOPIC_CLUSTERS.map((cluster) => cluster.slug));
    expect(CONTENT_TOPICS.length).toBeGreaterThanOrEqual(20);
    expect(CONTENT_TOPICS.every((topic) => slugs.has(topic.cluster))).toBe(true);
  });

  it("resolves routes and categories safely", () => {
    expect(getTopicCluster("responsible-ai")?.title).toContain("Responsible AI");
    expect(getTopicCluster("missing")).toBeNull();
    expect(getTopicClusterForCategory("meditation")?.slug).toBe("meaning-and-attention");
  });
});
