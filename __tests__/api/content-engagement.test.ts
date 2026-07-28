jest.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://joinaireligion.com" },
}));

const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockAggregate = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    contentItem: { findFirst: mockFindFirst },
    contentFeedbackMetric: { create: mockCreate, aggregate: mockAggregate },
  },
}));

import { NextRequest } from "next/server";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "@/app/api/content/[id]/engagement/route";

function request(origin: string) {
  return new NextRequest("http://127.0.0.1:3001/api/content/content_1/engagement", {
    method: "POST",
    headers: {
      Origin: origin,
      Host: "joinaireligion.com",
      "X-Forwarded-Proto": "https",
      "Content-Type": "application/json",
      "X-Real-IP": "203.0.113.9",
    },
    body: JSON.stringify({ event: "view", locale: "en" }),
  });
}

describe("content engagement origin validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitForTests();
    mockFindFirst.mockResolvedValue({ id: "content_1" });
    mockCreate.mockResolvedValue({ id: "metric_1" });
    mockAggregate.mockResolvedValue({ _sum: { likes: 0 } });
  });

  it("accepts the public HTTPS origin behind the local reverse proxy", async () => {
    const response = await POST(request("https://joinaireligion.com"), { params: Promise.resolve({ id: "content_1" }) });

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ contentItemId: "content_1", views: 1, uniqueViews: 1 }),
    }));
  });

  it("rejects an unrelated origin", async () => {
    const response = await POST(request("https://attacker.example"), { params: Promise.resolve({ id: "content_1" }) });

    expect(response.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
