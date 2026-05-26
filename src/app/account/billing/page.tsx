import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BillingPage() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">Current plan: Free</Card>
          <Card className="p-4">Subscription status: inactive</Card>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="ghost">Manage subscription</Button>
          <Button>Upgrade plan</Button>
        </div>
      </Card>
    </PageContainer>
  );
}
