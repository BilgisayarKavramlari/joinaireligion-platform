import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";

export default function AccountPage() {
  const links = ["profile", "preferences", "security", "billing", "invoices"];
  return (
    <PageContainer>
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Account Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => (
            <Link key={link} href={`/account/${link}`}>
              <Card className="p-5 capitalize text-slate-100 hover:border-violet-400/40">{link}</Card>
            </Link>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
