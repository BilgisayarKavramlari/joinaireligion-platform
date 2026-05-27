"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed."); setLoading(false); return; }
      // Check if admin
      const me = await fetch("/api/auth/me").then((r) => r.ok ? r.json() : null);
      if (me?.user?.role === "ADMIN" || me?.user?.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        setError("Access denied. This account does not have admin privileges.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#04000c", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "#c9a227", textTransform: "uppercase" }}>✦ Sacred Administration ✦</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", color: "#ede8dc", margin: "0.5rem 0" }}>Admin Portal</h1>
          <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.4)" }}>Restricted access — authorized administrators only</p>
        </div>

        <form onSubmit={onSubmit} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,162,39,0.2)", borderRadius: "1rem", padding: "2rem" }}>
          <div style={{ marginBottom: "1.2rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", color: "rgba(237,232,220,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "0.5rem", border: "1px solid rgba(201,162,39,0.2)", background: "rgba(255,255,255,0.03)", color: "#ede8dc", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", color: "rgba(237,232,220,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "0.5rem", border: "1px solid rgba(201,162,39,0.2)", background: "rgba(255,255,255,0.03)", color: "#ede8dc", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: "0.82rem", marginBottom: "1.2rem" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.8rem", background: loading ? "rgba(201,162,39,0.4)" : "linear-gradient(135deg,#c9a227,#f0d47a)", color: "#04000c", border: "none", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Authenticating…" : "Enter Admin Portal"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.65rem", color: "rgba(237,232,220,0.2)", letterSpacing: "0.1em" }}>
          ALL ACTIONS LOGGED · UNAUTHORIZED ACCESS PROHIBITED
        </p>
      </div>
    </div>
  );
}
