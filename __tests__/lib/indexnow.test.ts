import { INDEXNOW_KEY, submitIndexNowUrls } from "@/lib/indexnow";

describe("IndexNow publishing", () => {
  afterEach(() => jest.restoreAllMocks());

  test("submits only canonical Join AI Religion URLs", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    const result = await submitIndexNowUrls([
      "https://joinaireligion.com/content/en/example",
      "https://joinaireligion.com/content/en/example",
      "https://example.com/not-owned",
    ]);

    expect(result).toEqual({ submitted: 1, accepted: true, status: 202 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.key).toBe(INDEXNOW_KEY);
    expect(payload.keyLocation).toBe(`https://joinaireligion.com/${INDEXNOW_KEY}.txt`);
    expect(payload.urlList).toEqual(["https://joinaireligion.com/content/en/example"]);
  });

  test("does not call IndexNow when no owned URL is provided", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    await expect(submitIndexNowUrls(["https://example.com/no"])).resolves.toEqual({
      submitted: 0,
      accepted: false,
      status: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
