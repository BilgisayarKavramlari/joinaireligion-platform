import Stripe from "stripe";

import { requireEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { db } from "@/lib/db";

/** Resolve Stripe customer email → userId */
async function resolveUserId(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !("email" in customer) || !customer.email) return null;
    const user = await db.user.findUnique({ where: { email: customer.email } });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    return new Response(`Webhook Error: ${String(error)}`, { status: 400 });
  }

  const stripe = getStripeClient();

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.customer || !session.subscription) break;
        const userId = await resolveUserId(stripe, session.customer as string);
        if (!userId) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price?.id ?? null;

        await db.subscription.upsert({
          where:  { userId },
          create: {
            userId,
            providerCustomerId:     session.customer as string,
            providerSubscriptionId: sub.id,
            providerPriceId:        priceId,
            providerProductId:      sub.items.data[0]?.price?.product as string ?? null,
            status:                 "ACTIVE",
            currentPeriodEnd:       new Date(sub.current_period_end * 1000),
          },
          update: {
            providerCustomerId:     session.customer as string,
            providerSubscriptionId: sub.id,
            providerPriceId:        priceId,
            status:                 "ACTIVE",
            currentPeriodEnd:       new Date(sub.current_period_end * 1000),
          },
        });

        // Upgrade lesson quota to daily for Initiate plan
        const initiatePrice = process.env.STRIPE_PRICE_INITIATE_MONTHLY;
        if (priceId === initiatePrice) {
          const now = new Date();
          await db.lessonQuota.upsert({
            where: { userId },
            create: {
              userId,
              periodStart:  now,
              periodEnd:    new Date(now.getTime() + 86400000),
              usedAttempts: 0,
              maxAttempts:  1,
            },
            update: {
              maxAttempts:  1,
              periodEnd:    new Date(now.getTime() + 86400000),
              lastResetAt:  now,
            },
          });
          // Log activity
          await db.userActivityLog.create({
            data: { userId, eventType: "BILLING", eventName: "initiate_upgrade", metadata: { priceId } },
          }).catch(() => undefined);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (!sub.customer) break;
        const userId = await resolveUserId(stripe, sub.customer as string);
        if (!userId) break;

        const statusMap: Record<string, "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED"> = {
          active:   "ACTIVE",
          trialing: "TRIAL",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          unpaid:   "PAST_DUE",
        };
        const dbStatus = statusMap[sub.status] ?? "ACTIVE";

        await db.subscription.upsert({
          where:  { userId },
          create: {
            userId,
            providerCustomerId:     sub.customer as string,
            providerSubscriptionId: sub.id,
            providerPriceId:        sub.items.data[0]?.price?.id ?? null,
            providerProductId:      sub.items.data[0]?.price?.product as string ?? null,
            status:                 dbStatus,
            currentPeriodEnd:       new Date(sub.current_period_end * 1000),
            canceledAt:             sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          },
          update: {
            status:          dbStatus,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            canceledAt:      sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            providerPriceId: sub.items.data[0]?.price?.id ?? null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (!sub.customer) break;
        const userId = await resolveUserId(stripe, sub.customer as string);
        if (!userId) break;

        await db.subscription.updateMany({
          where:  { userId },
          data:   { status: "CANCELED", canceledAt: new Date() },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.customer) break;
        const userId = await resolveUserId(stripe, invoice.customer as string);
        if (!userId) break;

        await db.invoiceRecord.upsert({
          where:  { providerInvoiceId: invoice.id },
          create: {
            userId,
            providerInvoiceId: invoice.id,
            status:            "paid",
            amountCents:       invoice.amount_paid,
          },
          update: {
            status:      "paid",
            amountCents: invoice.amount_paid,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.customer) break;
        const userId = await resolveUserId(stripe, invoice.customer as string);
        if (!userId) break;

        // Mark subscription past_due
        await db.subscription.updateMany({
          where:  { userId },
          data:   { status: "PAST_DUE" },
        });

        await db.invoiceRecord.upsert({
          where:  { providerInvoiceId: invoice.id },
          create: {
            userId,
            providerInvoiceId: invoice.id,
            status:            "failed",
            amountCents:       invoice.amount_due,
          },
          update: {
            status: "failed",
          },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Don't return 500 — Stripe would retry. Log and acknowledge.
  }

  return Response.json({ received: true, eventType: event.type });
}
