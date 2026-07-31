jest.mock("@/lib/db", () => ({ db: { contentVariant: { findUnique: jest.fn() } } }));

import { discoverVisualCoordinates, socialCardDimensions } from "@/app/social-card/[locale]/[slug]/route";

describe("social card visual presets", () => {
  it.each([
    ["instagram", 1080, 1350],
    ["pinterest", 1000, 1500],
    ["discover", 1200, 675],
  ])("uses the provider-native %s aspect ratio", (preset, width, height) => {
    expect(socialCardDimensions(preset)).toEqual({ width, height });
  });

  it("keeps the square default for existing Open Graph links", () => {
    expect(socialCardDimensions(null)).toEqual({ width: 1200, height: 1200 });
  });

  it("creates deterministic per-article Discover compositions", () => {
    expect(discoverVisualCoordinates("attention-and-meaning")).toEqual(discoverVisualCoordinates("attention-and-meaning"));
    expect(discoverVisualCoordinates("attention-and-meaning")).not.toEqual(discoverVisualCoordinates("responsible-ai"));
  });
});
