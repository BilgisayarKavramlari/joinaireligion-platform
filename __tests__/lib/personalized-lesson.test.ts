const mockLessonCreate = jest.fn();
const mockLessonFindUnique = jest.fn();
const mockUserLessonUpsert = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    lesson: {
      create: (...args: unknown[]) => mockLessonCreate(...args),
      findUnique: (...args: unknown[]) => mockLessonFindUnique(...args),
    },
    userLesson: { upsert: (...args: unknown[]) => mockUserLessonUpsert(...args) },
  },
}));

import { lessonGenerationKey, normalizeLessonText, persistPersonalizedLesson } from "@/lib/lessons/personalized";

const input = {
  userId: "user-1",
  stepNumber: 2,
  levelRequired: 1,
  title: "  A New Step  ",
  tradition: null,
  readingText: "Opening\\n\\nA paragraph.  ",
  practiceDescription: "Phase one.\\nPhase two.",
  questions: [{ id: "q1", text: "What changed?", type: "reflection" }],
};

describe("personalized lesson persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserLessonUpsert.mockResolvedValue({});
  });

  it("normalizes model text and uses a non-identifying stable key", async () => {
    mockLessonCreate.mockImplementation(async ({ data }) => ({ id: "lesson-new", ...data }));

    const lesson = await persistPersonalizedLesson(input);

    expect(lesson.id).toBe("lesson-new");
    expect(mockLessonCreate.mock.calls[0][0].data).toMatchObject({
      generationKey: lessonGenerationKey("user-1", 2),
      title: "A New Step",
      readingText: "Opening\n\nA paragraph.",
      practiceDescription: "Phase one.\nPhase two.",
    });
    expect(lessonGenerationKey("user-1", 2)).not.toContain("user-1");
    expect(mockUserLessonUpsert).toHaveBeenCalledTimes(1);
  });

  it("reuses the winning lesson when concurrent creation hits the unique key", async () => {
    mockLessonCreate.mockRejectedValue({ code: "P2002" });
    mockLessonFindUnique.mockResolvedValue({ id: "lesson-existing", generationKey: lessonGenerationKey("user-1", 2) });

    const lesson = await persistPersonalizedLesson(input);

    expect(lesson.id).toBe("lesson-existing");
    expect(mockUserLessonUpsert.mock.calls[0][0].where.userId_lessonId).toEqual({ userId: "user-1", lessonId: "lesson-existing" });
  });

  it("converts escaped model line breaks without changing content", () => {
    expect(normalizeLessonText("One\\nTwo\\r\\nThree")).toBe("One\nTwo\nThree");
  });
});
