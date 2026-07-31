import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Join AI Religion — Sacred Journey Platform",
    short_name: "JoinAI Journey",
    description: "Private, multilingual reflective tools and educational journeys.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#05020b",
    theme_color: "#120725",
    orientation: "portrait-primary",
    categories: ["education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Meaning Map", short_name: "Meaning Map", url: "/meaning-map?source=pwa-shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Reflective Audio", short_name: "Audio", url: "/podcast?source=pwa-shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
