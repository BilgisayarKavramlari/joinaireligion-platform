"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

type Invoice = {
  id: string;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  receiptUrl: string | null;
  createdAt: string;
};

const COPY: Record<string, {
  label: string; date: string; description: string; status: string; amount: string; receipt: string;
  membership: string; empty: string; error: string; view: string; paid: string; failed: string; open: string;
}> = {
  en: { label: "Payment records", date: "Date", description: "Description", status: "Status", amount: "Amount", receipt: "Receipt", membership: "Membership payment", empty: "No payment has been recorded for this account yet.", error: "Payment history could not be loaded.", view: "View receipt", paid: "Paid", failed: "Failed", open: "Open" },
  tr: { label: "Ödeme kayıtları", date: "Tarih", description: "Açıklama", status: "Durum", amount: "Tutar", receipt: "Makbuz", membership: "Üyelik ödemesi", empty: "Bu hesap için henüz bir ödeme kaydı yok.", error: "Ödeme geçmişi yüklenemedi.", view: "Makbuzu görüntüle", paid: "Ödendi", failed: "Başarısız", open: "Açık" },
  es: { label: "Registros de pago", date: "Fecha", description: "Descripción", status: "Estado", amount: "Importe", receipt: "Recibo", membership: "Pago de membresía", empty: "Aún no hay pagos registrados para esta cuenta.", error: "No se pudo cargar el historial de pagos.", view: "Ver recibo", paid: "Pagado", failed: "Fallido", open: "Abierto" },
  de: { label: "Zahlungsbelege", date: "Datum", description: "Beschreibung", status: "Status", amount: "Betrag", receipt: "Beleg", membership: "Mitgliedszahlung", empty: "Für dieses Konto wurde noch keine Zahlung erfasst.", error: "Der Zahlungsverlauf konnte nicht geladen werden.", view: "Beleg ansehen", paid: "Bezahlt", failed: "Fehlgeschlagen", open: "Offen" },
  fr: { label: "Relevés de paiement", date: "Date", description: "Description", status: "Statut", amount: "Montant", receipt: "Reçu", membership: "Paiement d’adhésion", empty: "Aucun paiement n’est encore enregistré pour ce compte.", error: "L’historique des paiements n’a pas pu être chargé.", view: "Voir le reçu", paid: "Payé", failed: "Échoué", open: "Ouvert" },
  ru: { label: "Платежные записи", date: "Дата", description: "Описание", status: "Статус", amount: "Сумма", receipt: "Квитанция", membership: "Оплата подписки", empty: "Для этого аккаунта пока нет платежей.", error: "Не удалось загрузить историю платежей.", view: "Открыть квитанцию", paid: "Оплачено", failed: "Ошибка", open: "Открыт" },
  zh: { label: "付款记录", date: "日期", description: "说明", status: "状态", amount: "金额", receipt: "收据", membership: "会员付款", empty: "此账户尚无付款记录。", error: "无法加载付款记录。", view: "查看收据", paid: "已支付", failed: "失败", open: "待处理" },
};

function formatAmount(invoice: Invoice, locale: string): string {
  if (invoice.amountMinor === null || !invoice.currency) return "—";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: invoice.currency }).format(invoice.amountMinor / 100);
  } catch {
    return `${(invoice.amountMinor / 100).toFixed(2)} ${invoice.currency}`;
  }
}

export default function InvoicesPage() {
  const { t, lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/account/invoices", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ invoices?: Invoice[] }>;
      })
      .then((payload) => setInvoices(Array.isArray(payload.invoices) ? payload.invoices : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SacredPage maxWidth={860}>
      <div style={{ marginBottom: "0.5rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>
          ← {t.account.dashboard}
        </Link>
      </div>

      <SacredCard glow>
        <SacredHeading
          label={copy.label}
          title={t.account.invoices}
          subtitle={t.account.invoicesDesc}
        />

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[copy.date, copy.description, copy.status, copy.amount, copy.receipt].map((h) => (
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
              {(loading || error || invoices.length === 0) && <tr>
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
                  {loading ? t.common.loading : error ? copy.error : copy.empty}
                </td>
              </tr>}
              {!loading && !error && invoices.map((invoice) => {
                const normalizedStatus = invoice.status.toLowerCase();
                const statusLabel = normalizedStatus === "paid" ? copy.paid : normalizedStatus === "failed" ? copy.failed : copy.open;
                return (
                  <tr key={invoice.id}>
                    <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(201,162,39,0.1)", whiteSpace: "nowrap" }}>{new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(invoice.createdAt))}</td>
                    <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(201,162,39,0.1)" }}>{copy.membership}</td>
                    <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(201,162,39,0.1)", color: normalizedStatus === "paid" ? "#14b8a6" : "var(--text-muted)" }}>{statusLabel}</td>
                    <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(201,162,39,0.1)", whiteSpace: "nowrap" }}>{formatAmount(invoice, lang)}</td>
                    <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(201,162,39,0.1)" }}>{invoice.receiptUrl ? <a href={invoice.receiptUrl} target="_blank" rel="noreferrer" style={{ color: "var(--gold-light)", textDecoration: "none" }}>{copy.view}</a> : "—"}</td>
                  </tr>
                );
              })}
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
