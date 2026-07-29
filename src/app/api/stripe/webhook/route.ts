import type Stripe from "stripe";

import { requireEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  resolveExistingBillingOwnerId,
  resolveSubscriptionOwnerId,
  StripeOwnershipError,
  syncStripeSubscription,
} from "@/lib/stripe/subscription-sync";

type EventClaim = "claimed" | "processed" | "busy";

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function eventObjectId(event: Stripe.Event): string | null {
  const object = event.data.object as { id?: unknown };
  return typeof object.id === "string" ? object.id : null;
}

async function claimEvent(event: Stripe.Event): Promise<EventClaim> {
  try {
    await db.stripeWebhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        providerObjectId: eventObjectId(event),
        status: "processing",
        payload: { livemode: event.livemode, created: event.created },
      },
    });
    return "claimed";
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  const existing = await db.stripeWebhookEvent.findUnique({ where: { eventId: event.id } });
  if (existing?.status === "processed") return "processed";
  if (existing?.status !== "failed") return "busy";

  const retry = await db.stripeWebhookEvent.updateMany({
    where: { eventId: event.id, status: "failed" },
    data: {
      status: "processing",
      eventType: event.type,
      providerObjectId: eventObjectId(event),
    },
  });
  return retry.count === 1 ? "claimed" : "busy";
}

function stripeId(value: { id: string } | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function retrieveCurrentSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  allowDeletedFallback = false,
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscription.id);
  } catch (error) {
    if (allowDeletedFallback && subscription.status === "canceled") return subscription;
    throw error;
  }
}

async function syncSubscriptionEvent(stripe: Stripe, eventSubscription: Stripe.Subscription, allowDeletedFallback = false) {
  const subscription = await retrieveCurrentSubscription(stripe, eventSubscription, allowDeletedFallback);
  const userId = await resolveSubscriptionOwnerId(subscription);
  if (!userId) throw new StripeOwnershipError("Subscription has no verified local owner");
  return syncStripeSubscription({ subscription, userId });
}

async function resolveInvoiceOwner(stripe: Stripe, invoice: Stripe.Invoice): Promise<string | null> {
  const providerSubscriptionId = stripeId(invoice.subscription);
  if (providerSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(providerSubscriptionId);
    const userId = await resolveSubscriptionOwnerId(subscription);
    if (!userId) return null;
    await syncStripeSubscription({ subscription, userId });
    return userId;
  }
  return resolveExistingBillingOwnerId({ providerCustomerId: stripeId(invoice.customer) });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  const rawBody = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  let claim: EventClaim;
  try {
    claim = await claimEvent(event);
  } catch (error) {
    console.error("Unable to claim Stripe webhook event", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
  if (claim === "processed") {
    return Response.json({ received: true, duplicate: true, eventType: event.type });
  }
  if (claim === "busy") {
    return Response.json({ error: "Webhook event is already processing." }, { status: 409 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const providerSubscriptionId = stripeId(session.subscription);
        if (!providerSubscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(providerSubscriptionId);
        const userId = await resolveSubscriptionOwnerId(subscription, session);
        if (!userId) throw new StripeOwnershipError("Checkout session has no verified local owner");
        await syncStripeSubscription({ subscription, userId });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscriptionEvent(stripe, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await syncSubscriptionEvent(stripe, event.data.object as Stripe.Subscription, true);
        break;

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await resolveInvoiceOwner(stripe, invoice);
        if (!userId) break;
        const paid = event.type === "invoice.payment_succeeded";
        await db.invoiceRecord.upsert({
          where: { providerInvoiceId: invoice.id },
          create: {
            userId,
            providerInvoiceId: invoice.id,
            status: paid ? "paid" : "failed",
            amountCents: paid ? invoice.amount_paid : invoice.amount_due,
            currency: invoice.currency,
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdfUrl: invoice.invoice_pdf,
          },
          update: {
            status: paid ? "paid" : "failed",
            amountCents: paid ? invoice.amount_paid : invoice.amount_due,
            currency: invoice.currency,
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdfUrl: invoice.invoice_pdf,
          },
        });
        break;
      }

      default:
        break;
    }

    await db.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: {
        eventType: event.type,
        providerObjectId: eventObjectId(event),
        status: "processed",
        processedAt: new Date(),
        payload: { livemode: event.livemode, created: event.created },
      },
    });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    await db.stripeWebhookEvent.updateMany({
      where: { eventId: event.id, status: "processing" },
      data: {
        eventType: event.type,
        providerObjectId: eventObjectId(event),
        status: "failed",
        processedAt: null,
        payload: { livemode: event.livemode, created: event.created },
      },
    }).catch(() => undefined);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return Response.json({ received: true, eventType: event.type });
}
