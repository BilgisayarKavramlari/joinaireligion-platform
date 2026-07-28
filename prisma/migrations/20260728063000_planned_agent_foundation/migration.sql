-- Planned growth-agent persistence foundation.
-- Additive only: creates new enum types, tables, indexes, and foreign keys.

CREATE TYPE "AgentArtifactStatus" AS ENUM ('DRAFT', 'READY', 'QUARANTINED', 'ARCHIVED');
CREATE TYPE "ContentWorkflowStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'QUARANTINED', 'REJECTED', 'UNPUBLISHED');
CREATE TYPE "ContentModerationOutcome" AS ENUM ('PASS', 'QUARANTINE', 'REJECT');

CREATE TABLE "ContentItem" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "canonicalTopic" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "difficulty" TEXT,
  "status" "ContentWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceSummary" JSONB,
  "publishabilityDecision" TEXT,
  "aggregateMetrics" JSONB,
  "agentRunId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "unpublishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentVariant" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "seoTitle" TEXT NOT NULL,
  "seoDescription" TEXT NOT NULL,
  "faqBlocks" JSONB,
  "qualityScore" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentSourceSignal" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "locale" TEXT,
  "summary" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentSourceSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentFeedbackMetric" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "locale" TEXT,
  "views" INTEGER NOT NULL DEFAULT 0,
  "uniqueViews" INTEGER NOT NULL DEFAULT 0,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "dislikes" INTEGER NOT NULL DEFAULT 0,
  "dwellSeconds" INTEGER NOT NULL DEFAULT 0,
  "ctaClicks" INTEGER NOT NULL DEFAULT 0,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentFeedbackMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentModerationDecision" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "agentRunId" TEXT,
  "outcome" "ContentModerationOutcome" NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "reasons" JSONB NOT NULL,
  "qualityScores" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentModerationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentArtifact" (
  "id" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "artifactType" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "status" "AgentArtifactStatus" NOT NULL DEFAULT 'DRAFT',
  "locale" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "payload" JSONB NOT NULL,
  "sourceRefs" JSONB,
  "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
  "qualityScore" INTEGER,
  "agentRunId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentItem_fingerprint_key" ON "ContentItem"("fingerprint");
CREATE INDEX "ContentItem_status_createdAt_idx" ON "ContentItem"("status", "createdAt");
CREATE INDEX "ContentItem_category_contentType_createdAt_idx" ON "ContentItem"("category", "contentType", "createdAt");
CREATE INDEX "ContentItem_agentRunId_createdAt_idx" ON "ContentItem"("agentRunId", "createdAt");

CREATE UNIQUE INDEX "ContentVariant_contentItemId_locale_key" ON "ContentVariant"("contentItemId", "locale");
CREATE UNIQUE INDEX "ContentVariant_locale_slug_key" ON "ContentVariant"("locale", "slug");
CREATE INDEX "ContentVariant_locale_createdAt_idx" ON "ContentVariant"("locale", "createdAt");

CREATE INDEX "ContentSourceSignal_contentItemId_createdAt_idx" ON "ContentSourceSignal"("contentItemId", "createdAt");
CREATE INDEX "ContentSourceSignal_sourceType_createdAt_idx" ON "ContentSourceSignal"("sourceType", "createdAt");

CREATE INDEX "ContentFeedbackMetric_contentItemId_recordedAt_idx" ON "ContentFeedbackMetric"("contentItemId", "recordedAt");
CREATE INDEX "ContentFeedbackMetric_locale_recordedAt_idx" ON "ContentFeedbackMetric"("locale", "recordedAt");

CREATE INDEX "ContentModerationDecision_contentItemId_createdAt_idx" ON "ContentModerationDecision"("contentItemId", "createdAt");
CREATE INDEX "ContentModerationDecision_outcome_riskLevel_createdAt_idx" ON "ContentModerationDecision"("outcome", "riskLevel", "createdAt");
CREATE INDEX "ContentModerationDecision_agentRunId_createdAt_idx" ON "ContentModerationDecision"("agentRunId", "createdAt");

CREATE UNIQUE INDEX "AgentArtifact_fingerprint_key" ON "AgentArtifact"("fingerprint");
CREATE INDEX "AgentArtifact_agentName_status_createdAt_idx" ON "AgentArtifact"("agentName", "status", "createdAt");
CREATE INDEX "AgentArtifact_artifactType_createdAt_idx" ON "AgentArtifact"("artifactType", "createdAt");
CREATE INDEX "AgentArtifact_agentRunId_createdAt_idx" ON "AgentArtifact"("agentRunId", "createdAt");

ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentSourceSignal" ADD CONSTRAINT "ContentSourceSignal_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentFeedbackMetric" ADD CONSTRAINT "ContentFeedbackMetric_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentModerationDecision" ADD CONSTRAINT "ContentModerationDecision_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentModerationDecision" ADD CONSTRAINT "ContentModerationDecision_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentArtifact" ADD CONSTRAINT "AgentArtifact_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
