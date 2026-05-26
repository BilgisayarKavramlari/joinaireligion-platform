"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
function Inner(){ const token=useSearchParams().get('token')||''; const [msg,setMsg]=useState('Verifying...'); useEffect(()=>{(async()=>{const r=await fetch('/api/auth/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}); const d=await r.json(); setMsg(r.ok?'Email verified. You can login now.':(d.error||'Verification failed'));})();},[token]); return <main className="min-h-screen p-6"><div className="mx-auto max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6"><h1 className="text-3xl">Verify email</h1><p className="mt-3">{msg}</p></div></main>; }
export default function Page(){return <Suspense fallback={<main className="min-h-screen p-6">Loading...</main>}><Inner/></Suspense>;}
