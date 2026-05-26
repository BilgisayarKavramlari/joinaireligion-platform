import Link from "next/link";
import { ReactNode } from "react";

type Props = { children: ReactNode; href?: string; onClick?: () => void; variant?: "primary" | "ghost"; type?: "button" | "submit"; disabled?: boolean; className?: string };

export function Button({ children, href, onClick, variant = "primary", type = "button", disabled, className = "" }: Props) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition";
  const styles = variant === "primary" ? "bg-violet-600 hover:bg-violet-500 text-white" : "border border-white/15 hover:bg-white/5 text-white";
  const cn = `${base} ${styles} ${className}`;
  if (href) return <Link href={href} className={cn}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={`${cn} disabled:opacity-50`}>{children}</button>;
}
