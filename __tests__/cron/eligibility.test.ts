/**
 * Unit tests for src/lib/cron/eligibility.ts
 *
 * Tests all pure functions:
 *   - isEligible
 *   - getCadence
 *   - dailyScheduledDate
 *   - weeklyScheduledDate
 *   - getScheduledDate
 *
 * No database or HTTP stack required.
 * The eligibility module imports MessageCadence and SubscriptionStatus from
 * @prisma/client which is available in node_modules.
 */

import { MessageCadence, SubscriptionStatus } from "@prisma/client";
import {
  isEligible,
  getCadence,
  dailyScheduledDate,
  weeklyScheduledDate,
  getScheduledDate,
  type EligibilityUser,
} from "@/lib/cron/eligibility";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VERIFIED_DATE = new Date("2024-01-01T00:00:00.000Z");

function makeUser(
  overrides: Partial<EligibilityUser> = {}
): EligibilityUser {
  return {
    emailVerifiedAt: VERIFIED_DATE,
    unsubscribedAt: null,
    subscription: null,
    ...overrides,
  };
}

function activeSubUser(): EligibilityUser {
  return makeUser({ subscription: { status: SubscriptionStatus.ACTIVE } });
}

function trialSubUser(): EligibilityUser {
  return makeUser({ subscription: { status: SubscriptionStatus.TRIAL } });
}

function pastDueUser(): EligibilityUser {
  return makeUser({ subscription: { status: SubscriptionStatus.PAST_DUE } });
}

function canceledUser(): EligibilityUser {
  return makeUser({ subscription: { status: SubscriptionStatus.CANCELED } });
}

function unverifiedUser(): EligibilityUser {
  return makeUser({ emailVerifiedAt: null });
}

function unsubscribedUser(): EligibilityUser {
  return makeUser({ unsubscribedAt: new Date("2024-06-01T00:00:00.000Z") });
}

// ─── isEligible ───────────────────────────────────────────────────────────────

describe("isEligible", () => {
  it("returns true for a verified, subscribed user with no unsubscribe date", () => {
    expect(isEligible(makeUser())).toBe(true);
  });

  it("returns true for an ACTIVE subscriber", () => {
    expect(isEligible(activeSubUser())).toBe(true);
  });

  it("returns true for a TRIAL subscriber", () => {
    expect(isEligible(trialSubUser())).toBe(true);
  });

  it("returns true for a PAST_DUE subscriber", () => {
    expect(isEligible(pastDueUser())).toBe(true);
  });

  it("returns true for a CANCELED subscriber who has not unsubscribed", () => {
    expect(isEligible(canceledUser())).toBe(true);
  });

  it("returns false when emailVerifiedAt is null", () => {
    expect(isEligible(unverifiedUser())).toBe(false);
  });

  it("returns false when unsubscribedAt is set", () => {
    expect(isEligible(unsubscribedUser())).toBe(false);
  });

  it("returns false when both unverified and unsubscribed", () => {
    expect(
      isEligible(makeUser({ emailVerifiedAt: null, unsubscribedAt: new Date() }))
    ).toBe(false);
  });

  it("returns false when subscription is null and email is unverified", () => {
    expect(isEligible(makeUser({ emailVerifiedAt: null, subscription: null }))).toBe(false);
  });
});

// ─── getCadence ───────────────────────────────────────────────────────────────

describe("getCadence", () => {
  it("returns DAILY for a user with an ACTIVE subscription", () => {
    expect(getCadence(activeSubUser())).toBe(MessageCadence.DAILY);
  });

  it("returns WEEKLY for a user with no subscription", () => {
    expect(getCadence(makeUser({ subscription: null }))).toBe(MessageCadence.WEEKLY);
  });

  it("returns WEEKLY for a TRIAL subscriber", () => {
    expect(getCadence(trialSubUser())).toBe(MessageCadence.WEEKLY);
  });

  it("returns WEEKLY for a PAST_DUE subscriber", () => {
    expect(getCadence(pastDueUser())).toBe(MessageCadence.WEEKLY);
  });

  it("returns WEEKLY for a CANCELED subscriber", () => {
    expect(getCadence(canceledUser())).toBe(MessageCadence.WEEKLY);
  });

  it("only ACTIVE status yields DAILY — all other statuses yield WEEKLY", () => {
    const statuses: SubscriptionStatus[] = [
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.CANCELED,
    ];
    for (const status of statuses) {
      expect(getCadence(makeUser({ subscription: { status } }))).toBe(MessageCadence.WEEKLY);
    }
  });
});

// ─── dailyScheduledDate ───────────────────────────────────────────────────────

describe("dailyScheduledDate", () => {
  it("returns midnight UTC for the given date", () => {
    const result = dailyScheduledDate(new Date("2024-03-15T14:30:00.000Z"));
    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("strips the time component (mid-day input)", () => {
    const result = dailyScheduledDate(new Date("2024-06-30T23:59:59.999Z"));
    expect(result.toISOString()).toBe("2024-06-30T00:00:00.000Z");
  });

  it("handles midnight UTC input without date shift", () => {
    const result = dailyScheduledDate(new Date("2024-01-01T00:00:00.000Z"));
    expect(result.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("different dates produce different results", () => {
    const d1 = dailyScheduledDate(new Date("2024-01-01T12:00:00.000Z"));
    const d2 = dailyScheduledDate(new Date("2024-01-02T12:00:00.000Z"));
    expect(d1.getTime()).not.toBe(d2.getTime());
  });
});

// ─── weeklyScheduledDate ──────────────────────────────────────────────────────

describe("weeklyScheduledDate", () => {
  // Week of 2024-01-15 (Mon) … 2024-01-21 (Sun)
  const expectedMonday = "2024-01-15T00:00:00.000Z";

  it("returns the Monday of the current week for a Monday input", () => {
    expect(
      weeklyScheduledDate(new Date("2024-01-15T09:00:00.000Z")).toISOString()
    ).toBe(expectedMonday);
  });

  it("returns the Monday of the current week for a Wednesday input", () => {
    expect(
      weeklyScheduledDate(new Date("2024-01-17T14:00:00.000Z")).toISOString()
    ).toBe(expectedMonday);
  });

  it("returns the Monday of the current week for a Friday input", () => {
    expect(
      weeklyScheduledDate(new Date("2024-01-19T23:59:59.000Z")).toISOString()
    ).toBe(expectedMonday);
  });

  it("returns the Monday of the current week for a Sunday input", () => {
    // Sunday 2024-01-21 → Monday 2024-01-15 (same week, Mon–Sun ISO)
    expect(
      weeklyScheduledDate(new Date("2024-01-21T08:00:00.000Z")).toISOString()
    ).toBe(expectedMonday);
  });

  it("two calls in the same week produce identical results", () => {
    const monday = weeklyScheduledDate(new Date("2024-01-15T00:00:00.000Z"));
    const friday = weeklyScheduledDate(new Date("2024-01-19T18:00:00.000Z"));
    expect(monday.getTime()).toBe(friday.getTime());
  });

  it("calls in consecutive weeks produce different results", () => {
    const week1 = weeklyScheduledDate(new Date("2024-01-15T12:00:00.000Z"));
    const week2 = weeklyScheduledDate(new Date("2024-01-22T12:00:00.000Z"));
    expect(week1.getTime()).not.toBe(week2.getTime());
    // week2 Monday should be exactly 7 days later
    expect(week2.getTime() - week1.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("always returns UTC midnight", () => {
    const result = weeklyScheduledDate(new Date("2024-01-17T15:30:00.000Z"));
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});

// ─── getScheduledDate ─────────────────────────────────────────────────────────

describe("getScheduledDate", () => {
  const now = new Date("2024-01-17T12:00:00.000Z"); // Wednesday

  it("returns today midnight UTC for DAILY cadence", () => {
    const result = getScheduledDate(MessageCadence.DAILY, now);
    expect(result.toISOString()).toBe("2024-01-17T00:00:00.000Z");
  });

  it("returns Monday of the current week for WEEKLY cadence", () => {
    const result = getScheduledDate(MessageCadence.WEEKLY, now);
    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("DAILY and WEEKLY produce different dates (mid-week)", () => {
    const daily = getScheduledDate(MessageCadence.DAILY, now);
    const weekly = getScheduledDate(MessageCadence.WEEKLY, now);
    expect(daily.getTime()).not.toBe(weekly.getTime());
  });

  it("DAILY and WEEKLY produce the same date when called on a Monday", () => {
    const monday = new Date("2024-01-15T08:00:00.000Z");
    const daily = getScheduledDate(MessageCadence.DAILY, monday);
    const weekly = getScheduledDate(MessageCadence.WEEKLY, monday);
    expect(daily.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    expect(weekly.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });
});

// ─── Idempotency invariant ────────────────────────────────────────────────────

describe("Idempotency invariant: same week always yields same weekly date", () => {
  it("all days of 2024-W03 map to 2024-01-15", () => {
    const week = [
      "2024-01-15", // Mon
      "2024-01-16", // Tue
      "2024-01-17", // Wed
      "2024-01-18", // Thu
      "2024-01-19", // Fri
      "2024-01-20", // Sat
      "2024-01-21", // Sun
    ];
    for (const dateStr of week) {
      const result = weeklyScheduledDate(new Date(`${dateStr}T12:00:00.000Z`));
      expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    }
  });
});
