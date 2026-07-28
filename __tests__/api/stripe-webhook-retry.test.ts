const mockConstructEvent = jest.fn();
const mockEventFindUnique = jest.fn();
const mockEventUpsert = jest.fn();

jest.mock("@/lib/env", () => ({
  requireEnv: jest.fn(() => "whsec_test"),
}));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(() => ({
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    customers: { retrieve: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  })),
}));

jest.mock("@/lib/db", () => ({
  db: {
    stripeWebhookEvent: {
      findUnique: (...args: unknown[]) => mockEventFindUnique(...args),
      upsert: (...args: unknown[]) => mockEventUpsert(...args),
    },
  },
}));

import { POST } from "@/app/api/stripe/webhook/route";

function request() {
  return new Request("https://joinaireligion.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test_signature" },
    body: "{}",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConstructEvent.mockReturnValue({
    id: "evt_123",
    type: "ping.unhandled",
    livemode: true,
    created: 1_800_000_000,
    data: { object: {} },
  });
  mockEventFindUnique.mockResolvedValue(null);
  mockEventUpsert.mockResolvedValue({});
});

describe("Stripe webhook retries and idempotency", () => {
  it("records a successfully processed event", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockEventUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "evt_123" },
        create: expect.objectContaining({ status: "processed" }),
      }),
    );
  });

  it("acknowledges an already processed duplicate without processing it again", async () => {
    mockEventFindUnique.mockResolvedValue({ status: "processed" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(mockEventUpsert).not.toHaveBeenCalled();
  });

  it("returns 500 when processing cannot be recorded so Stripe will retry", async () => {
    mockEventUpsert.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(500);
  });
});
