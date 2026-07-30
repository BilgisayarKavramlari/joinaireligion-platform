import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("public shell ownership", () => {
  it("renders the public header only from the root layout", () => {
    const rootLayout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    const contentIndex = readFileSync(join(process.cwd(), "src/app/content/page.tsx"), "utf8");
    const contentDetail = readFileSync(join(process.cwd(), "src/app/content/[locale]/[slug]/page.tsx"), "utf8");

    expect(rootLayout).toContain("<PublicHeader />");
    expect(contentIndex).not.toContain("PublicHeader");
    expect(contentDetail).not.toContain("PublicHeader");
  });
});
