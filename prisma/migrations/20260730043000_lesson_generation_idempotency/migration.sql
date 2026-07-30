-- Additive idempotency key for personalized lesson generation. Existing
-- lessons, including historical duplicates, remain untouched because NULL is
-- allowed and PostgreSQL unique indexes permit multiple NULL values.
ALTER TABLE "Lesson" ADD COLUMN "generationKey" TEXT;

CREATE UNIQUE INDEX "Lesson_generationKey_key" ON "Lesson"("generationKey");
