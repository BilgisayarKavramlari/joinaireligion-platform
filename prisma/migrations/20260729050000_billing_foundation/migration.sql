-- Additive billing foundation. No existing column or row is removed.

CREATE TYPE "CreditType" AS ENUM ('AI_QUERY');
CREATE TYPE "CreditPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "CreditLedgerSource" AS ENUM ('PURCHASE', 'CONSUMPTION', 'REVERSAL', 'REFUND', 'CHARGEBACK', 'ADMIN_ADJUSTMENT');

ALTER TABLE "StripeWebhookEvent"
  ADD COLUMN "providerObjectId" TEXT,
  ADD COLUMN "processedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "StripeWebhookEvent"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "StripeWebhookEvent"
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "Subscription"
  ADD COLUMN "planCode" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "providerEventCreatedAt" INTEGER;

CREATE TABLE "CreditBalance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "creditType" "CreditType" NOT NULL,
  "available" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packageCode" TEXT NOT NULL,
  "creditType" "CreditType" NOT NULL DEFAULT 'AI_QUERY',
  "creditAmount" INTEGER NOT NULL,
  "expectedAmountMinor" INTEGER,
  "paidAmountMinor" INTEGER,
  "currency" TEXT,
  "status" "CreditPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "providerCheckoutSessionId" TEXT,
  "providerPaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balanceId" TEXT NOT NULL,
  "creditType" "CreditType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "sourceType" "CreditLedgerSource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeWebhookEvent_eventType_providerObjectId_idx"
  ON "StripeWebhookEvent"("eventType", "providerObjectId");

CREATE UNIQUE INDEX "CreditBalance_userId_creditType_key"
  ON "CreditBalance"("userId", "creditType");
CREATE INDEX "CreditBalance_creditType_available_idx"
  ON "CreditBalance"("creditType", "available");

CREATE UNIQUE INDEX "CreditPurchase_providerCheckoutSessionId_key"
  ON "CreditPurchase"("providerCheckoutSessionId");
CREATE UNIQUE INDEX "CreditPurchase_providerPaymentIntentId_key"
  ON "CreditPurchase"("providerPaymentIntentId");
CREATE INDEX "CreditPurchase_userId_createdAt_idx"
  ON "CreditPurchase"("userId", "createdAt");
CREATE INDEX "CreditPurchase_status_createdAt_idx"
  ON "CreditPurchase"("status", "createdAt");

CREATE UNIQUE INDEX "CreditLedger_creditType_sourceType_sourceId_key"
  ON "CreditLedger"("creditType", "sourceType", "sourceId");
CREATE INDEX "CreditLedger_userId_createdAt_idx"
  ON "CreditLedger"("userId", "createdAt");
CREATE INDEX "CreditLedger_balanceId_createdAt_idx"
  ON "CreditLedger"("balanceId", "createdAt");

ALTER TABLE "CreditBalance"
  ADD CONSTRAINT "CreditBalance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditPurchase"
  ADD CONSTRAINT "CreditPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_balanceId_fkey"
  FOREIGN KEY ("balanceId") REFERENCES "CreditBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
