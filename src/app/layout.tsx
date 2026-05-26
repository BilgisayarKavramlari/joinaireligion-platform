import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "Join AI Religion", description: "Fictional educational reflective platform." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-slate-950 text-slate-100"><Header />{children}</body></html>;
}
