import { buildLandingFooterLinks } from "@/lib/public-navigation";

const labels = {
  pricing: "Pricing",
  donate: "Donate",
  promptGuide: "Your Journey",
  updates: "Updates",
  account: "Account",
  login: "Login",
  register: "Register",
};

describe("public navigation", () => {
  it("shows account instead of login and register for authenticated users", () => {
    const links = buildLandingFooterLinks(labels, "authenticated");

    expect(links).toContainEqual(["Account", "/account"]);
    expect(links).not.toContainEqual(["Login", "/login"]);
    expect(links).not.toContainEqual(["Register", "/register"]);
  });

  it("shows login and register for anonymous visitors", () => {
    const links = buildLandingFooterLinks(labels, "anonymous");

    expect(links).toContainEqual(["Login", "/login"]);
    expect(links).toContainEqual(["Register", "/register"]);
    expect(links).not.toContainEqual(["Account", "/account"]);
  });

  it("does not flash authentication actions while session state is unresolved", () => {
    for (const state of ["loading", "error"] as const) {
      const paths = buildLandingFooterLinks(labels, state).map(([, path]) => path);
      expect(paths).not.toContain("/login");
      expect(paths).not.toContain("/register");
      expect(paths).not.toContain("/account");
    }
  });
});
