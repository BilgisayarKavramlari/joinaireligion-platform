import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type PersonalizedLessonInput = {
  userId: string;
  stepNumber: number;
  levelRequired: number;
  title: string;
  tradition?: string | null;
  readingText: string;
  practiceDescription: string;
  questions: Prisma.InputJsonValue;
};

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export function normalizeLessonText(value: string): string {
  return value
    .replace(/\\r\\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function lessonGenerationKey(userId: string, stepNumber: number): string {
  return crypto.createHash("sha256").update(`personalized-lesson:v1:${userId}:${stepNumber}`).digest("hex");
}

/**
 * Persist a generated lesson exactly once. Two concurrent generation paths may
 * both call OpenAI, but the database idempotency key guarantees that only one
 * lesson becomes visible to the user.
 */
export async function persistPersonalizedLesson(input: PersonalizedLessonInput) {
  const generationKey = lessonGenerationKey(input.userId, input.stepNumber);
  let lesson;

  try {
    lesson = await db.lesson.create({
      data: {
        generationKey,
        stepNumber: input.stepNumber,
        levelRequired: input.levelRequired,
        title: input.title.trim(),
        tradition: input.tradition?.trim() || null,
        readingText: normalizeLessonText(input.readingText),
        practiceDescription: normalizeLessonText(input.practiceDescription),
        questions: input.questions,
        isTemplate: false,
        forUserId: input.userId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    lesson = await db.lesson.findUnique({ where: { generationKey } });
    if (!lesson) throw error;
  }

  await db.userLesson.upsert({
    where: { userId_lessonId: { userId: input.userId, lessonId: lesson.id } },
    create: { userId: input.userId, lessonId: lesson.id, status: "PENDING" },
    update: {},
  });

  return lesson;
}
