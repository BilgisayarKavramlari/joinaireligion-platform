const mockEnforceLearningAccess = jest.fn();
const mockLessonFindUnique = jest.fn();
const mockUserLessonFindUnique = jest.fn();
const mockAttemptFindFirst = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock("@/lib/access", () => ({ enforceLearningAccess: () => mockEnforceLearningAccess() }));
jest.mock("@/lib/membership", () => ({ resolveEntitlements: () => ({ dailyLessonAttempt: true }) }));
jest.mock("@/lib/db", () => ({
  db: {
    lesson: { findUnique: (...args: unknown[]) => mockLessonFindUnique(...args) },
    userLesson: { findUnique: (...args: unknown[]) => mockUserLessonFindUnique(...args) },
    lessonAttempt: { findFirst: (...args: unknown[]) => mockAttemptFindFirst(...args) },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  },
}));

import { GET } from "@/app/api/lessons/[id]/route";

describe("lesson quota status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnforceLearningAccess.mockResolvedValue({ ok: true, user: { id: "user_1" } });
    mockLessonFindUnique.mockResolvedValue({
      id: "lesson_1",
      stepNumber: 2,
      title: "Stillness",
      tradition: null,
      readingText: "Read",
      practiceDescription: "Practice",
      questions: [],
    });
    mockUserLessonFindUnique.mockResolvedValue({ id: "ul_1", status: "IN_PROGRESS", xpEarned: 0 });
    mockAttemptFindFirst.mockResolvedValue(null);
  });

  test("uses the stored rolling period end as the authoritative countdown target", async () => {
    const periodEnd = new Date(Date.now() + 19 * 60 * 60_000);
    mockUserFindUnique.mockResolvedValue({
      subscription: { status: "ACTIVE", planCode: "initiate" },
      lessonQuota: { usedAttempts: 1, maxAttempts: 1, periodEnd },
    });

    const response = await GET(new Request("https://example.com/api/lessons/lesson_1"), {
      params: Promise.resolve({ id: "lesson_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quota.canSubmit).toBe(false);
    expect(body.quota.nextAvailableAt).toBe(periodEnd.toISOString());
  });
});
