/**
 * Unit / integration tests for src/app/api/cron/send-practice-emails/route.ts
 *
 * Tests use Jest + module mocking to isolate the route handler from the
 * database and email provider.
 *
 * Coverage:
 *   1. CRON_SECRET protection — 401 when header absent or wrong
 *   2. Only QUEUED messages are selected (generationStatus=GENERATED, sentAt=null)
 *   3. No duplicate send — already SENT messages are excluded by the DB query
 *   4. DRY_RUN does not mutate the database
 *   5. Failed send records FAILED status and EmailLog error entry
 *   6. LOG_ONLY records SENT without calling the email provider
 *   7. Missing content skips message with SKIPPED status
 *
 * NOTE: Jest and @types/jest are not yet installed in this project.
 * Run `npm install --save-dev jest ts-jest @types/jest` and add a jest.config.ts
 * to activate these tests.
 */

import {
  DeliveryStatus,
  GenerationStatus,
  AgentRunStatus,
} from "@prisma/client";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Prisma db
const mockAgentRunCreate = jest.fn();
const mockAgentRunUpdate = jest.fn();
const mockMessageFindMany = jest.fn();
const mockMessageUpdate = jest.fn();
const mockEmailLogCreate = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: {
      create: (...args: unknown[]) => mockAgentRunCreate(...args),
      update: (...args: unknown[]) => mockAgentRunUpdate(...args),
    },
    practiceMessage: {
      findMany: (...args: unknown[]) => mockMessageFindMany(...args),
      update: (...args: unknown[]) => mockMessageUpdate(...args),
    },
    emailLog: {
      create: (...args: unknown[]) => mockEmailLogCreate(...args),
    },
  },
}));

// Mock email provider
const mockIsSendingEnabled = jest.fn(() => false);
const mockSendEmail = jest.fn();
const mockGetFromAddress = jest.fn(() => "noreply@joinai.app");

jest.mock("@/lib/cron/email-provider", () => ({
  isSendingEnabled: () => mockIsSendingEnabled(),
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  getFromAddress: () => mockGetFromAddress(),
}));

// Mock env
jest.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-secret",
    NEXT_PUBLIC_APP_URL: "https://test.joinai.app",
    EMAIL_FROM: "noreply@joinai.app",
    EMAIL_SENDING_ENABLED: undefined,
    RESEND_API_KEY: undefined,
  },
}));

// ─── Route import (after mocks are set up) ────────────────────────────────────

import { POST } from "@/app/api/cron/send-practice-emails/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENT_RUN_ID = "agentrun_001";

function makeQueuedMessage(overrides: Partial<ReturnType<typeof baseMessage>> = {}) {
  return { ...baseMessage(), ...overrides };
}

function baseMessage() {
  return {
    id: "msg_001",
    userId: "user_001",
    cadence: "DAILY",
    scheduledDate: new Date("2024-01-15T00:00:00.000Z"),
    subject: "Your daily practice — Morning Silence (2024-01-15)",
    bodyHtml: "<html><body><div class='wrap'><p>Practice content</p></div></body></html>",
    bodyText: "Practice content\n",
    xpReward: 20,
    agentRunId: "agentrun_prev",
    user: {
      email: "seeker@example.com",
      displayName: "Seeker",
      preferredEmailLocale: "en",
      unsubscribeToken: "tok_abc123",
    },
  };
}

function makeRequest(options: {
  secret?: string;
  mode?: string;
} = {}): Request {
  const { secret = "test-secret", mode } = options;
  const url = mode
    ? `https://test.joinai.app/api/cron/send-practice-emails?mode=${mode}`
    : "https://test.joinai.app/api/cron/send-practice-emails";
  return new Request(url, {
    method: "POST",
    headers: {
      Authorization: secret ? `Bearer ${secret}` : "",
    },
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default stubs
  mockAgentRunCreate.mockResolvedValue({ id: AGENT_RUN_ID });
  mockAgentRunUpdate.mockResolvedValue({});
  mockMessageFindMany.mockResolvedValue([]);
  mockMessageUpdate.mockResolvedValue({});
  mockEmailLogCreate.mockResolvedValue({});
  mockIsSendingEnabled.mockReturnValue(false);
});

// ─── 1. CRON_SECRET protection ─────────────────────────────────────────────────

describe("CRON_SECRET protection", () => {
  it("returns 401 when Authorization header is absent", async () => {
    const req = new Request("https://test.joinai.app/api/cron/send-practice-emails", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when secret is wrong", async () => {
    const res = await POST(makeRequest({ secret: "wrong-secret" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 when secret is correct", async () => {
    const res = await POST(makeRequest({ secret: "test-secret" }));
    expect(res.status).toBe(200);
  });

  it("does not open an AgentRun when unauthorized", async () => {
    await POST(makeRequest({ secret: "bad" }));
    expect(mockAgentRunCreate).not.toHaveBeenCalled();
  });
});

// ─── 2. Only QUEUED messages are selected ─────────────────────────────────────

describe("QUEUED message selection", () => {
  it("queries with deliveryStatus=QUEUED, generationStatus=GENERATED, sentAt=null", async () => {
    await POST(makeRequest());
    expect(mockMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deliveryStatus: DeliveryStatus.QUEUED,
          generationStatus: GenerationStatus.GENERATED,
          sentAt: null,
        }),
      })
    );
  });

  it("returns queued count = 0 when no messages are ready", async () => {
    mockMessageFindMany.mockResolvedValue([]);
    const res = await POST(makeRequest());
    const body = await res.json();
    expect(body.queued).toBe(0);
  });

  it("reports the correct queued count", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage(), makeQueuedMessage({ id: "msg_002" })]);
    const res = await POST(makeRequest());
    const body = await res.json();
    expect(body.queued).toBe(2);
  });
});

// ─── 3. DRY_RUN does not mutate data ──────────────────────────────────────────

describe("DRY_RUN mode", () => {
  it("does not call practiceMessage.update", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    await POST(makeRequest({ mode: "DRY_RUN" }));
    expect(mockMessageUpdate).not.toHaveBeenCalled();
  });

  it("does not call emailLog.create", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    await POST(makeRequest({ mode: "DRY_RUN" }));
    expect(mockEmailLogCreate).not.toHaveBeenCalled();
  });

  it("does not call sendEmail", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    await POST(makeRequest({ mode: "DRY_RUN" }));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns a previews array with one entry per message", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    const res = await POST(makeRequest({ mode: "DRY_RUN" }));
    const body = await res.json();
    expect(body.mode).toBe("DRY_RUN");
    expect(Array.isArray(body.previews)).toBe(true);
    expect(body.previews).toHaveLength(1);
    expect(body.previews[0].messageId).toBe("msg_001");
    expect(body.previews[0].to).toBe("seeker@example.com");
  });

  it("reports sent=0 in DRY_RUN even when messages exist", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    const res = await POST(makeRequest({ mode: "DRY_RUN" }));
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("is the default mode when no ?mode= param is supplied", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    const res = await POST(makeRequest()); // no mode param
    const body = await res.json();
    expect(body.mode).toBe("DRY_RUN");
  });
});

// ─── 4. No duplicate send ──────────────────────────────────────────────────────

describe("No duplicate send", () => {
  it("only selects messages where sentAt is null", async () => {
    // The DB query filter is the primary guard — verify it is present
    await POST(makeRequest({ mode: "LOG_ONLY" }));
    expect(mockMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sentAt: null }),
      })
    );
  });

  it("marks the message SENT so it is excluded from the next run", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    await POST(makeRequest({ mode: "LOG_ONLY" }));
    expect(mockMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg_001" },
        data: expect.objectContaining({
          deliveryStatus: DeliveryStatus.SENT,
        }),
      })
    );
  });
});

// ─── 5. LOG_ONLY mode ─────────────────────────────────────────────────────────

describe("LOG_ONLY mode", () => {
  it("creates an EmailLog record for each message", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    await POST(makeRequest({ mode: "LOG_ONLY" }));
    expect(mockEmailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_001",
          template: "practice-message",
          status: DeliveryStatus.SENT,
        }),
      })
    );
  });

  it("does not call sendEmail even if messages exist", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    await POST(makeRequest({ mode: "LOG_ONLY" }));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns sent count equal to number of processed messages", async () => {
    mockMessageFindMany.mockResolvedValue([
      makeQueuedMessage(),
      makeQueuedMessage({ id: "msg_002", user: { ...baseMessage().user, email: "b@example.com" } }),
    ]);
    const res = await POST(makeRequest({ mode: "LOG_ONLY" }));
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(body.failed).toBe(0);
  });
});

// ─── 6. Failed send records error ─────────────────────────────────────────────

describe("Failed send records error", () => {
  beforeEach(() => {
    mockIsSendingEnabled.mockReturnValue(true);
  });

  it("marks message FAILED and creates EmailLog with error when provider fails", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    mockSendEmail.mockResolvedValue({ ok: false, error: "Rate limit exceeded" });

    const res = await POST(makeRequest({ mode: "LIVE" }));
    const body = await res.json();

    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);

    expect(mockMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg_001" },
        data: expect.objectContaining({
          deliveryStatus: DeliveryStatus.FAILED,
        }),
      })
    );

    expect(mockEmailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DeliveryStatus.FAILED,
          metadata: expect.objectContaining({ error: "Rate limit exceeded" }),
        }),
      })
    );
  });

  it("marks AgentRun FAILED when any send fails", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    mockSendEmail.mockResolvedValue({ ok: false, error: "Provider down" });

    await POST(makeRequest({ mode: "LIVE" }));

    expect(mockAgentRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AgentRunStatus.FAILED,
        }),
      })
    );
  });

  it("records providerMsgId in EmailLog on success", async () => {
    mockMessageFindMany.mockResolvedValue([makeQueuedMessage()]);
    mockSendEmail.mockResolvedValue({ ok: true, providerMsgId: "resend_xyz789" });

    await POST(makeRequest({ mode: "LIVE" }));

    expect(mockEmailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerMsgId: "resend_xyz789",
          status: DeliveryStatus.SENT,
        }),
      })
    );
  });
});

// ─── 7. Missing content skipped ───────────────────────────────────────────────

describe("Missing content handling", () => {
  it("skips message with null subject/bodyHtml/bodyText and records SKIPPED", async () => {
    const incomplete = makeQueuedMessage({ subject: null, bodyHtml: null, bodyText: null } as unknown as ReturnType<typeof baseMessage>);
    mockMessageFindMany.mockResolvedValue([incomplete]);

    const res = await POST(makeRequest({ mode: "LOG_ONLY" }));
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);

    expect(mockMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg_001" },
        data: expect.objectContaining({
          deliveryStatus: DeliveryStatus.SKIPPED,
        }),
      })
    );
  });

  it("does not skip message in DRY_RUN (no mutation)", async () => {
    const incomplete = makeQueuedMessage({ subject: null } as unknown as ReturnType<typeof baseMessage>);
    mockMessageFindMany.mockResolvedValue([incomplete]);

    await POST(makeRequest({ mode: "DRY_RUN" }));
    expect(mockMessageUpdate).not.toHaveBeenCalled();
  });
});

// ─── 8. Email renderer integration (email-renderer pure function) ──────────────

describe("renderEmail (src/lib/cron/email-renderer)", () => {
  // Direct import to test the renderer in isolation
  const { renderEmail } = jest.requireActual<typeof import("@/lib/cron/email-renderer")>(
    "@/lib/cron/email-renderer"
  );

  it("includes the response link in HTML output", () => {
    const out = renderEmail({
      messageId: "msg_001",
      subject: "Test Practice",
      bodyHtml: "<html><body><div class='wrap'><p>Content</p></div></body></html>",
      bodyText: "Content",
      displayName: "Seeker",
      locale: "en",
      unsubscribeToken: "tok_abc",
      appUrl: "https://app.joinai.test",
    });
    expect(out.html).toContain("https://app.joinai.test/practice/respond/msg_001");
    expect(out.text).toContain("https://app.joinai.test/practice/respond/msg_001");
  });

  it("includes the unsubscribe link when token is provided", () => {
    const out = renderEmail({
      messageId: "msg_001",
      subject: "Test",
      bodyHtml: "<html><body><div class='wrap'></div></body></html>",
      bodyText: "",
      displayName: "Seeker",
      locale: "en",
      unsubscribeToken: "my-token",
      appUrl: "https://app.joinai.test",
    });
    expect(out.html).toContain("/unsubscribe?token=my-token");
    expect(out.text).toContain("/unsubscribe?token=my-token");
  });

  it("uses fallback note when unsubscribeToken is null", () => {
    const out = renderEmail({
      messageId: "msg_001",
      subject: "Test",
      bodyHtml: "<html><body><div class='wrap'></div></body></html>",
      bodyText: "",
      displayName: "Seeker",
      locale: "en",
      unsubscribeToken: null,
      appUrl: "https://app.joinai.test",
    });
    expect(out.html).not.toContain("/unsubscribe");
    expect(out.html).toContain("log in to your account");
  });

  it("uses Turkish strings for locale=tr", () => {
    const out = renderEmail({
      messageId: "msg_001",
      subject: "Test",
      bodyHtml: "<html><body><div class='wrap'></div></body></html>",
      bodyText: "",
      displayName: "Seeker",
      locale: "tr",
      unsubscribeToken: "tok",
      appUrl: "https://app.joinai.test",
    });
    expect(out.html).toContain("Düşüncenizi paylaşın");
  });

  it("falls back to English for unknown locale", () => {
    const out = renderEmail({
      messageId: "msg_001",
      subject: "Test",
      bodyHtml: "<html><body><div class='wrap'></div></body></html>",
      bodyText: "",
      displayName: "Seeker",
      locale: "ar",
      unsubscribeToken: null,
      appUrl: "https://app.joinai.test",
    });
    expect(out.html).toContain("Share your reflection");
  });

  it("passes subject through unchanged", () => {
    const subject = "My Practice — 2024-01-15";
    const out = renderEmail({
      messageId: "m",
      subject,
      bodyHtml: "<html><body><div class='wrap'></div></body></html>",
      bodyText: "",
      displayName: "X",
      locale: "en",
      unsubscribeToken: null,
      appUrl: "https://test",
    });
    expect(out.subject).toBe(subject);
  });
});
