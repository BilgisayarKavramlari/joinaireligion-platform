import crypto from "node:crypto";

const THREADS_SECRET = "threads-callback-test-secret";

jest.mock("@/lib/env", () => ({
  env: {
    THREADS_APP_SECRET: THREADS_SECRET,
    NEXT_PUBLIC_APP_URL: "https://joinaireligion.com",
  },
}));

import { POST as uninstall } from "@/app/api/social/threads/uninstall/route";
import { POST as requestDeletion } from "@/app/api/social/threads/delete/route";

function signedRequest(userId = "threads-user"): string {
  const payload = Buffer.from(JSON.stringify({
    algorithm: "HMAC-SHA256",
    user_id: userId,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", THREADS_SECRET).update(payload).digest("base64url");
  return `${signature}.${payload}`;
}

function callbackRequest(value: string): Request {
  return new Request("https://joinaireligion.com/api/social/threads/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ signed_request: value }),
  });
}

describe("Threads callback routes", () => {
  it("accepts a valid uninstall callback", async () => {
    const response = await uninstall(callbackRequest(signedRequest()) as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns Meta's deletion confirmation response", async () => {
    const response = await requestDeletion(callbackRequest(signedRequest()) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.confirmation_code).toMatch(/^[a-f0-9]{24}$/);
    expect(body.url).toBe(
      `https://joinaireligion.com/privacy?social_data_deletion=${body.confirmation_code}`,
    );
  });

  it("rejects an invalid signed request", async () => {
    const response = await uninstall(callbackRequest("invalid.payload") as never);
    expect(response.status).toBe(400);
  });
});
