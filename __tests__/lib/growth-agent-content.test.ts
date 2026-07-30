import {
  SUPPORTED_CONTENT_LOCALES,
  assessContentVariants,
  buildFallbackVariant,
  sha256Fingerprint,
  slugify,
  shouldAutoUnpublish,
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
    expect(SUPPORTED_CONTENT_LOCALES).toEqual(["en", "tr", "es", "de", "fr", "ru", "zh"]);
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

  it("applies the deterministic risk gate to Russian and Simplified Chinese", () => {
    const russian = SUPPORTED_CONTENT_LOCALES.map(buildFallbackVariant);
    const russianIndex = SUPPORTED_CONTENT_LOCALES.indexOf("ru");
    russian[russianIndex] = { ...russian[russianIndex], bodyMarkdown: `${russian[russianIndex].bodyMarkdown} гарантированное просветление` };
    expect(assessContentVariants(russian).outcome).toBe("REJECT");

    const chinese = SUPPORTED_CONTENT_LOCALES.map(buildFallbackVariant);
    const chineseIndex = SUPPORTED_CONTENT_LOCALES.indexOf("zh");
    chinese[chineseIndex] = { ...chinese[chineseIndex], bodyMarkdown: `${chinese[chineseIndex].bodyMarkdown} 保证开悟` };
    expect(assessContentVariants(chinese).outcome).toBe("REJECT");
  });

  it("preserves Cyrillic and Han characters in localized slugs", () => {
    expect(slugify("Практика внимания")).toBe("практика-внимания");
    expect(slugify("日常意义练习")).toBe("日常意义练习");
  });

  it("uses equivalent completeness floors for concise Han-script content", () => {
    const variants = SUPPORTED_CONTENT_LOCALES.map((locale) => ({
      ...buildFallbackVariant(locale),
      source: "openai" as const,
    }));
    const chineseIndex = SUPPORTED_CONTENT_LOCALES.indexOf("zh");
    variants[chineseIndex] = {
      ...variants[chineseIndex],
      title: "以尊重与好奇心接近陌生传统",
      summary: "这是一篇关于跨文化学习、尊重边界与反思性好奇心的教育性文章。",
      bodyMarkdown: `## 保持好奇与谦逊\n\n${"在接触不熟悉的传统时，可以先观察、提问并承认自己的理解有限。".repeat(16)}`,
      seoTitle: "以尊重的好奇心探索不同传统",
      seoDescription: "学习如何以尊重、谦逊和反思性的方式接触不熟悉的文化与传统，同时避免刻板印象。",
    };

    const gate = assessContentVariants(variants);
    expect(gate.localeScores.zh).toBe(100);
    expect(gate.reasons).not.toContain("quality_below_threshold:zh");
    expect(gate.outcome).toBe("PASS");
  });

  it("only auto-unpublishes after a meaningful sample and strong negative signal", () => {
    expect(shouldAutoUnpublish({ views: 99, uniqueViews: 99, likes: 0, dislikes: 40 })).toBe(false);
    expect(shouldAutoUnpublish({ views: 100, uniqueViews: 100, likes: 20, dislikes: 34 })).toBe(false);
    expect(shouldAutoUnpublish({ views: 100, uniqueViews: 100, likes: 5, dislikes: 40 })).toBe(true);
  });
});
