import crypto from "crypto";
import { AgentArtifactStatus, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  DistributionDeliveryClaim,
  DistributionDeliveryStore,
  DistributionStoredDelivery,
} from "@/lib/distribution/runtime";

function artifactFingerprint(deliveryKey: string): string {
  return crypto.createHash("sha256").update(`distribution-delivery|${deliveryKey}`).digest("hex");
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function readStoredDelivery(payload: unknown): DistributionStoredDelivery {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const state = record.state === "IN_FLIGHT" || record.state === "PUBLISHED" || record.state === "AMBIGUOUS"
    ? record.state
    : "AMBIGUOUS";
  return {
    contentFingerprint: typeof record.contentFingerprint === "string" ? record.contentFingerprint : "",
    state,
    attemptedAt: typeof record.attemptedAt === "string" ? record.attemptedAt : "",
    externalId: typeof record.externalId === "string" ? record.externalId : undefined,
    externalUrl: typeof record.externalUrl === "string" || record.externalUrl === null ? record.externalUrl : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
  };
}

export class PrismaDistributionDeliveryStore implements DistributionDeliveryStore {
  async claim(deliveryKey: string, contentFingerprint: string, attemptedAt: string): Promise<DistributionDeliveryClaim> {
    const fingerprint = artifactFingerprint(deliveryKey);
    try {
      await db.agentArtifact.create({
        data: {
          agentName: "distribution-publisher",
          artifactType: "DISTRIBUTION_DELIVERY",
          fingerprint,
          status: AgentArtifactStatus.READY,
          title: "Long-form distribution delivery",
          summary: "Provider delivery state with no credential values.",
          payload: { state: "IN_FLIGHT", contentFingerprint, attemptedAt } satisfies Prisma.InputJsonValue,
          sourceRefs: { deliveryKeyHash: deliveryKey } satisfies Prisma.InputJsonValue,
          riskLevel: "LOW",
        },
        select: { id: true },
      });
      return { status: "CLAIMED" };
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const existing = await db.agentArtifact.findUnique({ where: { fingerprint }, select: { payload: true } });
      if (!existing) throw new Error("Distribution delivery claim conflict could not be reconciled");
      return { status: "EXISTING", delivery: readStoredDelivery(existing.payload) };
    }
  }

  async resolve(deliveryKey: string, delivery: DistributionStoredDelivery): Promise<void> {
    await db.agentArtifact.update({
      where: { fingerprint: artifactFingerprint(deliveryKey) },
      data: {
        status: delivery.state === "PUBLISHED" ? AgentArtifactStatus.ARCHIVED : AgentArtifactStatus.QUARANTINED,
        archivedAt: delivery.state === "PUBLISHED" ? new Date() : null,
        payload: delivery satisfies Prisma.InputJsonValue,
      },
    });
  }
}
