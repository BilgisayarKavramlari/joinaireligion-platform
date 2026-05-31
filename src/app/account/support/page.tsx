"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SacredPage, SacredCard } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

interface SupportReplyEntry {
  id: string;
  status: string;
  body: string;
  createdAt: string;
}

interface SupportTicketEntry {
  id: string;
  category: string;
  status: string;
  message: string;
  createdAt: string;
  supportReplies: SupportReplyEntry[];
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}

export default function AccountSupportPage() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me?.user) {
          setAuthed(false);
          setLoading(false);
          return;
        }

        setAuthed(true);
        fetch("/api/account/support")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            setTickets(data?.tickets || []);
            setLoading(false);
          });
      });
  }, []);

  if (loading) {
    return (
      <SacredPage maxWidth={900}>
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>{t.common.loading}</div>
      </SacredPage>
    );
  }

  return (
    <SacredPage maxWidth={900}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.8rem" }}>
          ✦ Sacred Support ✦
        </p>
        <h1 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.8rem" }}>
          {t.account.supportTitle}
        </h1>
        <p style={{ fontSize: "0.9rem", color: "rgba(237,232,220,0.52)", maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
          {t.account.supportSubtitle}
        </p>
      </div>

      {!authed ? (
        <SacredCard>
          <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.6)", lineHeight: 1.7, marginBottom: "1rem" }}>
            {t.account.supportSignInRequired}
          </p>
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <Link href="/login" className="btn-sacred btn-sacred-gold" style={{ textDecoration: "none", padding: "0.7rem 1.6rem", fontSize: "0.85rem" }}>
              {t.auth.login}
            </Link>
            <Link href="/account" className="btn-sacred btn-sacred-ghost" style={{ textDecoration: "none", padding: "0.7rem 1.6rem", fontSize: "0.85rem" }}>
              {t.common.back}
            </Link>
          </div>
        </SacredCard>
      ) : tickets.length === 0 ? (
        <SacredCard>
          <p style={{ fontSize: "0.86rem", color: "rgba(237,232,220,0.55)", lineHeight: 1.7 }}>
            {t.account.supportEmpty}
          </p>
        </SacredCard>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {tickets.map((ticket) => (
            <SacredCard key={ticket.id}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", alignItems: "center", marginBottom: "0.7rem" }}>
                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.66rem", background: "rgba(201,162,39,0.12)", color: "var(--gold)", border: "1px solid rgba(201,162,39,0.2)" }}>
                  {formatLabel(ticket.category)}
                </span>
                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.66rem", background: "rgba(148,163,184,0.14)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.24)" }}>
                  {formatLabel(ticket.status)}
                </span>
                <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "rgba(237,232,220,0.35)" }}>
                  {ticket.createdAt.slice(0, 16).replace("T", " ")} UTC
                </span>
              </div>

              <p style={{ fontSize: "0.86rem", color: "rgba(237,232,220,0.82)", lineHeight: 1.7, marginBottom: "0.85rem" }}>
                {ticket.message}
              </p>

              {ticket.supportReplies.length === 0 ? (
                <p style={{ fontSize: "0.74rem", color: "rgba(237,232,220,0.38)" }}>
                  {t.account.supportNoReplies}
                </p>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {ticket.supportReplies.map((reply) => (
                    <div
                      key={reply.id}
                      style={{
                        padding: "0.85rem 0.95rem",
                        borderRadius: "0.65rem",
                        border: "1px solid rgba(20,184,166,0.16)",
                        background: "rgba(20,184,166,0.045)",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center", marginBottom: "0.45rem" }}>
                        <span style={{ padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.66rem", color: "#8ee3d4", background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.24)" }}>
                          {t.account.supportReplyStatus}: {formatLabel(reply.status)}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: "0.66rem", color: "rgba(237,232,220,0.36)" }}>
                          {reply.createdAt.slice(0, 16).replace("T", " ")} UTC
                        </span>
                      </div>
                      <p style={{ fontSize: "0.84rem", color: "rgba(237,232,220,0.82)", lineHeight: 1.65 }}>
                        {reply.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SacredCard>
          ))}
        </div>
      )}
    </SacredPage>
  );
}
