import { boundedText, expiryFromRetentionDays, parseActivityType, parseDuration, parseTags } from "@/lib/journey-planner";

describe("journey planner validation", () => {
  it("accepts bounded plan and note values", () => {
    expect(boundedText("  Meditation  ", 120, true)).toBe("Meditation");
    expect(parseActivityType("MEDITATION")).toBe("MEDITATION");
    expect(parseDuration("30")).toBe(30);
    expect(parseTags([" reflection ", "reflection", "weekly"])).toEqual(["reflection", "weekly"]);
  });

  it("rejects invalid activity, duration, and retention values", () => {
    expect(() => parseActivityType("THERAPY")).toThrow("VALIDATION_ERROR");
    expect(() => parseDuration(0)).toThrow("VALIDATION_ERROR");
    expect(() => expiryFromRetentionDays(7)).toThrow("VALIDATION_ERROR");
  });

  it("supports explicit private-note retention choices", () => {
    const now = new Date("2026-07-30T00:00:00.000Z");
    expect(expiryFromRetentionDays(null, now)).toBeNull();
    expect(expiryFromRetentionDays(30, now)?.toISOString()).toBe("2026-08-29T00:00:00.000Z");
  });
});
