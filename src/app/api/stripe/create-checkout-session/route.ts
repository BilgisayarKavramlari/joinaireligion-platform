import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromRequest } from "@/lib/auth";
import { env } from "@/lib/env";
import { hasActiveMembership, parseCheckoutCurrency } from "@/lib/membership";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getPriceIdForPlan, getStripeClient, type StripePlan } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const ipLimit = checkRateLimit(`stripe:checkout:ip:${getClientIp(request)}`, { limit: 20, windowMs: 60 * 60_000 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);
    const user = await getCurrentUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = (await request.json()) as { plan?: StripePlan; currency?: unknown };
    const plan = body.plan;
    const currency = parseCheckoutCurrency(body.currency);

    if (plan !== "seeker" && plan !== "initiate") {
      return NextResponse.json({ error: "Invalid plan. Use seeker or initiate." }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: "Invalid currency. Use usd or try." }, { status: 400 });
    }
    if (hasActiveMembership(user.subscription)) {
      return NextResponse.json({ error: "An active subscription already exists." }, { status: 409 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      currency,
      line_items: [{ price: getPriceIdForPlan(plan), quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?status=cancel`,
      ...(user.subscription?.providerCustomerId
        ? { customer: user.subscription.providerCustomerId }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      metadata: { plan, userId: user.id, currency },
      subscription_data: { metadata: { plan, userId: user.id, currency } },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("Failed to create Stripe Checkout session", error);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }
}
