import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { getCurrentUserFromRequest } from "@/lib/auth";
import { resolveSubscriptionPlan } from "@/lib/membership";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getStripeClient } from "@/lib/stripe";
import {
  getCheckoutSessionOwnerId,
  resolveSubscriptionOwnerId,
  StripeOwnershipError,
  syncStripeSubscription,
} from "@/lib/stripe/subscription-sync";

function subscriptionId(value: string | Stripe.Subscription | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function GET(request: NextRequest) {
  const ipLimit = checkRateLimit(`stripe:checkout-status:ip:${getClientIp(request)}`, { limit: 60, windowMs: 60 * 60_000 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);

  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() || "";
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]{8,}$/.test(sessionId)) {
    return NextResponse.json({ error: "A valid Checkout session id is required." }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== "subscription") {
      return NextResponse.json({ error: "Checkout session is not a membership purchase." }, { status: 400 });
    }
    if (getCheckoutSessionOwnerId(session) !== user.id) {
      return NextResponse.json({ error: "Checkout session does not belong to this account." }, { status: 403 });
    }

    let membership: Awaited<ReturnType<typeof syncStripeSubscription>> | null = null;
    const providerSubscriptionId = subscriptionId(session.subscription);
    if (providerSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(providerSubscriptionId);
      const ownerId = await resolveSubscriptionOwnerId(subscription, session);
      if (ownerId !== user.id) {
        return NextResponse.json({ error: "Subscription ownership could not be verified." }, { status: 403 });
      }
      membership = await syncStripeSubscription({ subscription, userId: user.id });
    }

    return NextResponse.json({
      checkout: {
        status: session.status,
        paymentStatus: session.payment_status,
      },
      membership: membership
        ? { status: membership.status, plan: membership.plan, active: membership.active }
        : {
            status: user.subscription?.status ?? null,
            plan: resolveSubscriptionPlan(user.subscription),
            active: user.subscription?.status === "ACTIVE",
          },
    });
  } catch (error) {
    if (error instanceof StripeOwnershipError) {
      return NextResponse.json({ error: "Checkout ownership could not be verified." }, { status: 403 });
    }
    console.error("Failed to reconcile Stripe Checkout status", error);
    return NextResponse.json({ error: "Unable to verify Checkout status." }, { status: 502 });
  }
}
