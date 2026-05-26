import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer>
      <section className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Reflective simulation for symbolic self-discovery
          </h1>
          <p className="text-lg text-slate-300">
            A fictional, educational platform for reflective journaling and AI-assisted meaning-making.
          </p>
          <p className="text-sm text-amber-200">
            Not a religious authority, medical care, psychological treatment, or crisis service.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/register">Create account</Button>
            <Button href="/pricing" variant="ghost">View pricing</Button>
            <Button href="/donate" variant="ghost">Donate</Button>
            <Button href="/prompt-guide" variant="ghost">Read prompt guide</Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Personalized reflection",
            "Weekly/daily practice emails",
            "Symbolic journey levels",
            "AI-assisted journaling",
            "Privacy-conscious logs",
          ].map((item) => (
            <Card key={item} className="p-4 text-slate-100">{item}</Card>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
