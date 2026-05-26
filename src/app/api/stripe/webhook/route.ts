import Stripe from "stripe";

import { requireEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    return new Response(`Webhook Error: ${String(error)}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      break;
    default:
      break;
  }

  return Response.json({ received: true, eventType: event.type });
}
