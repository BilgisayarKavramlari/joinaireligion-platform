import { classifySupportTicketRecommendedAction } from "@/lib/cron/support-ticket-action";

describe("classifySupportTicketRecommendedAction", () => {
  it("marks spam as MARK_SPAM", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "Buy now spam spam spam",
        "SPAM",
        "LOW"
      )
    ).toBe("MARK_SPAM");
  });

  it("creates coding tasks for severe bugs", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "The lesson flow is broken with a 500 error.",
        "BUG",
        "HIGH"
      )
    ).toBe("CREATE_CODING_TASK");
  });

  it("escalates account access issues to admin", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "I cannot access my account and I am locked out.",
        "ACCOUNT",
        "HIGH"
      )
    ).toBe("ESCALATE_TO_ADMIN");
  });

  it("escalates billing/refund issues to admin", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "I was charged twice and need a refund.",
        "BILLING",
        "HIGH"
      )
    ).toBe("ESCALATE_TO_ADMIN");
  });

  it("allows low-risk account questions to stay as draft replies", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "How do I change my password?",
        "ACCOUNT",
        "LOW"
      )
    ).toBe("AUTO_REPLY_DRAFT");
  });

  it("uses AUTO_REPLY_DRAFT for low-risk ux issues", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "The button spacing looks a little off on mobile.",
        "UX",
        "LOW"
      )
    ).toBe("AUTO_REPLY_DRAFT");
  });

  it("uses MONITOR for medium i18n/content/ux issues", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "The onboarding is still in English on one page.",
        "I18N",
        "MEDIUM"
      )
    ).toBe("MONITOR");
  });

  it("escalates privacy/legal issues even outside account/billing categories", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "This is a privacy issue and I want to delete my data immediately.",
        "OTHER",
        "CRITICAL"
      )
    ).toBe("ESCALATE_TO_ADMIN");
  });

  it("monitors benign other-category suggestions", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "Just feedback: general thought for future improvement, fyi.",
        "OTHER",
        "MEDIUM"
      )
    ).toBe("MONITOR");
  });

  it("escalates unclear other-category issues by default", () => {
    expect(
      classifySupportTicketRecommendedAction(
        "Something is wrong and I need help.",
        "OTHER",
        "MEDIUM"
      )
    ).toBe("ESCALATE_TO_ADMIN");
  });
});
