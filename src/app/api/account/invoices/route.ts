import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/access";
import { db } from "@/lib/db";

function publicReceiptUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoices = await db.invoiceRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        amountCents: true,
        currency: true,
        hostedInvoiceUrl: true,
        invoicePdfUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          status: invoice.status,
          amountMinor: invoice.amountCents,
          currency: invoice.currency?.toUpperCase() || null,
          receiptUrl: publicReceiptUrl(invoice.hostedInvoiceUrl) || publicReceiptUrl(invoice.invoicePdfUrl),
          createdAt: invoice.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("account_invoices_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to load payment history" }, { status: 500 });
  }
}
