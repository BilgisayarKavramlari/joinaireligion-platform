jest.mock("@/lib/db", () => ({ db: {} }));

import { assessContentVariants, SUPPORTED_CONTENT_LOCALES } from "@/lib/growth-agents/content";
import { reflectionLaunchVariants } from "@/lib/reflection-launch";

describe("Reflection Companion launch campaign", () => {
  it("builds one complete, safe, deterministic owner-authored variant per supported locale", () => {
    const first = reflectionLaunchVariants();
    const second = reflectionLaunchVariants();
    expect(first).toEqual(second);
    expect(first.map((variant) => variant.locale)).toEqual([...SUPPORTED_CONTENT_LOCALES]);
    expect(new Set(first.map((variant) => variant.slug)).size).toBe(8);
    expect(first.every((variant) => variant.source === "owner")).toBe(true);
    expect(first.every((variant) => variant.bodyMarkdown.includes("utm_campaign=reflection_companion_launch"))).toBe(true);
    expect(first.every((variant) => variant.faqBlocks.length >= 3)).toBe(true);

    const gate = assessContentVariants(first);
    expect(gate.outcome).toBe("PASS");
    expect(gate.riskLevel).toBe("LOW");
    expect(gate.qualityScore).toBeGreaterThanOrEqual(90);
  });
});
