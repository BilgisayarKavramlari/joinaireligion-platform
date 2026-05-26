import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Join AI Religion",
  description: "Fictional educational platform for symbolic self-discovery and reflective practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
