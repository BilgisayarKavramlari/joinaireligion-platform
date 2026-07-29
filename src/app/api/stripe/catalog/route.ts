import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getPriceIdForPlan, getStripeClient, type StripePlan } from "@/lib/stripe";

const CURRENCIES = ["usd", "try"] as const;

function amountFor(price: Stripe.Price, currency: string) {
  if (price.currency === currency) return price.unit_amount;
  return price.currency_options?.[currency]?.unit_amount ?? null;
}

export async function GET() {
  try {
    const stripe = getStripeClient();
    const plans = await Promise.all((["seeker", "initiate"] as const).map(async (plan: StripePlan) => {
      const price = await stripe.prices.retrieve(getPriceIdForPlan(plan));
      return {
        plan,
        recurring: price.recurring?.interval ?? null,
        amounts: Object.fromEntries(CURRENCIES.map((currency) => [currency, amountFor(price, currency)])),
      };
    }));

    const currencies = CURRENCIES.filter((currency) =>
      plans.every((item) => typeof item.amounts[currency] === "number"),
    );

    return NextResponse.json({ adaptivePricing: true, currencies, plans }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Failed to load public Stripe catalog", error);
    return NextResponse.json({ error: "Pricing is temporarily unavailable." }, { status: 503 });
  }
}
