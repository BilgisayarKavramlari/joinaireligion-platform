import { contentInlineTokens, contentMarkdownBlocks } from "@/lib/content-markdown";

describe("public content Markdown", () => {
  it("parses headings, quotes, lists, rules, and paragraphs", () => {
    const blocks = contentMarkdownBlocks(`## Heading

> A useful question

- First
- Second

1. Observe
2. Reflect

---

Closing paragraph.`);

    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "Heading" },
      { type: "quote", text: "A useful question" },
      { type: "list", ordered: false, items: ["First", "Second"] },
      { type: "list", ordered: true, items: ["Observe", "Reflect"] },
      { type: "rule" },
      { type: "paragraph", text: "Closing paragraph." },
    ]);
  });

  it("renders only the safe inline subset and leaves unsafe links as text", () => {
    expect(contentInlineTokens("Use **care**, *context*, and [NIST](https://nist.gov)."))
      .toEqual([
        { type: "text", text: "Use " },
        { type: "strong", text: "care" },
        { type: "text", text: ", " },
        { type: "emphasis", text: "context" },
        { type: "text", text: ", and " },
        { type: "link", text: "NIST", href: "https://nist.gov" },
        { type: "text", text: "." },
      ]);
    expect(contentInlineTokens("[unsafe](javascript:alert(1))"))
      .toEqual([{ type: "text", text: "[unsafe](javascript:alert(1))" }]);
  });

  it("normalizes escaped newlines from generated content", () => {
    expect(contentMarkdownBlocks("## Opening\\n\\nFirst paragraph.")).toEqual([
      { type: "heading", level: 2, text: "Opening" },
      { type: "paragraph", text: "First paragraph." },
    ]);
  });
});
