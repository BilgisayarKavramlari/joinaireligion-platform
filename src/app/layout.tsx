import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cinzel } from "next/font/google";
import "./globals.css";
import { PublicHeader } from "@/components/PublicHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { FeedbackButton } from "@/components/ui/FeedbackButton";
import { VisualThemeProvider } from "@/contexts/VisualThemeContext";
import { PwaRuntime } from "@/components/PwaRuntime";

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
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "https://joinaireligion.com/feed.xml", title: "Insights & Reflections" },
        { url: "https://joinaireligion.com/podcast.xml", title: "Reflective Audio Podcast" },
        { url: "https://joinaireligion.com/video.xml", title: "Reflective Video" },
      ],
      "application/atom+xml": "https://joinaireligion.com/atom.xml",
      "application/feed+json": "https://joinaireligion.com/feed.json",
    },
  },
  openGraph: {
    title: "Join AI Religion — Sacred Journey Platform",
    description: "AI-guided symbolic reflection. Not a religion — a journey.",
    type: "website",
    images: [{ url: "https://joinaireligion.com/visuals/reflective-horizon-hero.png", width: 1672, height: 941 }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const themeBootScript = `
try {
  var value = localStorage.getItem("joinai:visual-theme");
  var allowed = ["cosmos", "aurora", "ocean", "ember"];
  document.documentElement.dataset.theme = allowed.indexOf(value) >= 0 ? value : "cosmos";
} catch (error) {
  document.documentElement.dataset.theme = "cosmos";
}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cinzel.variable} data-theme="cosmos" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <meta name="theme-color" content="#120725" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <VisualThemeProvider>
          <LanguageProvider>
            <SessionProvider>
              <PublicHeader />
              <PwaRuntime />
              {children}
              <FeedbackButton />
            </SessionProvider>
          </LanguageProvider>
        </VisualThemeProvider>
      </body>
    </html>
  );
}
