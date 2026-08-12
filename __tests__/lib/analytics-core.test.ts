import {
  aggregateTrafficRows,
  buildAttributedUrl,
  classifyTrafficSource,
  dailySessionHash,
  sanitizeAnalyticsPath,
  selectMeasuredLocale,
} from "@/lib/analytics/core";

describe("privacy-preserving first-party analytics", () => {
  const from = new Date("2026-08-10T00:00:00.000Z");
  const to = new Date("2026-08-11T00:00:00.000Z");

  it("uses a daily keyed hash and does not create a cross-day visitor id", () => {
    const id = "9a1b2c3d-4e5f-6789-abcd-0123456789ab";
    const first = dailySessionHash(id, from, "server-secret");
    const sameDay = dailySessionHash(id, new Date("2026-08-10T20:00:00.000Z"), "server-secret");
    const nextDay = dailySessionHash(id, to, "server-secret");
    expect(first).toBe(sameDay);
    expect(nextDay).not.toBe(first);
    expect(dailySessionHash(id, from, undefined)).toBeNull();
  });

  it("strips query strings and maps common social referrers", () => {
    expect(sanitizeAnalyticsPath("/content/en/example?private=value#section")).toBe("/content/en/example");
    expect(classifyTrafficSource({ referrerHost: "l.instagram.com" })).toBe("instagram");
    expect(classifyTrafficSource({ utmSource: "Bluesky", referrerHost: "example.org" })).toBe("bluesky");
  });

  it("aggregates sessions, landings, sources and thresholded country groups", () => {
    const rows = [
      { eventName: "analytics_page_view", anonymousSessionId: "a", path: "/content/en/one", metadata: { source: "instagram", country: "US", locale: "en" }, createdAt: new Date("2026-08-10T01:00:00Z") },
      { eventName: "analytics_page_view", anonymousSessionId: "a", path: "/register", metadata: { source: "instagram", country: "US", locale: "en" }, createdAt: new Date("2026-08-10T01:01:00Z") },
      { eventName: "analytics_link_click", anonymousSessionId: "a", path: "/content/en/one", metadata: { targetPath: "/register" }, createdAt: new Date("2026-08-10T01:00:30Z") },
      { eventName: "analytics_page_view", anonymousSessionId: "b", path: "/content/tr/two", metadata: { source: "direct", country: "TR", locale: "tr" }, createdAt: new Date("2026-08-10T02:00:00Z") },
    ];
    const summary = aggregateTrafficRows(rows, from, to, { countryMinimum: 2 });
    expect(summary).toMatchObject({ pageViews: 3, sessions: 2, linkClicks: 1, registrationClicks: 1, containsUserLevelData: false });
    expect(summary.topLandingPages).toEqual(expect.arrayContaining([{ label: "/content/en/one", count: 1 }]));
    expect(summary.topCountries).toEqual([]);
  });

  it("keeps the configured locale policy until a strong minimum sample exists", () => {
    expect(selectMeasuredLocale({ sourceByLocale: [{ source: "instagram", locale: "en", sessions: 12 }] }, "instagram", ["en", "tr"])).toBeNull();
    expect(selectMeasuredLocale({ sourceByLocale: [
      { source: "instagram", locale: "en", sessions: 30 },
      { source: "instagram", locale: "tr", sessions: 8 },
    ] }, "instagram", ["en", "tr"])).toBe("en");
  });

  it("adds only minimized source, medium and campaign labels", () => {
    const url = new URL(buildAttributedUrl("https://joinaireligion.com/content/en/example", "instagram", "organic_reflection_2026-08-11"));
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("organic_reflection_2026-08-11");
    expect(url.searchParams.has("utm_term")).toBe(false);
  });

  it("keeps deployment probes out of real visitor totals", () => {
    const summary = aggregateTrafficRows([{
      eventName: "analytics_page_view",
      anonymousSessionId: "probe",
      path: "/updates",
      metadata: { source: "deployment_verification", locale: "en" },
      createdAt: new Date("2026-08-10T03:00:00Z"),
    }], from, to);
    expect(summary).toMatchObject({ sessions: 0, pageViews: 0, excludedVerificationEvents: 1 });
  });

  it("does not report missing country data as a country group", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      eventName: "analytics_page_view",
      anonymousSessionId: `countryless-${index}`,
      path: "/",
      metadata: { source: "direct", locale: "en" },
      createdAt: new Date(`2026-08-10T0${index + 1}:00:00Z`),
    }));
    const summary = aggregateTrafficRows(rows, from, to);
    expect(summary.sessions).toBe(5);
    expect(summary.topCountries).toEqual([]);
  });
});
