const mockUseLanguage = jest.fn();
const mockContentFindMany = jest.fn();

jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: mockUseLanguage,
}));

jest.mock("@/lib/db", () => ({
  db: { contentItem: { findMany: mockContentFindMany } },
}));

import UpdatesContent from "@/components/updates/UpdatesContent";
import sitemap from "@/app/sitemap";
import { publicUpdates, resolvePublicUpdateLocale } from "@/lib/public-updates";

function extractText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return extractText(props?.children);
  }
  return "";
}

describe("public product updates", () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({ lang: "en" });
    mockContentFindMany.mockResolvedValue([]);
  });

  test("keeps unique semantic versions and complete English/Turkish copy", () => {
    const versions = publicUpdates.map((update) => update.version);
    expect(new Set(versions).size).toBe(versions.length);

    for (const update of publicUpdates) {
      expect(update.version).toMatch(/^v\d+\.\d+\.\d+$/);
      for (const locale of ["en", "tr"] as const) {
        expect(update.copy[locale].title).toBeTruthy();
        expect(update.copy[locale].summary).toBeTruthy();
        expect(update.copy[locale].highlights.length).toBeGreaterThan(0);
      }
      if (update.status === "released") expect(update.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (update.status === "planned") expect(update.targetWindow).toBeDefined();
    }
  });

  test("uses Turkish only when selected and falls back to English", () => {
    expect(resolvePublicUpdateLocale("tr")).toBe("tr");
    expect(resolvePublicUpdateLocale("de")).toBe("en");
  });

  test("renders the open-distribution release after production verification", () => {
    mockUseLanguage.mockReturnValue({ lang: "tr" });
    const text = extractText(UpdatesContent()).replace(/\s+/g, " ").trim();

    expect(text).toContain("Güncellemeler");
    expect(text).toContain("v0.2.1");
    expect(text).toContain("v0.2.0");
    expect(text).toContain("canlı geri sayım");
    expect(text).toContain("Yayınlandı");
    expect(text).toContain("v0.3.2");
    expect(text).not.toContain("Planlandı");
    expect(publicUpdates.find((update) => update.version === "v0.3.2")).toMatchObject({
      status: "released",
      releasedAt: "2026-08-11",
    });
  });

  test("includes the canonical Updates route in the sitemap", async () => {
    const entries = await sitemap();
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: "https://joinaireligion.com/updates" }),
    ]));
  });
});
