"use client";

import { useEffect, useState } from "react";

export default function MouseSpotlight() {
  const [pos, setPos] = useState({ x: 50, y: 18 });

  useEffect(() => {
    function onMove(event: MouseEvent) {
      setPos({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    }

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(139,92,246,0.20), transparent 17%), radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(34,211,238,0.10), transparent 30%)`,
      }}
    />
  );
}
