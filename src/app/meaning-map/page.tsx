import type { Metadata } from "next";
import { MeaningMapExperience } from "@/components/meaning-map/MeaningMapExperience";

export const metadata: Metadata = {
  title: "Meaning Map | Join AI Religion",
  description: "A private three-minute reflection that offers a possible next question without assigning a fixed identity.",
  alternates: { canonical: "https://joinaireligion.com/meaning-map" },
  openGraph: {
    title: "Meaning Map — a private three-minute reflection",
    description: "Notice a possible next step. Answers stay in your browser and are never included in a shared link.",
    url: "https://joinaireligion.com/meaning-map",
    images: [{ url: "https://joinaireligion.com/visuals/reflective-horizon-hero.png", width: 1672, height: 941 }],
  },
};

export default function MeaningMapPage() {
  return <MeaningMapExperience />;
}
