const mockConstructEvent = jest.fn();
const mockEventCreate = jest.fn();
const mockEventFindUnique = jest.fn();
const mockEventUpdate = jest.fn();
const mockEventUpdateMany = jest.fn();
const mockInvoiceUpsert = jest.fn();
const mockRetrieveSubscription = jest.fn();
const mockResolveOwner = jest.fn();
const mockResolveExistingOwner = jest.fn();
const mockSyncSubscription = jest.fn();

jest.mock("@/lib/env", () => ({
  requireEnv: jest.fn(() => "whsec_test"),
}));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(() => ({
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => mockRetrieveSubscription(...args) },
  })),
}));

jest.mock("@/lib/stripe/subscription-sync", () => {
  class StripeOwnershipError extends Error {}
  return {
    StripeOwnershipError,
    resolveSubscriptionOwnerId: (...args: unknown[]) => mockResolveOwner(...args),
    resolveExistingBillingOwnerId: (...args: unknown[]) => mockResolveExistingOwner(...args),
    syncStripeSubscription: (...args: unknown[]) => mockSyncSubscription(...args),
  };
});
jest.mock("@/lib/db", () => ({
  db: {
    stripeWebhookEvent: {
      create: (...args: unknown[]) => mockEventCreate(...args),
      findUnique: (...args: unknown[]) => mockEventFindUnique(...args),
      update: (...args: unknown[]) => mockEventUpdate(...args),
      updateMany: (...args: unknown[]) => mockEventUpdateMany(...args),
    },
    invoiceRecord: { upsert: (...args: unknown[]) => mockInvoiceUpsert(...args) },
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

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_123",
    type: "ping.unhandled",
    livemode: true,
    created: 1_800_000_000,
    data: { object: {} },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConstructEvent.mockReturnValue(event());
  mockEventCreate.mockResolvedValue({});
  mockEventFindUnique.mockResolvedValue(null);
  mockEventUpdate.mockResolvedValue({});
  mockEventUpdateMany.mockResolvedValue({ count: 1 });
  mockInvoiceUpsert.mockResolvedValue({});
  mockRetrieveSubscription.mockResolvedValue({
    id: "sub_123",
    status: "active",
    customer: "cus_123",
    metadata: { userId: "user_123" },
  });
  mockResolveOwner.mockResolvedValue("user_123");
  mockResolveExistingOwner.mockResolvedValue("user_123");
  mockSyncSubscription.mockResolvedValue({ status: "ACTIVE", plan: "initiate", active: true });
});

describe("Stripe webhook retries and idempotency", () => {
  it("claims and records a successfully processed event", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockEventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventId: "evt_123",
        providerObjectId: null,
        status: "processing",
      }),
    }));
    expect(mockEventUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { eventId: "evt_123" },
      data: expect.objectContaining({ status: "processed", processedAt: expect.any(Date) }),
    }));
  });

  it("acknowledges an already processed duplicate without processing it again", async () => {
    mockEventCreate.mockRejectedValue({ code: "P2002" });
    mockEventFindUnique.mockResolvedValue({ status: "processed" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("returns a retryable conflict while the same event is processing", async () => {
    mockEventCreate.mockRejectedValue({ code: "P2002" });
    mockEventFindUnique.mockResolvedValue({ status: "processing" });

    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 when final processing state cannot be recorded", async () => {
    mockEventUpdate.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mockEventUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { eventId: "evt_123", status: "processing" },
      data: expect.objectContaining({ status: "failed" }),
    }));
  });

  it("syncs membership from verified Checkout ownership", async () => {
    const session = {
      mode: "subscription",
      subscription: "sub_123",
      client_reference_id: "user_123",
      metadata: { userId: "user_123" },
    };
    mockConstructEvent.mockReturnValue(event({
      type: "checkout.session.completed",
      data: { object: session },
    }));

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mockResolveOwner).toHaveBeenCalledWith(expect.objectContaining({ id: "sub_123" }), session);
    expect(mockSyncSubscription).toHaveBeenCalledWith({
      subscription: expect.objectContaining({ id: "sub_123" }),
      userId: "user_123",
    });
  });

  it("stores invoice currency and receipt URLs after resolving subscription ownership", async () => {
    mockConstructEvent.mockReturnValue(event({
      type: "invoice.payment_succeeded",
      data: { object: {
        id: "in_123",
        customer: "cus_123",
        subscription: "sub_123",
        amount_paid: 2500,
        amount_due: 2500,
        currency: "try",
        hosted_invoice_url: "https://invoice.example/hosted",
        invoice_pdf: "https://invoice.example/pdf",
      } },
    }));

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mockInvoiceUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        currency: "try",
        hostedInvoiceUrl: "https://invoice.example/hosted",
        invoicePdfUrl: "https://invoice.example/pdf",
      }),
      update: expect.objectContaining({ currency: "try" }),
    }));
  });
});
