import {
  TikTokPublishingError,
  assertTikTokMediaCompliance,
  classifyTikTokError,
  fetchTikTokPostStatus,
  initializeTikTokVideoPost,
  isUnauditedCreatorAccountPrivate,
  queryTikTokCreatorInfo,
  type TikTokCreatorInfo,
  type TikTokInitIdempotencyStore,
  type TikTokInitRecord,
  type TikTokVideoPostInput,
} from "@/lib/social/tiktok";

class MemoryInitStore implements TikTokInitIdempotencyStore {
  records = new Map<string, TikTokInitRecord>();

  async claim(key: string, fingerprint: string) {
    const existing = this.records.get(key);
    if (existing) return { status: "EXISTING" as const, record: existing };
    this.records.set(key, { fingerprint, state: "IN_FLIGHT" });
    return { status: "CLAIMED" as const };
  }

  async resolve(key: string, record: TikTokInitRecord) {
    this.records.set(key, record);
  }
}

const privateCreatorInfo: TikTokCreatorInfo = {
  flowId: "flow-reflection-001",
  creatorUsername: "join_ai_religion",
  creatorNickname: "Join AI Religion",
  privacyLevelOptions: ["FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
  commentDisabled: false,
  duetDisabled: true,
  stitchDisabled: true,
  maxVideoPostDurationSec: 180,
  fetchedAt: "2026-08-10T12:00:00.000Z",
};

function validPost(overrides: Partial<TikTokVideoPostInput> = {}): TikTokVideoPostInput {
  return {
    idempotencyKey: "tiktok-video-001",
    clientAudited: false,
    creatorInfo: privateCreatorInfo,
    consent: {
      flowId: "flow-reflection-001",
      granted: true,
      grantedAt: "2026-08-10T12:01:00.000Z",
      previewShown: true,
      titleEditable: true,
      privacySelectedByUser: true,
      interactionsSelectedByUser: true,
      musicUsageConfirmed: true,
      brandedContentPolicyConfirmed: false,
    },
    mediaCompliance: {
      originalOrAuthorized: true,
      containsAddedWatermark: false,
      containsPromotionalOverlay: false,
      containsEmbeddedPromotionalLinkOrText: false,
    },
    title: "A short reflection on responsible meaning-making",
    privacyLevel: "SELF_ONLY",
    allowComment: false,
    allowDuet: false,
    allowStitch: false,
    promotesOwnBrand: true,
    promotesThirdPartyBrand: false,
    isAiGenerated: true,
    durationSeconds: 42,
    source: {
      type: "PULL_FROM_URL",
      videoUrl: "https://joinaireligion.com/media/reflection.mp4",
      urlOwnershipVerified: true,
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TikTok Direct Post safety adapter", () => {
  it("queries and normalizes the latest creator info", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({
      data: {
        creator_username: "join_ai_religion",
        creator_nickname: "Join AI Religion",
        privacy_level_options: ["FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
        comment_disabled: false,
        duet_disabled: true,
        stitch_disabled: true,
        max_video_post_duration_sec: 180,
      },
      error: { code: "ok", message: "", log_id: "safe-log-id" },
    }));

    const result = await queryTikTokCreatorInfo({
      accessToken: "secret-test-token",
      flowId: "flow-reflection-001",
      fetchImpl,
      now: new Date("2026-08-10T12:00:00.000Z"),
    });

    expect(result).toEqual(privateCreatorInfo);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      expect.objectContaining({ method: "POST", body: "{}", cache: "no-store" }),
    );
  });

  it("forces unaudited clients to a private account and SELF_ONLY", async () => {
    const store = new MemoryInitStore();
    const fetchImpl = jest.fn();

    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({ privacyLevel: "MUTUAL_FOLLOW_FRIENDS" }),
      idempotencyStore: store,
      fetchImpl,
    })).rejects.toThrow("restricted to SELF_ONLY");

    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({
        creatorInfo: {
          ...privateCreatorInfo,
          privacyLevelOptions: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
        },
      }),
      idempotencyStore: store,
      fetchImpl,
    })).rejects.toThrow("private creator accounts");
    expect(isUnauditedCreatorAccountPrivate({
      ...privateCreatorInfo,
      privacyLevelOptions: ["FOLLOWER_OF_CREATOR", "SELF_ONLY"],
    })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("honors only privacy and interaction choices returned by creator_info", async () => {
    const store = new MemoryInitStore();
    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({ clientAudited: true, privacyLevel: "PUBLIC_TO_EVERYONE" }),
      idempotencyStore: store,
      fetchImpl: jest.fn(),
    })).rejects.toThrow("not allowed by the latest creator info");

    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({ allowDuet: true }),
      idempotencyStore: store,
      fetchImpl: jest.fn(),
    })).rejects.toThrow("Duet is disabled");
  });

  it("requires explicit per-post preview, editable metadata, manual choices, and consent", async () => {
    const store = new MemoryInitStore();
    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({
        consent: { ...validPost().consent, privacySelectedByUser: false },
      }),
      idempotencyStore: store,
      fetchImpl: jest.fn(),
    })).rejects.toThrow("explicit, informed, per-post user consent");
  });

  it("binds fresh creator info and later consent to the same post flow without inventing a TTL", async () => {
    const store = new MemoryInitStore();
    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({
        consent: { ...validPost().consent, flowId: "flow-another-002" },
      }),
      idempotencyStore: store,
      fetchImpl: jest.fn(),
    })).rejects.toThrow("same post flow");

    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post: validPost({
        consent: { ...validPost().consent, grantedAt: "2026-08-10T11:59:59.999Z" },
      }),
      idempotencyStore: store,
      fetchImpl: jest.fn(),
    })).rejects.toThrow("after the latest creator info query");
  });

  it("rejects watermarks and promotional overlays before any network call", () => {
    expect(() => assertTikTokMediaCompliance({
      originalOrAuthorized: true,
      containsAddedWatermark: true,
      containsPromotionalOverlay: false,
      containsEmbeddedPromotionalLinkOrText: false,
    })).toThrow("watermark or logo");

    expect(() => assertTikTokMediaCompliance({
      originalOrAuthorized: true,
      containsAddedWatermark: false,
      containsPromotionalOverlay: true,
      containsEmbeddedPromotionalLinkOrText: false,
    })).toThrow("promotional overlays");
  });

  it("initializes once, persists publish_id, and reuses only the completed local record", async () => {
    const store = new MemoryInitStore();
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({
      data: { publish_id: "v_pub_url~v2.123" },
      error: { code: "ok", message: "", log_id: "safe-log-id" },
    }));
    const post = validPost();

    await expect(initializeTikTokVideoPost({
      accessToken: "secret-test-token",
      post,
      idempotencyStore: store,
      fetchImpl,
    })).resolves.toEqual({ publishId: "v_pub_url~v2.123", uploadUrl: null, reused: false });

    await expect(initializeTikTokVideoPost({
      accessToken: "secret-test-token",
      post,
      idempotencyStore: store,
      fetchImpl,
    })).resolves.toEqual({ publishId: "v_pub_url~v2.123", uploadUrl: null, reused: true });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      post_info: {
        title: post.title,
        privacy_level: "SELF_ONLY",
        disable_comment: true,
        disable_duet: true,
        disable_stitch: true,
        brand_content_toggle: false,
        brand_organic_toggle: true,
        is_aigc: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: "https://joinaireligion.com/media/reflection.mp4",
      },
    });
  });

  it("marks an uncertain init as ambiguous and never blindly retries it", async () => {
    const store = new MemoryInitStore();
    const fetchImpl = jest.fn().mockRejectedValue(new Error("socket closed"));
    const post = validPost();

    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post,
      idempotencyStore: store,
      fetchImpl,
    })).rejects.toMatchObject({
      code: "network_ambiguous",
      classification: { category: "ambiguous", retryMode: "new_consent_required" },
    });
    await expect(initializeTikTokVideoPost({
      accessToken: "token",
      post,
      idempotencyStore: store,
      fetchImpl,
    })).rejects.toMatchObject({ code: "network_ambiguous" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps processing, complete, and failed status responses", async () => {
    const processingFetch = jest.fn().mockResolvedValue(jsonResponse({
      data: { status: "PROCESSING_DOWNLOAD", downloaded_bytes: 2048 },
      error: { code: "ok" },
    }));
    await expect(fetchTikTokPostStatus({
      accessToken: "token",
      publishId: "v_pub_url~v2.123",
      fetchImpl: processingFetch,
    })).resolves.toMatchObject({ state: "processing", shouldPollAgain: true, downloadedBytes: 2048 });

    const completedFetch = jest.fn().mockResolvedValue(jsonResponse({
      data: { status: "PUBLISH_COMPLETE", publicaly_available_post_id: [123456789] },
      error: { code: "ok" },
    }));
    await expect(fetchTikTokPostStatus({
      accessToken: "token",
      publishId: "v_pub_url~v2.123",
      fetchImpl: completedFetch,
    })).resolves.toMatchObject({
      state: "complete",
      shouldPollAgain: false,
      publiclyAvailablePostIds: ["123456789"],
    });

    const failedFetch = jest.fn().mockResolvedValue(jsonResponse({
      data: { status: "FAILED", fail_reason: "spam_risk_text" },
      error: { code: "ok" },
    }));
    await expect(fetchTikTokPostStatus({
      accessToken: "token",
      publishId: "v_pub_url~v2.123",
      fetchImpl: failedFetch,
    })).resolves.toMatchObject({
      state: "failed",
      shouldPollAgain: false,
      failure: { category: "policy", retryMode: "do_not_retry" },
    });
  });

  it("classifies init transients more conservatively than safe status polling", () => {
    expect(classifyTikTokError("internal_error", 500, "status")).toEqual({
      category: "transient",
      retryMode: "retry",
    });
    expect(classifyTikTokError("internal_error", 500, "video_init")).toEqual({
      category: "transient",
      retryMode: "new_consent_required",
    });
    expect(new TikTokPublishingError({
      code: "access_token_invalid",
      operation: "creator_info",
    }).message).not.toContain("secret");
  });
});
