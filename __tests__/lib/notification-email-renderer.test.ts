import { renderContentPublishedEmail, renderLessonReadyEmail } from "@/lib/notifications/email-renderer";

describe("notification email renderer", () => {
  const base = {
    appUrl: "https://joinaireligion.com",
    unsubscribeToken: "unsubscribe-token",
    displayName: "Shedai",
  };

  it("renders a Turkish lesson notification with preference and unsubscribe links", () => {
    const email = renderLessonReadyEmail({
      ...base,
      locale: "tr",
      lessonId: "lesson-1",
      lessonTitle: "Dikkat ve anlam",
    });

    expect(email.subject).toContain("Yeni dersiniz hazır");
    expect(email.html).toContain("/lessons/lesson-1");
    expect(email.html).toContain("/account/preferences");
    expect(email.html).toContain("/api/unsubscribe?token=unsubscribe-token");
  });

  it("routes a published article to the exact selected locale", () => {
    const email = renderContentPublishedEmail({
      ...base,
      locale: "de",
      articleTitle: "Verantwortungsvolle Reflexion",
      articleSummary: "Eine sichere und offene Einführung.",
      articleSlug: "verantwortungsvolle-reflexion",
    });

    expect(email.subject).toContain("Eine neue Reflexion ist verfügbar");
    expect(email.text).toContain("/content/de/verantwortungsvolle-reflexion");
  });

  it("renders Arabic article mail as RTL and keeps the Arabic route", () => {
    const email = renderContentPublishedEmail({
      ...base,
      locale: "ar",
      articleTitle: "تأمل جديد",
      articleSummary: "مقدمة تعليمية قصيرة.",
      articleSlug: "تأمل-جديد",
    });

    expect(email.html).toContain('lang="ar" dir="rtl"');
    expect(email.text).toContain("/content/ar/");
  });

  it("escapes untrusted display and title values", () => {
    const email = renderLessonReadyEmail({
      ...base,
      displayName: "<script>alert(1)</script>",
      locale: "en",
      lessonId: "lesson-2",
      lessonTitle: "<img src=x onerror=alert(1)>",
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
