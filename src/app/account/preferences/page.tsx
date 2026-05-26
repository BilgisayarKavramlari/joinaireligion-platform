import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export default function PreferencesPage() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Preferences</h1>
        <p className="mt-2 text-sm text-slate-300">Interface language and email language can be different.</p>
        <div className="mt-4 space-y-4">
          <FormField label="Interface language"><Select defaultValue="en"><option value="en">English</option><option value="tr">Türkçe</option><option value="es">Español</option><option value="de">Deutsch</option><option value="fr">Français</option></Select></FormField>
          <FormField label="Email language"><Select defaultValue="en"><option value="en">English</option><option value="tr">Türkçe</option><option value="es">Español</option><option value="de">Deutsch</option><option value="fr">Français</option></Select></FormField>
          <Button>Save preferences</Button>
        </div>
      </Card>
    </PageContainer>
  );
}
