import { moderateReflectionText } from "@/lib/reflection-provider";

describe("Reflection provider moderation boundary", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns only active category labels for a successful result", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      results: [{ flagged: true, categories: { violence: true, harassment: false } }],
    }), { status: 200 }));

    await expect(moderateReflectionText("test-key", "test input")).resolves.toEqual({
      ok: true,
      flagged: true,
      flags: ["violence"],
    });
  });

  it.each([
    [401, "authorization"],
    [403, "authorization"],
    [429, "rate_limited"],
    [400, "provider_rejected"],
    [503, "provider_error"],
  ])("classifies HTTP %s without exposing a provider body", async (status, failureCode) => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("provider detail must not escape", { status }));
    await expect(moderateReflectionText("test-key", "test input")).resolves.toEqual({
      ok: false,
      failureCode,
      httpStatus: status,
    });
  });
});
