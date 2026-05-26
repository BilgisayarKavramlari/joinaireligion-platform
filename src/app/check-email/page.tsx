"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function CheckEmailInner(){ const email=useSearchParams().get('email')||''; const [msg,setMsg]=useState(''); const resend=async()=>{const r=await fetch('/api/auth/resend-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}); const d=await r.json(); setMsg(r.ok? (d?.emailDelivery?.reason ? `Verification queued: ${d.emailDelivery.reason}` : 'Verification email sent.') : 'Unable to resend now.');}; return <main className="min-h-screen p-6"><div className="mx-auto max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6"><h1 className="text-3xl">Check your email</h1><p className="mt-2 text-slate-300">We sent a verification message to {email||'your address'}.</p><button onClick={resend} className="mt-4 rounded bg-violet-600 px-4 py-2">Resend verification email</button>{msg&&<p className="mt-2">{msg}</p>}</div></main>; }
export default function Page(){ return <Suspense fallback={<main className="min-h-screen p-6">Loading...</main>}><CheckEmailInner/></Suspense>; }
