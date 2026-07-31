"use client";

import { useEffect } from "react";

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });

    const trackInstall = () => {
      void fetch("/api/meaning-map/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "install_success", locale: document.documentElement.lang || "en" }),
        keepalive: true,
      });
    };
    window.addEventListener("appinstalled", trackInstall);
    return () => window.removeEventListener("appinstalled", trackInstall);
  }, []);
  return null;
}
