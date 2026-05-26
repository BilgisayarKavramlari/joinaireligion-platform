import { ReactNode } from "react";
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm text-slate-300">{label}</span>{children}</label>;
}
