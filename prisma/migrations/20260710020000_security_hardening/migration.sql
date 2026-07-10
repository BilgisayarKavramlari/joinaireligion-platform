-- Server-side sessions for secure random-token authentication.
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Before adding these unique indexes in production, remove duplicate rows with the queries documented in the deployment notes.
CREATE UNIQUE INDEX IF NOT EXISTS "OnboardingAnswer_userId_questionKey_key" ON "OnboardingAnswer"("userId", "questionKey");
CREATE UNIQUE INDEX IF NOT EXISTS "XpLedger_source_sourceId_key" ON "XpLedger"("source", "sourceId");
