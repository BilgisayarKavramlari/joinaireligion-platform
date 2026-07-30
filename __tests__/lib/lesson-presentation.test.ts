import { dedupeUserLessonsByStep } from "@/lib/lessons/dedupe";
import { lessonTextBlocks } from "@/lib/lessons/text-format";

describe("lesson presentation safeguards", () => {
  it("shows one canonical lesson per step without deleting stored records", () => {
    const lessons = [
      { id: "new-pending", status: "PENDING", createdAt: new Date("2026-07-29T10:00:10Z"), lesson: { stepNumber: 2 } },
      { id: "old-pending", status: "PENDING", createdAt: new Date("2026-07-29T10:00:00Z"), lesson: { stepNumber: 2 } },
      { id: "step-one", status: "COMPLETED", createdAt: new Date("2026-07-28T10:00:00Z"), lesson: { stepNumber: 1 } },
    ];

    expect(dedupeUserLessonsByStep(lessons).map((item) => item.id)).toEqual(["step-one", "old-pending"]);
    expect(lessons).toHaveLength(3);
  });

  it("prefers the furthest-progressed duplicate", () => {
    const lessons = [
      { id: "pending", status: "PENDING", createdAt: "2026-07-29T10:00:00Z", lesson: { stepNumber: 2 } },
      { id: "completed", status: "COMPLETED", createdAt: "2026-07-29T10:00:10Z", lesson: { stepNumber: 2 } },
    ];

    expect(dedupeUserLessonsByStep(lessons)[0].id).toBe("completed");
  });

  it("parses literal newlines, bold headings, lists, and readable paragraphs", () => {
    const blocks = lessonTextBlocks("**Opening**\\nFirst paragraph.\\n- Notice the breath\\n**Phase 2** Next paragraph.");

    expect(blocks).toEqual([
      { type: "heading", text: "Opening" },
      { type: "paragraph", text: "First paragraph." },
      { type: "list-item", text: "Notice the breath", ordered: false },
      { type: "heading", text: "Phase 2" },
      { type: "paragraph", text: "Next paragraph." },
    ]);
  });

  it("breaks a generated single-line lesson at bold section boundaries", () => {
    const blocks = lessonTextBlocks("**Opening** Begin here. **Phase 2: Inquiry** Continue gently.");
    expect(blocks.map((block) => `${block.type}:${block.text}`)).toEqual([
      "heading:Opening",
      "paragraph:Begin here.",
      "heading:Phase 2: Inquiry",
      "paragraph:Continue gently.",
    ]);
  });
});
