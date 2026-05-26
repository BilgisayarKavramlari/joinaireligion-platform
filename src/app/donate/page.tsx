"use client";
import { useState } from "react";

export default function DonatePage() {
  const presets = [5, 10, 25, 50, 100];
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState("");
  const submit = async () => {
    if (amount < 3 || amount > 5000) return setMsg("Amount must be between 3 and 5000 USD.");
    const r = await fetch("/api/stripe/create-donation-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, locale: localStorage.getItem("ui_locale") || "en" }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error || "Unable to start donation checkout.");
    window.location.href = d.url;
  };
  return <main className="min-h-screen bg-gradient-to-b from-slate-950 to-indigo-950 p-6 text-white"><div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-900/60 p-6"><h1 className="text-3xl font-semibold">Donate</h1><p className="mt-2 text-slate-300">Support this fictional educational reflective simulation platform.</p><div className="mt-4 flex flex-wrap gap-2">{presets.map(v=><button key={v} onClick={()=>setAmount(v)} className="rounded bg-slate-800 px-3 py-2">${v}</button>)}</div><input type="number" min={3} max={5000} value={amount} onChange={e=>setAmount(Number(e.target.value))} className="mt-4 w-full rounded bg-slate-950 p-2"/><button onClick={submit} className="mt-4 w-full rounded bg-violet-600 p-2">Continue to Stripe Checkout</button>{msg&&<p className="mt-2 text-amber-300">{msg}</p>}</div></main>;
}
