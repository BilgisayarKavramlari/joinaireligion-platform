import { classifySupportTicketSeverity } from "@/lib/cron/support-ticket-severity";

describe("classifySupportTicketSeverity", () => {
  it("marks ordinary billing/refund issues as HIGH", () => {
    expect(
      classifySupportTicketSeverity(
        "I was charged twice and need a refund for this payment problem.",
        "BILLING"
      )
    ).toBe("HIGH");
  });

  it("downgrades clearly informational billing questions to MEDIUM", () => {
    expect(
      classifySupportTicketSeverity(
        "Question about billing: how do I update my credit card for my subscription?",
        "BILLING"
      )
    ).toBe("MEDIUM");
  });

  it("marks account access problems as HIGH", () => {
    expect(
      classifySupportTicketSeverity(
        "I cannot access my account and the reset password flow is broken.",
        "ACCOUNT"
      )
    ).toBe("HIGH");
  });

  it("marks severe security/privacy wording as CRITICAL", () => {
    expect(
      classifySupportTicketSeverity(
        "I think my account was hacked and I need to delete my data because of a privacy breach.",
        "ACCOUNT"
      )
    ).toBe("CRITICAL");
  });

  it("marks broken core bug flows as HIGH", () => {
    expect(
      classifySupportTicketSeverity(
        "Onboarding is broken and I cannot access the lesson after login because of a 500 error.",
        "BUG"
      )
    ).toBe("HIGH");
  });

  it("marks content blockers as HIGH", () => {
    expect(
      classifySupportTicketSeverity(
        "Lesson 1 is empty and I cannot access the lesson content at all.",
        "CONTENT"
      )
    ).toBe("HIGH");
  });

  it("marks minor translation issues as LOW", () => {
    expect(
      classifySupportTicketSeverity(
        "There is a small translation typo in the Turkish copy.",
        "I18N"
      )
    ).toBe("LOW");
  });

  it("marks larger untranslated i18n issues as MEDIUM", () => {
    expect(
      classifySupportTicketSeverity(
        "The onboarding is still in English and the entire page is untranslated.",
        "I18N"
      )
    ).toBe("MEDIUM");
  });

  it("marks cosmetic ux issues as LOW", () => {
    expect(
      classifySupportTicketSeverity(
        "The button spacing and alignment look off on mobile.",
        "UX"
      )
    ).toBe("LOW");
  });

  it("marks threatening spam as CRITICAL before category heuristics", () => {
    expect(
      classifySupportTicketSeverity(
        "This is abuse and a legal threat unless you respond immediately.",
        "SPAM"
      )
    ).toBe("CRITICAL");
  });
});
