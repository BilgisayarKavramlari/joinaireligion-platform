import { lessonCountdownParts } from "@/components/lessons/LessonQuotaCountdown";

describe("lesson quota countdown", () => {
  test("splits a weekly-style duration into stable countdown parts", () => {
    expect(lessonCountdownParts(6 * 86_400_000 + 5 * 3_600_000 + 4 * 60_000 + 3_000)).toEqual({
      days: 6,
      hours: 5,
      minutes: 4,
      seconds: 3,
    });
  });

  test("rounds partial seconds up and never returns negative values", () => {
    expect(lessonCountdownParts(1)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
    expect(lessonCountdownParts(-1_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
