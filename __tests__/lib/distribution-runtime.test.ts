import {
  DISTRIBUTION_RUNTIME_PROVIDER_ORDER,
  dispatchDistributionArticle,
  type DistributionDeliveryStore,
  type DistributionStoredDelivery,
} from "@/lib/distribution/runtime";
import type { DistributionArticle } from "@/lib/distribution/types";

class MemoryDeliveryStore implements DistributionDeliveryStore {
  deliveries = new Map<string, DistributionStoredDelivery>();
  claimCount = 0;

  async claim(deliveryKey: string, contentFingerprint: string, attemptedAt: string) {
    this.claimCount += 1;
    const existing = this.deliveries.get(deliveryKey);
    if (existing) return { status: "EXISTING" as const, delivery: existing };
    this.deliveries.set(deliveryKey, { contentFingerprint, state: "IN_FLIGHT", attemptedAt });
    return { status: "CLAIMED" as const };
  }

  async resolve(deliveryKey: string, delivery: DistributionStoredDelivery) {
    this.deliveries.set(deliveryKey, delivery);
  }
}

const article: DistributionArticle = {
  idempotencyKey: "distribution:responsible-ai:en:v1",
  title: "Responsible AI and Attention",
  summary: "A practical reflection on attention, agency, and responsible AI use.",
  bodyMarkdown: "## Notice what changes\n\nPause and reflect.",
  canonicalUrl: "https://joinaireligion.com/content/en/responsible-ai-attention",
  locale: "en",
  category: "responsible_ai",
  tags: ["responsible-ai", "reflection"],
  author: "Join AI Religion Editorial",
  imageUrl: "https://joinaireligion.com/social-card/en/responsible-ai-attention.jpg?preset=discover",
  publishedAt: new Date("2026-08-10T10:00:00.000Z"),
  updatedAt: new Date("2026-08-10T11:00:00.000Z"),
  aiAssisted: true,
};

const bloggerEnv = {
  DISTRIBUTION_PUBLISHING_ENABLED: "true",
  BLOGGER_PUBLISHING_ENABLED: "true",
  BLOGGER_CLIENT_ID: "client-id",
  BLOGGER_CLIENT_SECRET: "client-secret",
  BLOGGER_REFRESH_TOKEN: "refresh-token",
  BLOGGER_BLOG_ID: "123",
};

const tumblrEnv = {
  TUMBLR_PUBLISHING_ENABLED: "true",
  TUMBLR_CONSUMER_KEY: "consumer-key",
  TUMBLR_CONSUMER_SECRET: "consumer-secret",
  TUMBLR_ACCESS_TOKEN: "access-token",
  TUMBLR_TOKEN_SECRET: "token-secret",
  TUMBLR_BLOG_IDENTIFIER: "joinai.tumblr.com",
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("long-form distribution runtime", () => {
  test("keeps every provider default-off when the global switch is absent", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn();
    await expect(dispatchDistributionArticle({
      article,
      runtimeEnv: {},
      dependencies: { deliveryStore: store, fetchImpl: fetchImpl as unknown as typeof fetch },
    })).resolves.toEqual({ configuredProviders: [], deliveries: [] });
    expect(store.claimCount).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("fails closed before claiming or fetching when Blogger secrets are incomplete", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn();
    const result = await dispatchDistributionArticle({
      article,
      runtimeEnv: {
        DISTRIBUTION_PUBLISHING_ENABLED: "true",
        BLOGGER_PUBLISHING_ENABLED: "true",
        BLOGGER_CLIENT_ID: "client-id",
      },
      dependencies: { deliveryStore: store, fetchImpl: fetchImpl as unknown as typeof fetch },
    });

    expect(result.deliveries).toEqual([expect.objectContaining({
      provider: "blogger",
      status: "BLOCKED",
      reason: "provider_disabled_or_incomplete",
      missing: expect.arrayContaining(["BLOGGER_CLIENT_SECRET", "BLOGGER_REFRESH_TOKEN", "BLOGGER_BLOG_ID"]),
    })]);
    expect(store.claimCount).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("does not run Tumblr without the global distribution switch", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn();
    const result = await dispatchDistributionArticle({
      article,
      providers: ["tumblr"],
      runtimeEnv: tumblrEnv,
      dependencies: { deliveryStore: store, fetchImpl: fetchImpl as unknown as typeof fetch },
    });

    expect(result.deliveries).toEqual([expect.objectContaining({
      provider: "tumblr",
      status: "BLOCKED",
      reason: "provider_disabled_or_incomplete",
    })]);
    expect(store.claimCount).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("prioritizes Blogger and Tumblr and stores their confirmed provider results", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn(async (url: string | URL) => {
      const target = String(url);
      if (target === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "short-lived-access" });
      if (target.includes("googleapis.com/blogger/v3")) return jsonResponse({ id: "blogger-1", url: "https://joinai.blogspot.com/p/1" });
      if (target.includes("api.tumblr.com")) return jsonResponse({ response: { id_string: "tumblr-1", post_url: "https://joinai.tumblr.com/post/1" } });
      return jsonResponse({}, 500);
    }) as unknown as typeof fetch;

    const result = await dispatchDistributionArticle({
      article,
      runtimeEnv: { ...bloggerEnv, ...tumblrEnv },
      dependencies: { deliveryStore: store, fetchImpl },
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(DISTRIBUTION_RUNTIME_PROVIDER_ORDER.slice(0, 2)).toEqual(["blogger", "tumblr"]);
    expect(result.configuredProviders).toEqual(["blogger", "tumblr"]);
    expect(result.deliveries).toEqual([
      expect.objectContaining({ provider: "blogger", status: "PUBLISHED", externalId: "blogger-1" }),
      expect.objectContaining({ provider: "tumblr", status: "PUBLISHED", externalId: "tumblr-1" }),
    ]);
    expect(store.claimCount).toBe(2);
  });

  test("reuses persisted successful delivery results without a second provider call", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn(async (url: string | URL) => String(url) === "https://oauth2.googleapis.com/token"
      ? jsonResponse({ access_token: "short-lived-access" })
      : jsonResponse({ id: "blogger-1", url: "https://joinai.blogspot.com/p/1" })) as unknown as typeof fetch;
    const input = {
      article,
      providers: ["blogger"] as const,
      runtimeEnv: bloggerEnv,
      dependencies: { deliveryStore: store, fetchImpl },
      now: new Date("2026-08-11T12:00:00.000Z"),
    };

    await expect(dispatchDistributionArticle(input)).resolves.toMatchObject({
      deliveries: [{ provider: "blogger", status: "PUBLISHED", externalId: "blogger-1" }],
    });
    await expect(dispatchDistributionArticle(input)).resolves.toMatchObject({
      deliveries: [{ provider: "blogger", status: "REUSED", externalId: "blogger-1" }],
    });
    expect((fetchImpl as unknown as jest.Mock).mock.calls).toHaveLength(2);
  });

  test("blocks blind retry after an uncertain insert and requires manual reconciliation", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn().mockRejectedValue(new Error("socket closed")) as unknown as typeof fetch;
    const input = {
      article,
      providers: ["blogger"] as const,
      runtimeEnv: bloggerEnv,
      dependencies: { deliveryStore: store, fetchImpl },
      now: new Date("2026-08-11T12:00:00.000Z"),
    };

    await expect(dispatchDistributionArticle(input)).resolves.toMatchObject({
      deliveries: [{ provider: "blogger", status: "AMBIGUOUS", reason: "manual_reconciliation_required" }],
    });
    await expect(dispatchDistributionArticle(input)).resolves.toMatchObject({
      deliveries: [{ provider: "blogger", status: "BLOCKED", reason: "manual_reconciliation_required" }],
    });
    expect((fetchImpl as unknown as jest.Mock).mock.calls).toHaveLength(1);
  });

  test("keeps the persistent claim in-flight if provider succeeds but result persistence fails", async () => {
    class ResolveFailingStore extends MemoryDeliveryStore {
      override async resolve() {
        throw new Error("database unavailable");
      }
    }
    const store = new ResolveFailingStore();
    const fetchImpl = jest.fn(async () => jsonResponse({
      response: { id_string: "tumblr-accepted", post_url: "https://joinai.tumblr.com/post/accepted" },
    })) as unknown as typeof fetch;
    const input = {
      article,
      providers: ["tumblr"] as const,
      runtimeEnv: { DISTRIBUTION_PUBLISHING_ENABLED: "true", ...tumblrEnv },
      dependencies: { deliveryStore: store, fetchImpl },
      now: new Date("2026-08-11T12:00:00.000Z"),
    };

    await expect(dispatchDistributionArticle(input)).resolves.toMatchObject({
      deliveries: [{ provider: "tumblr", status: "AMBIGUOUS", reason: "delivery_result_persistence_failed" }],
    });
    await expect(dispatchDistributionArticle(input)).resolves.toMatchObject({
      deliveries: [{ provider: "tumblr", status: "BLOCKED", reason: "delivery_in_flight" }],
    });
    expect((fetchImpl as unknown as jest.Mock).mock.calls).toHaveLength(1);
  });

  test("blocks reuse of an idempotency key for changed article content", async () => {
    const store = new MemoryDeliveryStore();
    const fetchImpl = jest.fn(async (url: string | URL) => String(url) === "https://oauth2.googleapis.com/token"
      ? jsonResponse({ access_token: "short-lived-access" })
      : jsonResponse({ id: "blogger-1" })) as unknown as typeof fetch;
    await dispatchDistributionArticle({
      article,
      providers: ["blogger"],
      runtimeEnv: bloggerEnv,
      dependencies: { deliveryStore: store, fetchImpl },
    });

    const result = await dispatchDistributionArticle({
      article: { ...article, title: "Changed title with the same unsafe key" },
      providers: ["blogger"],
      runtimeEnv: bloggerEnv,
      dependencies: { deliveryStore: store, fetchImpl },
    });
    expect(result.deliveries).toEqual([expect.objectContaining({
      provider: "blogger",
      status: "BLOCKED",
      reason: "idempotency_key_reused_for_different_content",
    })]);
    expect((fetchImpl as unknown as jest.Mock).mock.calls).toHaveLength(2);
  });
});
