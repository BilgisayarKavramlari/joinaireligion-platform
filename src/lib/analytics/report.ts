import { db } from "@/lib/db";
import { aggregateTrafficRows, type TrafficSummary } from "@/lib/analytics/core";

const MAX_ANALYTICS_ROWS = 100_000;

export async function getTrafficSummary(from: Date, to = new Date()): Promise<TrafficSummary> {
  const rows = await db.userActivityLog.findMany({
    where: {
      eventType: "SYSTEM",
      eventName: { startsWith: "analytics_" },
      createdAt: { gte: from, lt: to },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_ANALYTICS_ROWS + 1,
    select: {
      eventName: true,
      anonymousSessionId: true,
      path: true,
      metadata: true,
      createdAt: true,
    },
  });
  const sampled = rows.length > MAX_ANALYTICS_ROWS;
  return aggregateTrafficRows(rows.slice(0, MAX_ANALYTICS_ROWS), from, to, { sampled });
}

export async function deleteExpiredAnalyticsEvents(now = new Date(), retentionDays = 90): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const result = await db.userActivityLog.deleteMany({
    where: {
      eventType: "SYSTEM",
      eventName: { startsWith: "analytics_" },
      createdAt: { lt: cutoff },
    },
  });
  return result.count;
}
