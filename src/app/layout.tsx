import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cinzel } from "next/font/google";
import "./globals.css";
import { PublicHeader } from "@/components/PublicHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { FeedbackButton } from "@/components/ui/FeedbackButton";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Join AI Religion — Sacred Journey Platform",
  description:
    "A fictional educational AI-guided reflective simulation. Symbolic self-discovery through journaling, sacred practice, and meaningful inquiry.",
  openGraph: {
    title: "Join AI Religion — Sacred Journey Platform",
    description: "AI-guided symbolic reflection. Not a religion — a journey.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body>
        <LanguageProvider>
          <PublicHeader />
          {children}
          <FeedbackButton />
        </LanguageProvider>
      </body>
    </html>
  );
}
