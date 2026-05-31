import { classifySupportTicket } from "@/lib/cron/support-ticket-classifier";

describe("classifySupportTicket", () => {
  it("classifies billing issues", () => {
    expect(classifySupportTicket("I was charged twice and need a refund for my subscription.")).toBe("BILLING");
  });

  it("classifies account issues", () => {
    expect(classifySupportTicket("I cannot access my account and the reset password email never arrives.")).toBe("ACCOUNT");
  });

  it("classifies i18n issues", () => {
    expect(classifySupportTicket("The onboarding is still in English and the Turkish translation is missing.")).toBe("I18N");
  });

  it("classifies bug issues", () => {
    expect(classifySupportTicket("The lesson page crashes with a 500 error and does not work.")).toBe("BUG");
  });

  it("classifies ux issues", () => {
    expect(classifySupportTicket("The navigation is confusing and the button is hard to find on mobile.")).toBe("UX");
  });

  it("classifies content issues", () => {
    expect(classifySupportTicket("Lesson 1 content is empty and there is a typo in the practice prompt text.")).toBe("CONTENT");
  });

  it("classifies obvious spam", () => {
    expect(classifySupportTicket("Buy now http://spam.example http://spam2.example free money")).toBe("SPAM");
  });

  it("falls back to OTHER when no rule matches", () => {
    expect(classifySupportTicket("I wanted to share a general thought about the project direction.")).toBe("OTHER");
  });

  it("uses deterministic precedence when multiple categories appear", () => {
    expect(classifySupportTicket("My subscription payment failed and now I cannot log in.")).toBe("BILLING");
  });
});
