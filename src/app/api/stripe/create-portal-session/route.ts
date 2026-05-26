import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { email }, include: { subscription: true } });
  if (!user?.subscription?.providerCustomerId) return NextResponse.json({ error: "No billing customer found." }, { status: 400 });
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({ customer: user.subscription.providerCustomerId, return_url: `${env.NEXT_PUBLIC_APP_URL}/account/billing` });
  return NextResponse.json({ url: session.url });
}
