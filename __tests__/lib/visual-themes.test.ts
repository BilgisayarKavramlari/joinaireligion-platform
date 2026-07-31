import { isVisualTheme, resolveVisualTheme, VISUAL_THEMES } from "@/lib/visual-themes";

describe("visual themes", () => {
  it("keeps the supported theme ids stable", () => {
    expect(VISUAL_THEMES.map((theme) => theme.id)).toEqual(["cosmos", "aurora", "ocean", "ember"]);
  });

  it("falls back safely when persisted data is invalid", () => {
    expect(resolveVisualTheme("ocean")).toBe("ocean");
    expect(resolveVisualTheme("unknown")).toBe("cosmos");
    expect(isVisualTheme(null)).toBe(false);
  });
});
