import type Stripe from "stripe";
import { SubscriptionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import {
  mapStripeSubscriptionStatus,
  resolveMembershipPlan,
  type MembershipPlan,
} from "@/lib/membership";

export class StripeOwnershipError extends Error {
  constructor(message = "Stripe object ownership could not be verified") {
    super(message);
    this.name = "StripeOwnershipError";
  }
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function productId(value: string | Stripe.Product | Stripe.DeletedProduct | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function getCheckoutSessionOwnerId(session: Stripe.Checkout.Session): string {
  const metadataUserId = session.metadata?.userId?.trim() || null;
  const referenceUserId = session.client_reference_id?.trim() || null;
  if (metadataUserId && referenceUserId && metadataUserId !== referenceUserId) {
    throw new StripeOwnershipError("Checkout metadata and client reference do not match");
  }
  const ownerId = metadataUserId || referenceUserId;
  if (!ownerId) throw new StripeOwnershipError("Checkout session has no owner reference");
  return ownerId;
}

export async function resolveSubscriptionOwnerId(
  subscription: Stripe.Subscription,
  checkoutSession?: Stripe.Checkout.Session,
): Promise<string | null> {
  const candidates = new Set<string>();
  if (checkoutSession) candidates.add(getCheckoutSessionOwnerId(checkoutSession));
  const metadataUserId = subscription.metadata?.userId?.trim();
  if (metadataUserId) candidates.add(metadataUserId);

  const providerCustomerId = customerId(subscription.customer);
  const existing = await db.subscription.findFirst({
    where: {
      OR: [
        { providerSubscriptionId: subscription.id },
        ...(providerCustomerId ? [{ providerCustomerId }] : []),
      ],
    },
    select: { userId: true },
  });
  if (existing?.userId) candidates.add(existing.userId);

  if (candidates.size > 1) throw new StripeOwnershipError("Stripe ownership references conflict");
  const userId = [...candidates][0];
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  return user?.id ?? null;
}

export async function resolveExistingBillingOwnerId(input: {
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
}): Promise<string | null> {
  const filters = [
    ...(input.providerCustomerId ? [{ providerCustomerId: input.providerCustomerId }] : []),
    ...(input.providerSubscriptionId ? [{ providerSubscriptionId: input.providerSubscriptionId }] : []),
  ];
  if (filters.length === 0) return null;
  const subscription = await db.subscription.findFirst({ where: { OR: filters }, select: { userId: true } });
  return subscription?.userId ?? null;
}

export type SubscriptionSyncResult = {
  userId: string;
  status: SubscriptionStatus;
  plan: MembershipPlan | null;
  active: boolean;
};

export async function syncStripeSubscription(input: {
  subscription: Stripe.Subscription;
  userId: string;
  now?: Date;
}): Promise<SubscriptionSyncResult> {
  const { subscription, userId } = input;
  const metadataUserId = subscription.metadata?.userId?.trim();
  if (metadataUserId && metadataUserId !== userId) {
    throw new StripeOwnershipError("Subscription metadata belongs to another user");
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = resolveMembershipPlan(priceId);
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);
  // An unknown live Price must not unlock membership even if Stripe says active.
  const status = mappedStatus === SubscriptionStatus.ACTIVE && !plan
    ? SubscriptionStatus.PAST_DUE
    : mappedStatus;
  const providerCustomerId = customerId(subscription.customer);
  if (!providerCustomerId) throw new StripeOwnershipError("Subscription has no customer");

  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { status: true, providerPriceId: true },
  });
  const previouslyActiveInitiate = existing?.status === SubscriptionStatus.ACTIVE
    && resolveMembershipPlan(existing.providerPriceId) === "initiate";
  const now = input.now ?? new Date();

  await db.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { userId },
      create: {
        userId,
        providerCustomerId,
        providerSubscriptionId: subscription.id,
        providerPriceId: priceId,
        providerProductId: productId(item?.price?.product ?? null),
        planCode: plan,
        providerStatus: subscription.status,
        lastPaymentStatus: subscription.status,
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
      update: {
        providerCustomerId,
        providerSubscriptionId: subscription.id,
        providerPriceId: priceId,
        providerProductId: productId(item?.price?.product ?? null),
        planCode: plan,
        providerStatus: subscription.status,
        lastPaymentStatus: subscription.status,
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    if (status === SubscriptionStatus.ACTIVE && plan === "initiate") {
      await tx.lessonQuota.upsert({
        where: { userId },
        create: {
          userId,
          periodStart: now,
          periodEnd: new Date(now.getTime() + 86_400_000),
          usedAttempts: 0,
          maxAttempts: 1,
        },
        update: previouslyActiveInitiate
          ? { maxAttempts: 1 }
          : {
            periodStart: now,
            periodEnd: new Date(now.getTime() + 86_400_000),
            usedAttempts: 0,
            maxAttempts: 1,
            lastResetAt: now,
          },
      });
    }
  });
  return { userId, status, plan, active: status === SubscriptionStatus.ACTIVE };
}
