import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getPriceIdForPlan, stripe } from "@/lib/stripe";

type Plan = "seeker" | "initiate";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { plan?: Plan; email?: string };
    const plan = body.plan;

    if (plan !== "seeker" && plan !== "initiate") {
      return NextResponse.json({ error: "Invalid plan. Use seeker or initiate." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getPriceIdForPlan(plan), quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?status=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?status=cancel`,
      customer_email: body.email,
      metadata: { plan },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create checkout session.", details: String(error) }, { status: 500 });
  }
}
