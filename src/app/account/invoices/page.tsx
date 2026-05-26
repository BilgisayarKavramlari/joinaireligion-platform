import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";

export default function InvoicesPage() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-slate-300"><th className="py-2">Date</th><th>Status</th><th>Amount</th><th>Invoice/PDF</th></tr></thead>
            <tbody><tr><td className="py-3 text-slate-400" colSpan={4}>No invoices yet.</td></tr></tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
