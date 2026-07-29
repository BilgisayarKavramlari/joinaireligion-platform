import type { Metadata } from "next";
import UpdatesContent from "@/components/updates/UpdatesContent";

export const metadata: Metadata = {
  title: "Updates — Join AI Religion",
  description: "Short release notes and planned improvements for Join AI Religion.",
  alternates: { canonical: "https://joinaireligion.com/updates" },
};

export default function UpdatesPage() {
  return <UpdatesContent />;
}

