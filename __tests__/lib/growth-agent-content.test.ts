import {
  SUPPORTED_CONTENT_LOCALES,
  assessContentVariants,
  buildFallbackVariant,
  sha256Fingerprint,
  sixHourBucket,
  utcDateKey,
} from "@/lib/growth-agents/content";

describe("growth agent content safety", () => {
  it("creates stable date and bucket fingerprints", () => {
    const now = new Date("2026-07-28T07:42:00.000Z");
    expect(utcDateKey(now)).toBe("2026-07-28");
    expect(sixHourBucket(now)).toBe("2026-07-28T06");
    expect(sha256Fingerprint(["agent", "day"])).toBe(sha256Fingerprint(["agent", "day"]));
    expect(sha256Fingerprint(["agent", "day"])).not.toBe(sha256Fingerprint(["agent", "other"]));
  });

  it("quarantines fallback drafts and preserves all supported locales", () => {
    const variants = SUPPORTED_CONTENT_LOCALES.map(buildFallbackVariant);
    const gate = assessContentVariants(variants);

    expect(variants.map((variant) => variant.locale)).toEqual([...SUPPORTED_CONTENT_LOCALES]);
    expect(gate.status).toBe("QUARANTINED");
    expect(gate.outcome).toBe("QUARANTINE");
    expect(gate.reasons).toContain("ai_generation_fallback");
  });

  it("rejects prohibited high-risk claims", () => {
    const variants = SUPPORTED_CONTENT_LOCALES.map(buildFallbackVariant);
    variants[0] = { ...variants[0], bodyMarkdown: `${variants[0].bodyMarkdown} guaranteed enlightenment` };
    const gate = assessContentVariants(variants);

    expect(gate.status).toBe("REJECTED");
    expect(gate.outcome).toBe("REJECT");
    expect(gate.riskLevel).toBe("HIGH");
  });

  it("applies the deterministic risk gate to non-English variants", () => {
    const variants = SUPPORTED_CONTENT_LOCALES.map(buildFallbackVariant);
    variants[1] = { ...variants[1], bodyMarkdown: `${variants[1].bodyMarkdown} garantili aydınlanma` };

    expect(assessContentVariants(variants).outcome).toBe("REJECT");
  });
});
