jest.mock("@/lib/env", () => ({
  env: { PRIVATE_DATA_ENCRYPTION_KEY: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=" },
}));

import { decryptPrivatePayload, encryptPrivatePayload } from "@/lib/private-data";

describe("private data encryption", () => {
  it("round-trips structured content without storing plaintext", () => {
    const value = { title: "Private reflection", body: "A thought that must stay private", tags: ["journal"] };
    const encrypted = encryptPrivatePayload(value);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain(value.title);
    expect(encrypted).not.toContain(value.body);
    expect(decryptPrivatePayload(encrypted)).toEqual(value);
  });

  it("rejects modified ciphertext", () => {
    const encrypted = encryptPrivatePayload({ body: "private" });
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
    expect(() => decryptPrivatePayload(tampered)).toThrow();
  });
});
