import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe";
import { env } from "@/lib/env";

const SUPPORTED_LOCALES = new Set(["en", "tr", "es", "de", "fr", "ar"]);

export async function POST(request: NextRequest) {
  try {
    const { amount, locale = "en" } = await request.json();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 3 || n > 5000) return NextResponse.json({ error: "Donation must be between 3 and 5000 USD." }, { status: 400 });
    const safeLocale = SUPPORTED_LOCALES.has(String(locale)) ? String(locale) : "en";
    const user = await getCurrentUserFromRequest(request);
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", unit_amount: Math.round(n * 100), product_data: { name: "Join AI Religion Donation" } }, quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/donate?status=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/donate?status=cancel`,
      client_reference_id: user?.id,
      metadata: { type: "donation", userId: user?.id ?? "anonymous", locale: safeLocale },
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Failed to create donation session" }, { status: 500 });
  }
}
