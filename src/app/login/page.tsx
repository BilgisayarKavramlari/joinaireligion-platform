"use client";
import Link from "next/link";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Login failed.");
    else window.location.href = "/account";
    setLoading(false);
  }

  return (
    <PageContainer>
      <Card className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <FormField label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
          <FormField label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
          {error && <Alert text={error} tone="error" />}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm text-slate-300">
          <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
          <Link href="/register" className="hover:underline">Create account</Link>
        </div>
      </Card>
    </PageContainer>
  );
}
