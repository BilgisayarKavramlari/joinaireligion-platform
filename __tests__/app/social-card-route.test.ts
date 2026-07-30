jest.mock("@/lib/db", () => ({ db: { contentVariant: { findUnique: jest.fn() } } }));

import { socialCardDimensions } from "@/app/social-card/[locale]/[slug]/route";

describe("social card visual presets", () => {
  it.each([
    ["instagram", 1080, 1350],
    ["pinterest", 1000, 1500],
  ])("uses the provider-native %s aspect ratio", (preset, width, height) => {
    expect(socialCardDimensions(preset)).toEqual({ width, height });
  });

  it("keeps the square default for existing Open Graph links", () => {
    expect(socialCardDimensions(null)).toEqual({ width: 1200, height: 1200 });
  });
});
