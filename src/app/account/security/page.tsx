"use client";

import Link from "next/link";
import { useState } from "react";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredAlert } from "@/components/ui/SacredPage";

export default function SecurityPage() {
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState<{ text: string; tone: "success" | "error" } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setMsg({ text: "New passwords do not match.", tone: "error" }); return; }
    if (newPw.length < 8)    { setMsg({ text: "Password must be at least 8 characters.", tone: "error" }); return; }
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const d = await res.json();
    setMsg(res.ok ? { text: "Your password has been updated.", tone: "success" } : { text: d.error || "Failed to update password.", tone: "error" });
    setSaving(false);
    if (res.ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  }

  return (
    <SacredPage maxWidth={680}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← Account Dashboard
        </Link>
      </div>

      <SacredHeading
        label="Sacred Security"
        title="Account Security"
        subtitle="Protect your sacred passage with a strong password. Your account security is your responsibility."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {/* Change password */}
        <SacredCard glow>
          <h3 className="font-sacred" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gold-light)", marginBottom: "1.2rem", letterSpacing: "0.08em" }}>
            🔑 Change Password
          </h3>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <SacredInput
              label="Current Password"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Your current password"
              required
            />
            <SacredInput
              label="New Password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
            <SacredInput
              label="Confirm New Password"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
              required
            />
            {msg && <SacredAlert text={msg.text} tone={msg.tone} />}
            <button
              type="submit"
              className="btn-sacred btn-sacred-gold"
              disabled={saving}
              style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem" }}
            >
              {saving ? "Updating…" : "✦ Update Password ✦"}
            </button>
          </form>
        </SacredCard>

        {/* Security info */}
        <SacredCard>
          <h3 className="font-sacred" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gold-light)", marginBottom: "1rem", letterSpacing: "0.08em" }}>
            🛡️ Security Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { icon: "✦", label: "Two-Factor Authentication", value: "Not configured", note: "Coming soon" },
              { icon: "✦", label: "Active Sessions",           value: "1 session",       note: "Current device" },
              { icon: "✦", label: "Last Password Change",      value: "Never",           note: "" },
            ].map(({ icon, label, value, note }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.7rem 0.9rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "0.6rem",
                border: "1px solid rgba(201,162,39,0.1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <span style={{ color: "var(--gold)", fontSize: "0.7rem" }}>{icon}</span>
                  <span style={{ fontSize: "0.8rem", color: "rgba(237,232,220,0.65)" }}>{label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}>{value}</div>
                  {note && <div style={{ fontSize: "0.65rem", color: "rgba(237,232,220,0.35)" }}>{note}</div>}
                </div>
              </div>
            ))}
          </div>
        </SacredCard>

        {/* Forgot password */}
        <SacredAlert
          text="Forgot your current password? Use the forgot password flow from the login page to reset it securely."
          tone="info"
        />
      </div>
    </SacredPage>
  );
}
