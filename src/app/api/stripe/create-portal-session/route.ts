import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe";
import { env } from "@/lib/env";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ipLimit = checkRateLimit(`stripe:portal:ip:${getClientIp(request)}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.subscription?.providerCustomerId) return NextResponse.json({ error: "No billing customer found." }, { status: 400 });
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({ customer: user.subscription.providerCustomerId, return_url: `${env.NEXT_PUBLIC_APP_URL}/account/billing` });
  return NextResponse.json({ url: session.url });
}
