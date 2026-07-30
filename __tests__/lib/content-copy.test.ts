import { CONTENT_COPY, getContentCopy } from "@/lib/content-copy";

describe("content copy localization", () => {
  it("keeps the engagement controls localized in every published content locale", () => {
    expect(Object.keys(CONTENT_COPY)).toEqual(["en", "tr", "es", "de", "fr", "ar", "ru", "zh"]);
    for (const copy of Object.values(CONTENT_COPY)) {
      expect(copy.engagementPrompt.length).toBeGreaterThan(4);
      expect(copy.useful.length).toBeGreaterThan(1);
      expect(copy.notUseful.length).toBeGreaterThan(2);
      expect(copy.beginJourney.length).toBeGreaterThan(3);
    }
  });

  it("returns Arabic content and engagement copy without falling back to English", () => {
    expect(getContentCopy("ar").label).toBe("المكتبة الحية");
    expect(getContentCopy("ar").engagementPrompt).toContain("مفيد");
  });
});
