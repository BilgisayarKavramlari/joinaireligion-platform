import crypto from "node:crypto";
import {
  createDeletionConfirmationCode,
  verifyMetaSignedRequest,
} from "@/lib/meta-signed-request";

const SECRET = "threads-test-secret";

function sign(payload: Record<string, unknown>, secret = SECRET): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${signature}.${encodedPayload}`;
}

describe("Meta signed requests", () => {
  it("accepts a valid HMAC-SHA256 signed payload", () => {
    expect(verifyMetaSignedRequest(sign({ algorithm: "HMAC-SHA256", user_id: "threads-user" }), SECRET))
      .toEqual({ algorithm: "HMAC-SHA256", user_id: "threads-user" });
  });

  it("rejects a tampered signature", () => {
    const signed = sign({ algorithm: "HMAC-SHA256", user_id: "threads-user" });
    expect(verifyMetaSignedRequest(`x${signed.slice(1)}`, SECRET)).toBeNull();
  });

  it("rejects an unsupported algorithm", () => {
    expect(verifyMetaSignedRequest(sign({ algorithm: "HMAC-SHA1", user_id: "threads-user" }), SECRET))
      .toBeNull();
  });

  it("creates stable, non-identifying confirmation codes", () => {
    const code = createDeletionConfirmationCode("threads-user", SECRET);
    expect(code).toHaveLength(24);
    expect(code).toBe(createDeletionConfirmationCode("threads-user", SECRET));
    expect(code).not.toContain("threads-user");
  });
});
