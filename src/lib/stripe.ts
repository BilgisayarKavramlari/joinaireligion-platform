import Stripe from "stripe";

import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

export function getPriceIdForPlan(plan: "seeker" | "initiate"): string {
  if (plan === "seeker") return env.STRIPE_PRICE_SEEKER_MONTHLY;
  return env.STRIPE_PRICE_INITIATE_MONTHLY;
}
