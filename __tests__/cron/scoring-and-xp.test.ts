/**
 * Tests for:
 *   - src/lib/cron/response-scorer.ts  (pure functions)
 *   - src/lib/cron/xp-service.ts       (DB service, mocked)
 *
 * Coverage (per task spec):
 *   1. Score range 0–5
 *   2. XP ledger append-only behaviour
 *   3. No duplicate XP award
 *   4. Level-up at 300 XP
 *   5. Max level 10
 *   6. xpForScoreValue mapping (XP = score * 1)
 *   7. computeLevel formula
 *   8. scoreResponse heuristics (empty, spam, length bands)
 *   9. awardXp zero-amount skipping
 *  10. awardXp level-up detection and UserJourneyState update
 *
 * NOTE: Jest is not yet installed.
 * Run `npm install --save-dev jest ts-jest @types/jest` and add jest.config.ts.
 */

// ─── Pure-function imports (no mocking needed) ────────────────────────────────

import {
  scoreResponse,
  xpForScoreValue,
  computeLevel,
  XP_PER_LEVEL,
  MAX_LEVEL,
  MAX_SCORE,
} from "@/lib/cron/response-scorer";

// ─── Mocks for xp-service tests ───────────────────────────────────────────────

const mockXpLedgerFindFirst = jest.fn();
const mockXpLedgerCreate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockJourneyStateUpsert = jest.fn();

const mockDb = {
  xpLedger: {
    findFirst: (...args: unknown[]) => mockXpLedgerFindFirst(...args),
    create: (...args: unknown[]) => mockXpLedgerCreate(...args),
  },
  user: {
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
  },
  userJourneyState: {
    upsert: (...args: unknown[]) => mockJourneyStateUpsert(...args),
  },
} as unknown as import("@prisma/client").PrismaClient;

import { awardXp } from "@/lib/cron/xp-service";
import { XpSource } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function repeat(char: string, n: number) {
  return char.repeat(n);
}

function words(n: number, word = "reflection") {
  return Array.from({ length: n }, () => word).join(" ");
}

function uniqueWords(n: number) {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default stubs
  mockXpLedgerFindFirst.mockResolvedValue(null); // no prior entry
  mockXpLedgerCreate.mockResolvedValue({ id: "ledger_001" });
  mockUserFindUnique.mockResolvedValue({ xpTotal: 0, currentLevel: 1 });
  mockUserUpdate.mockResolvedValue({});
  mockJourneyStateUpsert.mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════════════════════
// scoreResponse — heuristics
// ═══════════════════════════════════════════════════════════════════════════════

describe("scoreResponse — score range", () => {
  it("always returns a score in 0–5", () => {
    const inputs = [
      "",
      "a",
      "aaaaaaaaaaaaaaaaaaa",
      "Short.",
      uniqueWords(20),
      uniqueWords(50),
      uniqueWords(100),
      uniqueWords(200),
    ];
    for (const input of inputs) {
      const { score } = scoreResponse(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(MAX_SCORE);
    }
  });

  it("returns 0 for empty string", () => {
    expect(scoreResponse("").score).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(scoreResponse("   \n\t  ").score).toBe(0);
  });

  it("returns 0 for clearly repeated-char spam", () => {
    expect(scoreResponse(repeat("a", 20)).score).toBe(0);
  });

  it("returns 0 for single placeholder word", () => {
    expect(scoreResponse("test").score).toBe(0);
    expect(scoreResponse("ok").score).toBe(0);
    expect(scoreResponse("done").score).toBe(0);
  });

  it("returns 1 for a genuine but very short response (1–19 chars)", () => {
    expect(scoreResponse("good practice").score).toBe(1);
    expect(scoreResponse("I felt calm.").score).toBe(1);
  });

  it("returns 2 for a short response (20–79 chars)", () => {
    // ~40 chars
    const text = "I noticed my mind calming after five minutes.";
    expect(text.length).toBeGreaterThanOrEqual(20);
    expect(text.length).toBeLessThan(80);
    expect(scoreResponse(text).score).toBe(2);
  });

  it("returns 3 for a medium response (80–249 chars)", () => {
    // ~120 chars of varied text
    const text = uniqueWords(25); // 25 * ~6 chars = ~150 chars
    expect(text.length).toBeGreaterThanOrEqual(80);
    expect(text.length).toBeLessThan(250);
    expect(scoreResponse(text).score).toBe(3);
  });

  it("returns 4 for a long response (250–599 chars)", () => {
    const text = uniqueWords(60); // ~360 chars
    expect(text.length).toBeGreaterThanOrEqual(250);
    expect(text.length).toBeLessThan(600);
    expect(scoreResponse(text).score).toBe(4);
  });

  it("returns 5 for a strong 600+ char response with varied vocabulary", () => {
    const text = uniqueWords(120); // ~720 chars
    expect(text.length).toBeGreaterThanOrEqual(600);
    expect(scoreResponse(text).score).toBe(5);
  });

  it("returns 3 (repetitive_long) for 600+ chars with very low unique-word ratio", () => {
    // "word0 word0 word0…" — same word repeated → ratio ≈ 1/n → close to 0
    const text = "word0 ".repeat(150).trimEnd(); // ~900 chars, near-zero unique ratio
    const result = scoreResponse(text);
    expect(result.score).toBe(3);
    expect(result.reason).toBe("repetitive_long");
  });
});

describe("scoreResponse — reason field", () => {
  it("reason=empty for empty input", () => {
    expect(scoreResponse("").reason).toBe("empty");
  });

  it("reason=spam for repeated-char spam", () => {
    expect(scoreResponse(repeat("x", 20)).reason).toBe("spam");
  });

  it("reason=very_short for 1–19 char genuine input", () => {
    expect(scoreResponse("I felt peace.").reason).toBe("very_short");
  });

  it("reason=short for 20–79 char input", () => {
    const text = "I noticed my mind calming after five minutes.";
    expect(scoreResponse(text).reason).toBe("short");
  });

  it("reason=strong for 600+ char varied input", () => {
    expect(scoreResponse(uniqueWords(120)).reason).toBe("strong");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// xpForScoreValue
// ═══════════════════════════════════════════════════════════════════════════════

describe("xpForScoreValue", () => {
  it("maps each score 0–5 to score × 1 XP", () => {
    for (let s = 0; s <= 5; s++) {
      expect(xpForScoreValue(s as 0 | 1 | 2 | 3 | 4 | 5)).toBe(s);
    }
  });

  it("score 0 → 0 XP", () => expect(xpForScoreValue(0)).toBe(0));
  it("score 5 → 5 XP (max)", () => expect(xpForScoreValue(5)).toBe(5));
});

// ═══════════════════════════════════════════════════════════════════════════════
// computeLevel
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeLevel", () => {
  it("level 1 at 0 XP", () => expect(computeLevel(0)).toBe(1));
  it("level 1 at 299 XP (just below threshold)", () => {
    expect(computeLevel(XP_PER_LEVEL - 1)).toBe(1);
  });

  it("level-up at exactly 300 XP (XP_PER_LEVEL)", () => {
    expect(computeLevel(XP_PER_LEVEL)).toBe(2);
  });

  it("level 2 at 300 XP", () => expect(computeLevel(300)).toBe(2));
  it("level 2 at 599 XP", () => expect(computeLevel(599)).toBe(2));
  it("level 3 at 600 XP", () => expect(computeLevel(600)).toBe(3));

  it("each 300-XP increment advances one level", () => {
    for (let lvl = 1; lvl <= 9; lvl++) {
      expect(computeLevel(lvl * XP_PER_LEVEL)).toBe(lvl + 1);
    }
  });

  it("max level is 10 regardless of XP", () => {
    expect(computeLevel(MAX_LEVEL * XP_PER_LEVEL)).toBe(MAX_LEVEL);
    expect(computeLevel(MAX_LEVEL * XP_PER_LEVEL + 1)).toBe(MAX_LEVEL);
    expect(computeLevel(99_999)).toBe(MAX_LEVEL);
  });

  it("max level 10 at 2700 XP (9 × 300)", () => {
    expect(computeLevel(2700)).toBe(MAX_LEVEL);
  });

  it("level 1 for negative XP (defensive)", () => {
    expect(computeLevel(-50)).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// awardXp — XP ledger behaviour
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_INPUT = {
  userId: "user_001",
  amount: 3,
  source: XpSource.PRACTICE_RESPONSE,
  sourceId: "resp_001",
};

describe("awardXp — append-only ledger behaviour", () => {
  it("calls xpLedger.create (never update) on a fresh award", async () => {
    await awardXp(mockDb, BASE_INPUT);
    expect(mockXpLedgerCreate).toHaveBeenCalledTimes(1);
    // Confirm it is create, not update
    expect(mockXpLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_001",
          amount: 3,
          source: XpSource.PRACTICE_RESPONSE,
          sourceId: "resp_001",
        }),
      })
    );
  });

  it("records balanceBefore and balanceAfter correctly", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 100, currentLevel: 1 });
    await awardXp(mockDb, { ...BASE_INPUT, amount: 5 });
    expect(mockXpLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          balanceBefore: 100,
          balanceAfter: 105,
        }),
      })
    );
  });

  it("never calls xpLedger.create when skipping (no mutation)", async () => {
    mockXpLedgerFindFirst.mockResolvedValue({ id: "existing_ledger" });
    await awardXp(mockDb, BASE_INPUT);
    expect(mockXpLedgerCreate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// awardXp — duplicate XP prevention
// ═══════════════════════════════════════════════════════════════════════════════

describe("awardXp — no duplicate XP", () => {
  it("returns skipped=true when (source, sourceId) entry already exists", async () => {
    mockXpLedgerFindFirst.mockResolvedValue({ id: "ledger_already" });
    const result = await awardXp(mockDb, BASE_INPUT);
    expect(result.skipped).toBe(true);
    if (result.skipped) expect(result.reason).toBe("already_awarded");
  });

  it("queries with correct source and sourceId in the idempotency check", async () => {
    await awardXp(mockDb, BASE_INPUT);
    expect(mockXpLedgerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          source: XpSource.PRACTICE_RESPONSE,
          sourceId: "resp_001",
        },
      })
    );
  });

  it("calling awardXp twice for the same sourceId only creates one ledger entry", async () => {
    // First call: no entry exists → create
    mockXpLedgerFindFirst.mockResolvedValueOnce(null);
    await awardXp(mockDb, BASE_INPUT);
    expect(mockXpLedgerCreate).toHaveBeenCalledTimes(1);

    // Second call: entry now exists → skip
    mockXpLedgerFindFirst.mockResolvedValueOnce({ id: "ledger_001" });
    jest.clearAllMocks();
    mockXpLedgerFindFirst.mockResolvedValue({ id: "ledger_001" });
    const result2 = await awardXp(mockDb, BASE_INPUT);
    expect(result2.skipped).toBe(true);
    expect(mockXpLedgerCreate).not.toHaveBeenCalled();
  });

  it("returns skipped=true for zero-amount award without any DB writes", async () => {
    const result = await awardXp(mockDb, { ...BASE_INPUT, amount: 0 });
    expect(result.skipped).toBe(true);
    if (result.skipped) expect(result.reason).toBe("zero_amount");
    expect(mockXpLedgerFindFirst).not.toHaveBeenCalled();
    expect(mockXpLedgerCreate).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// awardXp — level progression
// ═══════════════════════════════════════════════════════════════════════════════

describe("awardXp — level-up at 300 XP", () => {
  it("does NOT level up when XP stays below 300", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 290, currentLevel: 1 });
    const result = await awardXp(mockDb, { ...BASE_INPUT, amount: 5 });
    if (!result.skipped) {
      expect(result.leveledUp).toBe(false);
      expect(result.levelAfter).toBe(1); // still level 1 at 295 XP
    }
  });

  it("levels up when crossing exactly 300 XP", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 297, currentLevel: 1 });
    const result = await awardXp(mockDb, { ...BASE_INPUT, amount: 3 });
    if (!result.skipped) {
      expect(result.leveledUp).toBe(true);
      expect(result.levelAfter).toBe(2);
      expect(result.xpAfter).toBe(300);
    }
  });

  it("updates User.currentLevel to 2 on level-up to 300 XP", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 297, currentLevel: 1 });
    await awardXp(mockDb, { ...BASE_INPUT, amount: 3 });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentLevel: 2, xpTotal: 300 }),
      })
    );
  });

  it("sets pendingLevelUp=true on UserJourneyState when level-up occurs", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 297, currentLevel: 1 });
    await awardXp(mockDb, { ...BASE_INPUT, amount: 3 });
    expect(mockJourneyStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ pendingLevelUp: true }),
      })
    );
  });

  it("does NOT set pendingLevelUp when no level-up occurs", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 50, currentLevel: 1 });
    await awardXp(mockDb, { ...BASE_INPUT, amount: 3 });
    const call = mockJourneyStateUpsert.mock.calls[0][0];
    expect(call.update).not.toHaveProperty("pendingLevelUp");
  });
});

describe("awardXp — max level 10", () => {
  it("does not advance beyond level 10 regardless of XP", async () => {
    // User already at level 10 with 2700 XP
    mockUserFindUnique.mockResolvedValue({ xpTotal: 2700, currentLevel: 10 });
    const result = await awardXp(mockDb, { ...BASE_INPUT, amount: 5 });
    if (!result.skipped) {
      expect(result.levelAfter).toBe(10); // capped
      expect(result.leveledUp).toBe(false);
    }
  });

  it("User.currentLevel written as 10 even with very high XP", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 99_000, currentLevel: 10 });
    await awardXp(mockDb, { ...BASE_INPUT, amount: 5 });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentLevel: 10 }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// awardXp — result shape on success
// ═══════════════════════════════════════════════════════════════════════════════

describe("awardXp — successful result shape", () => {
  it("returns skipped=false with correct xpBefore and xpAfter", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 50, currentLevel: 1 });
    const result = await awardXp(mockDb, { ...BASE_INPUT, amount: 3 });
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.xpBefore).toBe(50);
      expect(result.xpAfter).toBe(53);
      expect(result.levelBefore).toBe(1);
      expect(result.levelAfter).toBe(1);
    }
  });

  it("updates User.xpTotal correctly", async () => {
    mockUserFindUnique.mockResolvedValue({ xpTotal: 200, currentLevel: 1 });
    await awardXp(mockDb, { ...BASE_INPUT, amount: 4 });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ xpTotal: 204 }),
      })
    );
  });

  it("upserts UserJourneyState with totalResponsesSubmitted increment", async () => {
    await awardXp(mockDb, BASE_INPUT);
    expect(mockJourneyStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_001" },
        update: expect.objectContaining({
          totalResponsesSubmitted: { increment: 1 },
        }),
      })
    );
  });
});
