-- Additive email-notification preferences and an idempotency key for
-- asynchronous lesson/content notifications. Existing data is preserved.
ALTER TABLE "User"
  ADD COLUMN "contentEmailOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contentEmailOptInAt" TIMESTAMP(3);

ALTER TABLE "EmailLog"
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "EmailLog_dedupeKey_key" ON "EmailLog"("dedupeKey");
