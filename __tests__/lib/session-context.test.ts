import { readSessionUser } from "@/contexts/SessionContext";

describe("readSessionUser", () => {
  it("accepts a session payload with stable identity fields", () => {
    const user = readSessionUser({
      user: {
        id: "user_1",
        email: "seeker@example.com",
        displayName: null,
      },
    });

    expect(user).toMatchObject({ id: "user_1", email: "seeker@example.com" });
  });

  it.each([
    undefined,
    null,
    {},
    { user: null },
    { user: { id: "user_1" } },
    { user: { email: "seeker@example.com" } },
  ])("rejects malformed session payloads", (payload) => {
    expect(readSessionUser(payload)).toBeNull();
  });
});
