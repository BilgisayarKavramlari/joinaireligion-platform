-- Additive-only private journey planner foundation.
CREATE TYPE "PersonalActivityType" AS ENUM (
  'MEDITATION', 'YOGA', 'READING', 'LESSON',
  'PRACTICE', 'JOURNAL', 'REFLECTION', 'OTHER'
);

CREATE TYPE "PersonalPlanStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED', 'CANCELLED');

CREATE TABLE "PersonalPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "activityType" "PersonalActivityType" NOT NULL,
  "status" "PersonalPlanStatus" NOT NULL DEFAULT 'PLANNED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "durationMins" INTEGER,
  "encryptedPayload" TEXT NOT NULL,
  "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivateNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
  "aiAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivateNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalPlan_userId_scheduledFor_idx" ON "PersonalPlan"("userId", "scheduledFor");
CREATE INDEX "PersonalPlan_userId_status_scheduledFor_idx" ON "PersonalPlan"("userId", "status", "scheduledFor");
CREATE INDEX "PrivateNote_userId_updatedAt_idx" ON "PrivateNote"("userId", "updatedAt");
CREATE INDEX "PrivateNote_expiresAt_idx" ON "PrivateNote"("expiresAt");

ALTER TABLE "PersonalPlan" ADD CONSTRAINT "PersonalPlan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivateNote" ADD CONSTRAINT "PrivateNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
