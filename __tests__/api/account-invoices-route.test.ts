const mockGetCurrentUser = jest.fn();
const mockFindMany = jest.fn();

jest.mock("@/lib/access", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock("@/lib/db", () => ({ db: { invoiceRecord: { findMany: (...args: unknown[]) => mockFindMany(...args) } } }));

import { GET } from "@/app/api/account/invoices/route";

describe("account invoice history API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("requires authentication", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns only the current user's safe payment records", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-self" });
    mockFindMany.mockResolvedValue([{
      id: "invoice-local",
      status: "paid",
      amountCents: 1900,
      currency: "usd",
      hostedInvoiceUrl: "https://invoice.stripe.com/i/example",
      invoicePdfUrl: null,
      createdAt: new Date("2026-07-29T12:00:00Z"),
    }]);

    const response = await GET();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(mockFindMany.mock.calls[0][0].where).toEqual({ userId: "user-self" });
    expect(payload.invoices[0]).toEqual({
      id: "invoice-local",
      status: "paid",
      amountMinor: 1900,
      currency: "USD",
      receiptUrl: "https://invoice.stripe.com/i/example",
      createdAt: "2026-07-29T12:00:00.000Z",
    });
    expect(JSON.stringify(payload)).not.toContain("providerInvoiceId");
  });

  it("does not expose a non-Stripe receipt URL", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-self" });
    mockFindMany.mockResolvedValue([{
      id: "invoice-local",
      status: "paid",
      amountCents: 1900,
      currency: "usd",
      hostedInvoiceUrl: "https://example.com/phishing",
      invoicePdfUrl: null,
      createdAt: new Date("2026-07-29T12:00:00Z"),
    }]);

    const payload = await (await GET()).json();
    expect(payload.invoices[0].receiptUrl).toBeNull();
  });
});
