"use client";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function DonatePage() {
  const presets = [5, 10, 25, 50, 100];
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");

  async function startDonation() {
    if (amount < 3 || amount > 5000) {
      setMessage("Donation amount must be between 3 and 5000 USD.");
      return;
    }
    const response = await fetch("/api/stripe/create-donation-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, locale: localStorage.getItem("ui_locale") || "en" }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Failed to start checkout.");
    window.location.href = data.url;
  }

  return (
    <PageContainer>
      <Card className="mx-auto max-w-xl p-6">
        <h1 className="text-3xl font-semibold">Donate</h1>
        <p className="mt-2 text-slate-300">Minimum 3 USD, maximum 5000 USD.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button key={preset} variant="ghost" onClick={() => setAmount(preset)}>${preset}</Button>
          ))}
        </div>
        <div className="mt-4">
          <Input type="number" min={3} max={5000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <Button className="mt-4 w-full" onClick={startDonation}>Continue to Stripe Checkout</Button>
        {message && <div className="mt-3"><Alert text={message} tone="error" /></div>}
        <p className="mt-4 text-xs text-slate-400">Fictional educational reflective simulation platform disclaimer applies.</p>
      </Card>
    </PageContainer>
  );
}
