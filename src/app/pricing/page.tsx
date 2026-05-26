"use client";

import { useState } from "react";

type Plan = "seeker" | "initiate";

async function checkout(plan: Plan): Promise<string> {
  const res = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    throw new Error("Unable to create checkout session");
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("No checkout URL returned");

  return data.url;
}

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const onChoose = async (plan: Plan) => {
    setLoadingPlan(plan);
    try {
      const url = await checkout(plan);
      window.location.href = url;
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="text-slate-300">Choose a monthly reflective practice plan.</p>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-slate-700 p-6">
            <h2 className="text-2xl font-medium">Seeker</h2>
            <p className="mt-2 text-slate-300">Entry-level symbolic reflection guidance.</p>
            <button
              className="mt-4 rounded-md bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500"
              onClick={() => onChoose("seeker")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "seeker" ? "Redirecting..." : "Choose Seeker"}
            </button>
          </article>

          <article className="rounded-xl border border-slate-700 p-6">
            <h2 className="text-2xl font-medium">Initiate</h2>
            <p className="mt-2 text-slate-300">Expanded journaling and reflective prompts.</p>
            <button
              className="mt-4 rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
              onClick={() => onChoose("initiate")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "initiate" ? "Redirecting..." : "Choose Initiate"}
            </button>
          </article>
        </div>

        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-5 text-sm text-violet-100">
          This is a fictional, educational, reflective platform. It is not a religious authority, medical care,
          or psychological treatment.
        </div>
      </section>
    </main>
  );
}
