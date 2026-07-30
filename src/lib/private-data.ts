import crypto from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  const encoded = env.PRIVATE_DATA_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Private data encryption is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Private data encryption key must contain 32 bytes");
  return key;
}

export function encryptPrivatePayload(value: unknown): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPrivatePayload<T>(encoded: string): T {
  const [version, ivText, tagText, ciphertextText, ...extra] = encoded.split(".");
  if (version !== VERSION || !ivText || !tagText || !ciphertextText || extra.length > 0) {
    throw new Error("Unsupported private data envelope");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export const PRIVATE_DATA_ENCRYPTION_VERSION = 1;
