"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, acceptedTerms }) });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Registration failed.");
    else router.push(data.next ?? `/check-email?email=${encodeURIComponent(email)}`);
    setLoading(false);
  }

  return (
    <PageContainer>
      <Card className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <FormField label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
          <FormField label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
          <label className="flex items-start gap-2 text-sm text-slate-300"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} /> I accept the <Link href="/legal/eula" className="underline">terms</Link>.</label>
          {error && <Alert text={error} tone="error" />}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
        </form>
        <p className="mt-4 text-sm text-slate-300">Already registered? <Link href="/login" className="underline">Login</Link></p>
      </Card>
    </PageContainer>
  );
}
