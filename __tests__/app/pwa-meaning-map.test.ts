import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("privacy-safe PWA and Meaning Map", () => {
  it("ships an installable public shell without caching private routes", () => {
    const manifest = readFileSync(join(process.cwd(), "src/app/manifest.ts"), "utf8");
    const worker = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain("icon-maskable-512.png");
    expect(worker).toContain('pathname.startsWith("/account")');
    expect(worker).toContain('pathname.startsWith("/api/")');
    expect(worker).toContain("OFFLINE_URL");
  });

  it("never sends Meaning Map answers or results to the event endpoint or share URL", () => {
    const experience = readFileSync(join(process.cwd(), "src/components/meaning-map/MeaningMapExperience.tsx"), "utf8");
    const endpoint = readFileSync(join(process.cwd(), "src/app/api/meaning-map/events/route.ts"), "utf8");
    expect(experience).toContain('body: JSON.stringify({ event, locale })');
    expect(experience).toContain("https://joinaireligion.com/meaning-map?invite=1");
    expect(endpoint).toContain("no_answers_no_result_no_session_no_ip");
    expect(endpoint).not.toContain("anonymousSessionId");
    expect(endpoint).not.toContain("ipHash");
    expect(endpoint).not.toContain("userAgent");
  });

  it("includes all eight platform locales", () => {
    const experience = readFileSync(join(process.cwd(), "src/components/meaning-map/MeaningMapExperience.tsx"), "utf8");
    for (const locale of ["en", "tr", "es", "de", "fr", "ar", "ru", "zh"]) expect(experience).toContain(`${locale}:`);
  });
});
