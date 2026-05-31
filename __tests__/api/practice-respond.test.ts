/**
 * Unit tests for POST /api/practice/respond
 * (src/app/api/practice/respond/route.ts)
 *
 * Coverage:
 *   1. Unauthenticated request → 401
 *   2. Missing / empty messageId → 400
 *   3. Empty responseText → 400
 *   4. responseText over 3000 chars → 400
 *   5. Message not found → 404
 *   6. Ownership violation (message belongs to another user) → 403
 *   7. Duplicate response prevention → 409
 *   8. Valid first submission → 201 with response object
 *   9. score and xpEarned are null / 0 on creation
 *
 * NOTE: Jest is not yet installed in this project.
 * Run `npm install --save-dev jest ts-jest @types/jest` and add jest.config.ts
 * to activate.
 */

import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindUniqueMessage = jest.fn();
const mockFindUniqueResponse = jest.fn();
const mockCreateResponse = jest.fn();
const mockFindUniqueUser = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUniqueUser(...args),
    },
    practiceMessage: {
      findUnique: (...args: unknown[]) => mockFindUniqueMessage(...args),
    },
    practiceResponse: {
      findUnique: (...args: unknown[]) => mockFindUniqueResponse(...args),
      create: (...args: unknown[]) => mockCreateResponse(...args),
    },
  },
}));

const mockGetSession = jest.fn();
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "mock-cookie" }),
  }),
}));
jest.mock("@/lib/auth", () => ({
  getSessionFromCookie: () => mockGetSession(),
}));

import { POST } from "@/app/api/practice/respond/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = "user_001";
const OTHER_USER_ID = "user_002";
const MESSAGE_ID = "msg_001";
const RESPONSE_ID = "resp_001";

function makeSession(userId = USER_ID) {
  return { userId, email: "seeker@example.com", role: "USER", iat: Date.now() };
}

function makeMessage(ownerId = USER_ID) {
  return { id: MESSAGE_ID, userId: ownerId };
}

function makeAccessUser(overrides: Partial<{
  id: string;
  email: string;
  role: string;
  emailVerifiedAt: Date | null;
  onboardingDone: boolean;
}> = {}) {
  return {
    id: USER_ID,
    email: "seeker@example.com",
    role: "USER",
    emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
    onboardingDone: true,
    ...overrides,
  };
}

function makeExistingResponse() {
  return { id: RESPONSE_ID };
}

function makeCreatedResponse() {
  return {
    id: RESPONSE_ID,
    xpEarned: 0,
    createdAt: new Date().toISOString(),
  };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://test.joinai.app/api/practice/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  messageId: MESSAGE_ID,
  responseText: "This practice helped me observe the gap between thoughts and actions.",
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated, verified, onboarded user with a valid first response path
  mockGetSession.mockReturnValue(makeSession());
  mockFindUniqueUser.mockResolvedValue(makeAccessUser());
  mockFindUniqueMessage.mockResolvedValue(makeMessage());
  mockFindUniqueResponse.mockResolvedValue(null); // no prior response
  mockCreateResponse.mockResolvedValue(makeCreatedResponse());
});

// ─── 1. Authentication ────────────────────────────────────────────────────────

describe("Authentication", () => {
  it("returns 401 when session is null", async () => {
    mockGetSession.mockReturnValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("does not query the database when unauthenticated", async () => {
    mockGetSession.mockReturnValue(null);
    await POST(makeRequest(VALID_BODY));
    expect(mockFindUniqueMessage).not.toHaveBeenCalled();
    expect(mockCreateResponse).not.toHaveBeenCalled();
  });

  it("returns 403 when onboarding is still required", async () => {
    mockFindUniqueUser.mockResolvedValue(
      makeAccessUser({ onboardingDone: false })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });
});

// ─── 2. Input validation — messageId ──────────────────────────────────────────

describe("Validation: messageId", () => {
  it("returns 400 when messageId is missing", async () => {
    const res = await POST(makeRequest({ responseText: "some text" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when messageId is an empty string", async () => {
    const res = await POST(makeRequest({ messageId: "   ", responseText: "some text" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when messageId is not a string", async () => {
    const res = await POST(makeRequest({ messageId: 42, responseText: "text" }));
    expect(res.status).toBe(400);
  });
});

// ─── 3. Input validation — responseText ───────────────────────────────────────

describe("Validation: responseText", () => {
  it("returns 400 when responseText is missing", async () => {
    const res = await POST(makeRequest({ messageId: MESSAGE_ID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("returns 400 when responseText is empty", async () => {
    const res = await POST(makeRequest({ messageId: MESSAGE_ID, responseText: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });

  it("returns 400 when responseText is only whitespace", async () => {
    const res = await POST(makeRequest({ messageId: MESSAGE_ID, responseText: "   \n  \t  " }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });

  it("returns 400 when responseText exceeds 3000 characters", async () => {
    const longText = "a".repeat(3001);
    const res = await POST(makeRequest({ messageId: MESSAGE_ID, responseText: longText }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too long|maximum/i);
    expect(body.error).toContain("3000");
  });

  it("accepts responseText of exactly 3000 characters", async () => {
    const exactText = "a".repeat(3000);
    const res = await POST(makeRequest({ messageId: MESSAGE_ID, responseText: exactText }));
    expect(res.status).toBe(201);
  });

  it("accepts non-ASCII content", async () => {
    const res = await POST(makeRequest({
      messageId: MESSAGE_ID,
      responseText: "سكوت درون — stillness within. ✦",
    }));
    expect(res.status).toBe(201);
  });
});

// ─── 4. Message not found ─────────────────────────────────────────────────────

describe("Message not found", () => {
  it("returns 404 when message does not exist", async () => {
    mockFindUniqueMessage.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("does not check for existing response when message is missing", async () => {
    mockFindUniqueMessage.mockResolvedValue(null);
    await POST(makeRequest(VALID_BODY));
    expect(mockFindUniqueResponse).not.toHaveBeenCalled();
  });
});

// ─── 5. Ownership ─────────────────────────────────────────────────────────────

describe("Ownership enforcement", () => {
  it("returns 403 when the message belongs to a different user", async () => {
    mockFindUniqueMessage.mockResolvedValue(makeMessage(OTHER_USER_ID));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/permission|forbidden/i);
  });

  it("does not create a response when ownership check fails", async () => {
    mockFindUniqueMessage.mockResolvedValue(makeMessage(OTHER_USER_ID));
    await POST(makeRequest(VALID_BODY));
    expect(mockCreateResponse).not.toHaveBeenCalled();
  });
});

// ─── 6. Duplicate prevention ──────────────────────────────────────────────────

describe("Duplicate response prevention", () => {
  it("returns 409 when a response already exists for this message", async () => {
    mockFindUniqueResponse.mockResolvedValue(makeExistingResponse());
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already submitted/i);
  });

  it("does not call db.create when duplicate is detected", async () => {
    mockFindUniqueResponse.mockResolvedValue(makeExistingResponse());
    await POST(makeRequest(VALID_BODY));
    expect(mockCreateResponse).not.toHaveBeenCalled();
  });

  it("queries duplicate check with correct compound key", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockFindUniqueResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_practiceMessageId: {
            userId: USER_ID,
            practiceMessageId: MESSAGE_ID,
          },
        },
      })
    );
  });
});

// ─── 7. Successful submission ─────────────────────────────────────────────────

describe("Successful submission", () => {
  it("returns 201 on first valid submission", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
  });

  it("returns the created response object", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(body.response).toBeDefined();
    expect(body.response.id).toBe(RESPONSE_ID);
  });

  it("creates response with score=null", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          score: null,
        }),
      })
    );
  });

  it("creates response with xpEarned=0", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          xpEarned: 0,
        }),
      })
    );
  });

  it("stores the trimmed responseText", async () => {
    const withSpaces = "  deep reflection  ";
    await POST(makeRequest({ messageId: MESSAGE_ID, responseText: withSpaces }));
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responseText: "deep reflection",
        }),
      })
    );
  });

  it("stores the correct userId from session", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID }),
      })
    );
  });

  it("stores the correct practiceMessageId", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ practiceMessageId: MESSAGE_ID }),
      })
    );
  });
});

// ─── 8. Invalid JSON body ─────────────────────────────────────────────────────

describe("Malformed request body", () => {
  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("https://test.joinai.app/api/practice/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "this is not json {{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
