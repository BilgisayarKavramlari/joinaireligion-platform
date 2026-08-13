import { moderateReflectionText, moderateReflectionTextResilient } from "@/lib/reflection-provider";

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

  it("uses a tool-free, non-stored structured classifier when the primary endpoint is unauthorized", async () => {
    const fetchSpy = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ allow: true, crisis: false, categories: [] }) } }],
      }), { status: 200 }));

    await expect(moderateReflectionTextResilient("test-key", "ordinary reflection", "gpt-5-mini")).resolves.toEqual({
      ok: true,
      flagged: false,
      flags: [],
      source: "structured_fallback",
      primaryFailureCode: "authorization",
    });
    const fallbackBody = JSON.parse(String((fetchSpy.mock.calls[1][1] as RequestInit).body));
    expect(fallbackBody).toMatchObject({
      model: "gpt-5-mini",
      store: false,
      messages: [
        { role: "system" },
        { role: "user" },
      ],
      response_format: { type: "json_schema", json_schema: { strict: true } },
    });
  });

  it("fails closed when both safety boundaries are unavailable", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(moderateReflectionTextResilient("test-key", "ordinary reflection", "gpt-5-mini")).resolves.toEqual({
      ok: false,
      failureCode: "authorization",
      httpStatus: 403,
      fallbackUnavailable: true,
    });
  });
});
