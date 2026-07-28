"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  contentItemId: string;
  locale: string;
  initialLikes: number;
};

export function ContentEngagement({ contentItemId, locale, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [voted, setVoted] = useState<"like" | "dislike" | null>(null);
  const startedAt = useRef(Date.now());
  const endpoint = `/api/content/${contentItemId}/engagement`;

  async function record(event: "view" | "like" | "dislike" | "dwell" | "cta", seconds?: number) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, locale, seconds }),
      keepalive: event === "dwell",
    }).catch(() => null);
    if (response?.ok) {
      const payload = await response.json().catch(() => null) as { likes?: number } | null;
      if (typeof payload?.likes === "number") setLikes(payload.likes);
    }
  }

  useEffect(() => {
    const viewKey = `joinai:view:${contentItemId}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, "1");
      void record("view");
    }
    const savedVote = localStorage.getItem(`joinai:vote:${contentItemId}`);
    if (savedVote === "like" || savedVote === "dislike") setVoted(savedVote);

    const sendDwell = () => {
      const seconds = Math.min(600, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      void record("dwell", seconds);
    };
    window.addEventListener("pagehide", sendDwell, { once: true });
    return () => window.removeEventListener("pagehide", sendDwell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItemId]);

  async function vote(event: "like" | "dislike") {
    if (voted) return;
    localStorage.setItem(`joinai:vote:${contentItemId}`, event);
    setVoted(event);
    if (event === "like") setLikes((value) => value + 1);
    await record(event);
  }

  return (
    <aside style={{ marginTop: "2.5rem", padding: "1.1rem", border: "1px solid var(--border-gold)", borderRadius: "1rem", background: "rgba(201,162,39,.04)" }}>
      <p style={{ color: "var(--text-muted)", fontSize: ".78rem", marginTop: 0 }}>Was this reflection useful?</p>
      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => void vote("like")} disabled={Boolean(voted)} className="btn-sacred btn-sacred-ghost" style={{ padding: ".45rem .8rem" }}>Useful · {likes}</button>
        <button type="button" onClick={() => void vote("dislike")} disabled={Boolean(voted)} className="btn-sacred btn-sacred-ghost" style={{ padding: ".45rem .8rem" }}>Not useful</button>
        <Link href="/register" onClick={() => void record("cta")} className="btn-sacred btn-sacred-gold" style={{ marginLeft: "auto", padding: ".45rem .8rem" }}>Begin a journey</Link>
      </div>
    </aside>
  );
}
