"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Attribution = {
  source: string;
  medium?: string;
  campaign?: string;
  referrerHost?: string;
};

const SESSION_KEY = "joinai:analytics-session:v1";
const ATTRIBUTION_KEY = "joinai:analytics-attribution:v1";

function privacySignalEnabled(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return navigator.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function safeToken(value: string | null): string | undefined {
  const normalized = (value || "").trim().toLowerCase().slice(0, 64);
  return normalized && /^[a-z0-9][a-z0-9._-]*$/.test(normalized) ? normalized : undefined;
}

function sourceFromReferrer(host: string): string {
  if (!host) return "direct";
  if (host === window.location.hostname || host.endsWith(`.${window.location.hostname}`)) return "internal";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("facebook.com") || host === "fb.com") return "facebook";
  if (host.includes("threads.net")) return "threads";
  if (host === "t.co" || host.includes("x.com") || host.includes("twitter.com")) return "x";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("bsky.app")) return "bluesky";
  if (host.includes("pinterest.")) return "pinterest";
  if (host.includes("google.")) return "google";
  if (host.includes("bing.com")) return "bing";
  return "referral";
}

function getSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function getAttribution(): Attribution {
  const existing = sessionStorage.getItem(ATTRIBUTION_KEY);
  if (existing) {
    try { return JSON.parse(existing) as Attribution; } catch { /* create a fresh minimized value */ }
  }
  const params = new URLSearchParams(window.location.search);
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch { /* omit invalid referrer */ }
  const attribution: Attribution = {
    source: safeToken(params.get("utm_source")) || sourceFromReferrer(referrerHost),
    ...(safeToken(params.get("utm_medium")) ? { medium: safeToken(params.get("utm_medium")) } : {}),
    ...(safeToken(params.get("utm_campaign")) ? { campaign: safeToken(params.get("utm_campaign")) } : {}),
    ...(referrerHost ? { referrerHost } : {}),
  };
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

async function send(event: "page_view" | "link_click", path: string, targetPath?: string, targetHost?: string) {
  if (privacySignalEnabled()) return;
  const attribution = getAttribution();
  await fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      event,
      sessionId: getSessionId(),
      path,
      locale: document.documentElement.lang || "en",
      ...attribution,
      ...(targetPath ? { targetPath } : {}),
      ...(targetHost ? { targetHost } : {}),
    }),
  }).catch(() => undefined);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || previousPath.current === pathname) return;
    previousPath.current = pathname;
    void send("page_view", pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      try {
        const url = new URL(target.href, window.location.href);
        if (!/^https?:$/.test(url.protocol)) return;
        const sameHost = url.hostname === window.location.hostname;
        void send("link_click", window.location.pathname, sameHost ? url.pathname : undefined, sameHost ? undefined : url.hostname);
      } catch { /* ignore malformed links */ }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
