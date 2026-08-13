const mockDb = { $transaction: jest.fn() };

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/env", () => ({
  env: {
    AI_REFLECTION_GLOBAL_DAILY_LIMIT: "1000",
    AI_REFLECTION_FREE_IP_DAILY_LIMIT: "24",
    AI_REFLECTION_INITIATE_IP_DAILY_LIMIT: "72",
  },
}));

import {
  hashReflectionIp,
  reflectionAbuseLimits,
  reflectionSessionPath,
  reserveReflectionUsage,
  utcDayWindow,
} from "@/lib/reflection-abuse";
import type { MembershipEntitlements } from "@/lib/membership";

const entitlements: MembershipEntitlements = {
  plan: null,
  subscriptionActive: false,
  supporterBadge: false,
  dailyLessonAttempt: false,
  dailyPractice: false,
  aiDailyLimit: 3,
  reflectionDailySessions: 1,
  reflectionTurnsPerSession: 3,
  reflectionLifeMode: false,
};

describe("Reflection Companion durable abuse budgets", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rotates keyed network hashes daily and never exposes the source address", () => {
    const dayOne = new Date("2026-08-13T12:00:00Z");
    const dayTwo = new Date("2026-08-14T12:00:00Z");
    const first = hashReflectionIp("203.0.113.10", "unit-secret", dayOne);
    expect(first).toBe(hashReflectionIp("203.0.113.10", "unit-secret", dayOne));
    expect(first).not.toBe(hashReflectionIp("203.0.113.10", "unit-secret", dayTwo));
    expect(first).not.toContain("203.0.113.10");
    expect(utcDayWindow(dayOne)).toEqual({
      start: new Date("2026-08-13T00:00:00Z"),
      end: new Date("2026-08-14T00:00:00Z"),
    });
    expect(reflectionSessionPath("abc")).toBe("/companion/session/abc");
  });

  it("keeps free and paid network limits bounded", () => {
    expect(reflectionAbuseLimits(false)).toEqual({ globalDaily: 1000, ipDaily: 24 });
    expect(reflectionAbuseLimits(true)).toEqual({ globalDaily: 1000, ipDaily: 72 });
  });

  it("rejects at the global budget before changing a user quota", async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      userActivityLog: { count: jest.fn().mockResolvedValue(1000) },
      queryQuota: { findUnique: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
    };
    mockDb.$transaction.mockImplementation(async (work: (value: typeof tx) => unknown) => work(tx));
    await expect(reserveReflectionUsage({
      userId: "u1", ipHash: "hash", conversationId: "c1", mode: "lesson", entitlements,
      now: new Date("2026-08-13T12:00:00Z"),
    })).resolves.toMatchObject({ allowed: false, code: "global_budget" });
    expect(tx.queryQuota.updateMany).not.toHaveBeenCalled();
  });

  it("reserves quota and the first session atomically before a model call", async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      userActivityLog: {
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "log" }),
      },
      queryQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: "q1", usedQueries: 0, periodStart: new Date("2026-08-13T00:00:00Z"), periodEnd: new Date("2026-08-14T00:00:00Z") }),
        upsert: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockDb.$transaction.mockImplementation(async (work: (value: typeof tx) => unknown) => work(tx));
    const result = await reserveReflectionUsage({
      userId: "u1", ipHash: "hash", conversationId: "c1", mode: "lesson", entitlements,
      now: new Date("2026-08-13T12:00:00Z"),
    });
    expect(result).toMatchObject({ allowed: true, used: 1, turn: 1, sessionsUsed: 1 });
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.queryQuota.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ usedQueries: { increment: 1 } }),
    }));
    expect(tx.userActivityLog.create).toHaveBeenCalledTimes(2);
  });
});
