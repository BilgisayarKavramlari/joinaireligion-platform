/**
 * email-renderer.ts
 *
 * Produces the final deliverable email from a generated PracticeMessage.
 *
 * Responsibilities:
 *   1. Accept the stored practice content (subject, bodyText, bodyHtml) and
 *      per-user delivery metadata (locale, unsubscribeToken, appUrl).
 *   2. Inject a response link, an unsubscribe link, and a safety footer into
 *      both the HTML and plain-text variants.
 *   3. Return strings that can be handed directly to an email provider.
 *
 * Supported locales: "en" (English), "tr" (Turkish).  All other locales fall
 * back to "en".
 *
 * No database calls — pure function, easy to unit-test.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type EmailRenderInput = {
  /** PracticeMessage.id — used to construct the response URL */
  messageId: string;
  /** Stored subject line from practice-builder */
  subject: string;
  /** Stored HTML body from practice-builder */
  bodyHtml: string;
  /** Stored plain-text body from practice-builder */
  bodyText: string;
  /** User.displayName (falls back to "Seeker") */
  displayName: string;
  /** User.preferredEmailLocale (default "en") */
  locale: string;
  /** User.unsubscribeToken — null if token not yet generated */
  unsubscribeToken: string | null;
  /** env.NEXT_PUBLIC_APP_URL */
  appUrl: string;
};

export type EmailRenderOutput = {
  subject: string;
  html: string;
  text: string;
};

// ─── i18n strings ──────────────────────────────────────────────────────────────

type I18nStrings = {
  respondCta: string;
  respondSubtext: string;
  unsubscribeLabel: string;
  safetyFooter: string;
  noTokenNote: string;
};

const STRINGS: Record<string, I18nStrings> = {
  en: {
    respondCta: "Share your reflection",
    respondSubtext:
      "Reply with what arose for you during this practice. Your reflection earns XP and becomes part of your journey record.",
    unsubscribeLabel: "Unsubscribe from practice emails",
    safetyFooter:
      "This email was sent by JoinAI because you opted in to contemplative practice messages. " +
      "We will never share your data. If you are in distress, please reach out to a trusted person or a crisis line in your country.",
    noTokenNote: "To unsubscribe, log in to your account and update your email preferences.",
  },
  tr: {
    respondCta: "Düşüncenizi paylaşın",
    respondSubtext:
      "Bu pratik sırasında içinizde neler olduğunu yanıtlayın. Düşünceniz XP kazandırır ve yolculuk kaydınızın bir parçası olur.",
    unsubscribeLabel: "Pratik e-postalarından aboneliği iptal et",
    safetyFooter:
      "Bu e-posta, düşünce pratiği mesajlarına abone olduğunuz için JoinAI tarafından gönderildi. " +
      "Verilerinizi asla paylaşmayız. Zor bir dönemdeyseniz lütfen güvendiğiniz birine veya ülkenizdeki bir kriz hattına başvurun.",
    noTokenNote: "Aboneliği iptal etmek için hesabınıza giriş yapın ve e-posta tercihlerinizi güncelleyin.",
  },
};

function getStrings(locale: string): I18nStrings {
  return STRINGS[locale] ?? STRINGS["en"];
}

// ─── URL builders ──────────────────────────────────────────────────────────────

function responseUrl(appUrl: string, messageId: string): string {
  return `${appUrl}/practice/respond/${messageId}`;
}

function unsubscribeUrl(appUrl: string, token: string): string {
  return `${appUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

// ─── HTML injection ────────────────────────────────────────────────────────────

/**
 * Injects the response-link block, unsubscribe link, and safety footer into
 * the HTML email produced by practice-builder before the closing </div></body>.
 *
 * The injection point is the end of the `.wrap` container in practice-builder's
 * template: the last </div> before </body>.
 */
function injectIntoHtml(
  bodyHtml: string,
  respondHref: string,
  unsubscribeHref: string | null,
  s: I18nStrings
): string {
  const responseBlock = `
  <div style="text-align:center;margin:32px 0 24px;">
    <a href="${respondHref}"
       style="display:inline-block;background:#c9a227;color:#0a0614;font-family:system-ui,sans-serif;
              font-weight:600;font-size:0.9rem;letter-spacing:0.04em;text-decoration:none;
              padding:12px 28px;border-radius:4px;">
      ${s.respondCta}
    </a>
    <p style="margin:12px 0 0;font-size:0.8rem;color:rgba(237,232,220,0.5);font-family:system-ui,sans-serif;line-height:1.5;">
      ${s.respondSubtext}
    </p>
  </div>

  <div style="margin-top:40px;padding-top:20px;border-top:1px solid rgba(201,162,39,0.1);
              font-size:0.75rem;color:rgba(237,232,220,0.3);font-family:system-ui,sans-serif;
              text-align:center;line-height:1.7;">
    <p style="margin:0 0 6px;">${s.safetyFooter}</p>
    ${
      unsubscribeHref
        ? `<p style="margin:0;"><a href="${unsubscribeHref}"
              style="color:rgba(201,162,39,0.5);text-decoration:underline;">${s.unsubscribeLabel}</a></p>`
        : `<p style="margin:0;">${s.noTokenNote}</p>`
    }
  </div>`;

  // Replace the placeholder footer line from practice-builder if present
  const cleaned = bodyHtml.replace(
    /<span class="gold">Placeholder content[^<]*<\/span>/g,
    "JoinAI &nbsp;·&nbsp; Your Personalised Contemplative Path"
  );

  // Inject before the last </div> that closes the .wrap container, just before </body>
  const insertBefore = "</div>\n</body>";
  const idx = cleaned.lastIndexOf(insertBefore);
  if (idx !== -1) {
    return cleaned.slice(0, idx) + responseBlock + "\n" + cleaned.slice(idx);
  }
  // Fallback: append before </body>
  return cleaned.replace("</body>", responseBlock + "\n</body>");
}

// ─── Plain-text injection ──────────────────────────────────────────────────────

function injectIntoText(
  bodyText: string,
  respondHref: string,
  unsubscribeHref: string | null,
  s: I18nStrings
): string {
  const lines = [
    "",
    "─────────────────────────────────",
    "",
    `${s.respondCta}: ${respondHref}`,
    "",
    s.respondSubtext,
    "",
    "─────────────────────────────────",
    "",
    s.safetyFooter,
    "",
    unsubscribeHref
      ? `${s.unsubscribeLabel}: ${unsubscribeHref}`
      : s.noTokenNote,
  ];
  return bodyText + lines.join("\n");
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Renders the final sendable email from a stored PracticeMessage + user metadata.
 * Pure function — no side effects.
 */
export function renderEmail(input: EmailRenderInput): EmailRenderOutput {
  const s = getStrings(input.locale);
  const respondHref = responseUrl(input.appUrl, input.messageId);
  const unsubHref = input.unsubscribeToken
    ? unsubscribeUrl(input.appUrl, input.unsubscribeToken)
    : null;

  return {
    subject: input.subject,
    html: injectIntoHtml(input.bodyHtml, respondHref, unsubHref, s),
    text: injectIntoText(input.bodyText, respondHref, unsubHref, s),
  };
}
