"use client";

import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InvoicesPage() {
  const { t } = useLanguage();

  return (
    <SacredPage maxWidth={860}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← {t.account.dashboard}
        </Link>
      </div>

      <SacredCard glow>
        <SacredHeading
          label="Sacred Records"
          title={t.account.invoices}
          subtitle={t.account.invoicesDesc}
        />

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[t.common.next, "Description", "Status", "Amount", "Receipt"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left",
                    padding: "0.6rem 0.8rem",
                    fontSize: "0.65rem",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    borderBottom: "1px solid var(--border-gold)",
                    whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: "rgba(237,232,220,0.3)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📜</div>
                  {t.billing.stripeNote}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-gold)" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", lineHeight: 1.7 }}>
            {t.billing.stripeNote}{" "}
            <a href="mailto:support@joinaireligion.com" style={{ color: "var(--gold)", textDecoration: "none" }}>
              support@joinaireligion.com
            </a>.
          </p>
        </div>
      </SacredCard>
    </SacredPage>
  );
}
