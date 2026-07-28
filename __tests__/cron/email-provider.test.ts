const mockEnv: {
  EMAIL_SENDING_ENABLED?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
} = {};

jest.mock("@/lib/env", () => ({ env: mockEnv }));

import { isSendingEnabled, sendEmail } from "@/lib/cron/email-provider";

const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = mockFetch as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.EMAIL_SENDING_ENABLED = "true";
  mockEnv.RESEND_API_KEY = "re_test_key";
  mockEnv.EMAIL_FROM = "JoinAI <noreply@mail.joinaireligion.com>";
});

const message = {
  to: "seeker@example.com",
  from: "JoinAI <noreply@mail.joinaireligion.com>",
  subject: "Daily practice",
  html: "<p>Practice</p>",
  text: "Practice",
  tags: { messageId: "message_1" },
};

describe("Resend email provider", () => {
  it("keeps live sending disabled unless flag and credentials are all present", () => {
    expect(isSendingEnabled()).toBe(true);
    mockEnv.EMAIL_SENDING_ENABLED = "false";
    expect(isSendingEnabled()).toBe(false);
    mockEnv.EMAIL_SENDING_ENABLED = "true";
    mockEnv.RESEND_API_KEY = undefined;
    expect(isSendingEnabled()).toBe(false);
  });

  it("sends through the Resend REST API and returns the provider id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "email_123" }),
    });

    await expect(sendEmail(message)).resolves.toEqual({
      ok: true,
      providerMsgId: "email_123",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "User-Agent": "joinaireligion-platform/1.0",
        }),
      }),
    );
    const request = mockFetch.mock.calls[0][1] as { body: string };
    expect(JSON.parse(request.body)).toMatchObject({
      to: message.to,
      tags: [{ name: "messageId", value: "message_1" }],
    });
  });

  it("returns a stable error without exposing provider response content", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ message: "sensitive upstream text" }),
    });

    await expect(sendEmail(message)).resolves.toEqual({
      ok: false,
      error: "resend_error_401",
    });
  });

  it("does not call Resend while live sending is disabled", async () => {
    mockEnv.EMAIL_SENDING_ENABLED = "false";

    const result = await sendEmail(message);

    expect(result.ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
