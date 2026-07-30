import crypto from "node:crypto";

export type MetaSignedRequestPayload = {
  algorithm?: string;
  user_id?: string;
  [key: string]: unknown;
};

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function verifyMetaSignedRequest(
  signedRequest: string,
  appSecret: string,
): MetaSignedRequestPayload | null {
  const [encodedSignature, encodedPayload, extra] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload || extra) return null;

  let suppliedSignature: Buffer;
  let payload: MetaSignedRequestPayload;
  try {
    suppliedSignature = decodeBase64Url(encodedSignature);
    payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as MetaSignedRequestPayload;
  } catch {
    return null;
  }

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") return null;

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  if (
    suppliedSignature.length !== expectedSignature.length
    || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  return payload;
}

export function createDeletionConfirmationCode(userId: string, appSecret: string): string {
  return crypto
    .createHmac("sha256", appSecret)
    .update(`threads-data-deletion:${userId}`)
    .digest("hex")
    .slice(0, 24);
}
