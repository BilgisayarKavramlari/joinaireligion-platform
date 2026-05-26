# Resend Email Setup

- Resend API key alone is not enough for reliable production email delivery.
- Verify a sending domain in Resend.
- Add SPF and DKIM DNS records.
- Recommended sender: `onboarding@joinaireligion.com` or `hello@mail.joinaireligion.com`.
- Optional: add DMARC policy for stronger deliverability and spoof protection.
