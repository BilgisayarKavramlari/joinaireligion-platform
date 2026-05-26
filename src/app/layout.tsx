import type { Metadata } from "next";
import "./globals.css";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "Join AI Religion",
  description: "Fictional educational reflective simulation platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PublicHeader />
        {children}
      </body>
    </html>
  );
}
