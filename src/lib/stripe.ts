import Stripe from "stripe";

import { requireEnv } from "@/lib/env";

export type StripePlan = "seeker" | "initiate";

export function getStripeClient(): Stripe {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-04-30.basil",
  });
}

export function getPriceIdForPlan(plan: StripePlan): string {
  if (plan === "seeker") return requireEnv("STRIPE_PRICE_SEEKER_MONTHLY");
  return requireEnv("STRIPE_PRICE_INITIATE_MONTHLY");
}
