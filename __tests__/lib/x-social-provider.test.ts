const mockFetch = jest.fn();

jest.mock("@/lib/env", () => ({
  env: {
    SOCIAL_PUBLISHING_ENABLED: "true",
    X_PUBLISHING_ENABLED: "false",
  },
}));

import { env } from "@/lib/env";
import { getConfiguredSocialProviders, publishSocialPost } from "@/lib/social/providers";

type MutableXEnv = typeof env & {
  SOCIAL_PUBLISHING_ENABLED?: string;
  X_PUBLISHING_ENABLED?: string;
  X_USER_ACCESS_TOKEN?: string;
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_TOKEN_SECRET?: string;
};

const xEnv = env as MutableXEnv;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
  xEnv.SOCIAL_PUBLISHING_ENABLED = "true";
  xEnv.X_PUBLISHING_ENABLED = "false";
  xEnv.X_USER_ACCESS_TOKEN = undefined;
  xEnv.X_API_KEY = undefined;
  xEnv.X_API_SECRET = undefined;
  xEnv.X_ACCESS_TOKEN = undefined;
  xEnv.X_ACCESS_TOKEN_SECRET = undefined;
});

describe("X text-only publication boundary", () => {
  it("keeps X absent and makes no request while its provider switch is off", async () => {
    xEnv.X_USER_ACCESS_TOKEN = "fake-user-token";

    expect(getConfiguredSocialProviders()).not.toContain("x");
    await expect(publishSocialPost("x", "A reflection", "unused-key"))
      .rejects.toThrow("X publication is not fully configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a partial OAuth 1.0a credential set before network access", async () => {
    xEnv.X_PUBLISHING_ENABLED = "true";
    xEnv.X_API_KEY = "fake-api-key";
    xEnv.X_API_SECRET = "fake-api-secret";
    xEnv.X_ACCESS_TOKEN = "fake-access-token";

    expect(getConfiguredSocialProviders()).not.toContain("x");
    await expect(publishSocialPost("x", "A reflection", "unused-key"))
      .rejects.toThrow("X publication is not fully configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses OAuth 2.0 user context and sends only a standalone AI-labelled text Post", async () => {
    xEnv.X_PUBLISHING_ENABLED = "true";
    xEnv.X_USER_ACCESS_TOKEN = "fake-user-token";
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: { id: "post-42" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));

    const result = await publishSocialPost("x", "A careful reflection", "unused-key");

    expect(result).toEqual({
      provider: "x",
      externalId: "post-42",
      externalUrl: "https://x.com/i/web/status/post-42",
    });
    const [url, request] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.x.com/2/tweets");
    expect(request.method).toBe("POST");
    expect((request.headers as Record<string, string>).Authorization).toBe("Bearer fake-user-token");
    expect(JSON.parse(String(request.body))).toEqual({
      text: "A careful reflection",
      made_with_ai: true,
    });
    expect(String(request.body)).not.toContain("reply");
    expect(String(request.body)).not.toContain("direct_message");
    expect(String(request.body)).not.toContain("like");
    expect(String(request.body)).not.toContain("follow");
  });

  it("treats a successful response without a Post id as a failed publication", async () => {
    xEnv.X_PUBLISHING_ENABLED = "true";
    xEnv.X_USER_ACCESS_TOKEN = "fake-user-token";
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: {} }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(publishSocialPost("x", "A careful reflection", "unused-key"))
      .rejects.toThrow("X publication returned no post id");
  });
});
