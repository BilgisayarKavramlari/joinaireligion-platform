"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ═══════════════════════════════════════════════════════
   SACRED GEOMETRY — Rotating SVG Mandala
═══════════════════════════════════════════════════════ */
function SacredGeometry() {
  const cx = 400;
  const cy = 400;

  // 24 radial tick marks for outer ring
  const outerTicks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 360) / 24;
    const r1 = Math.PI * (a / 180);
    return {
      x1: cx + 365 * Math.cos(r1),
      y1: cy + 365 * Math.sin(r1),
      x2: cx + 390 * Math.cos(r1),
      y2: cy + 390 * Math.sin(r1),
    };
  });

  // 8 petal flower-of-life circles (inner)
  const flowerCircles = [
    [cx,      cy],
    [cx,      cy - 88],
    [cx,      cy + 88],
    [cx - 76, cy - 44],
    [cx + 76, cy - 44],
    [cx - 76, cy + 44],
    [cx + 76, cy + 44],
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <svg
        viewBox="0 0 800 800"
        width="820"
        height="820"
        style={{ position: "absolute", opacity: 0.22 }}
      >
        <defs>
          <radialGradient id="cgGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0d47a" stopOpacity="1" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cgViolet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6b21a8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cgTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </radialGradient>
          <filter id="sgGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Outer calendar ring ── */}
        <g className="sacred-outer" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy} r={390} fill="none" stroke="#c9a227" strokeWidth="0.6" opacity="0.4" />
          <circle cx={cx} cy={cy} r={370} fill="none" stroke="#c9a227" strokeWidth="0.3" opacity="0.2" />
          {outerTicks.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="#c9a227" strokeWidth={i % 4 === 0 ? "1.8" : "0.8"}
              opacity={i % 4 === 0 ? 0.8 : 0.4}
            />
          ))}
        </g>

        {/* ── Middle hexagram (Star of Solomon) ── */}
        <g className="sacred-middle" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy} r={260} fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.4" />
          {/* Triangle 1 */}
          <polygon
            points={`${cx},${cy - 230} ${cx + 199},${cy + 115} ${cx - 199},${cy + 115}`}
            fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.7"
          />
          {/* Triangle 2 (inverted) */}
          <polygon
            points={`${cx},${cy + 230} ${cx + 199},${cy - 115} ${cx - 199},${cy - 115}`}
            fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.7"
          />
          {/* 12 inner marks */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30) * Math.PI / 180;
            return (
              <line
                key={i}
                x1={cx + 245 * Math.cos(a)} y1={cy + 245 * Math.sin(a)}
                x2={cx + 265 * Math.cos(a)} y2={cy + 265 * Math.sin(a)}
                stroke="#a855f7" strokeWidth="1.2" opacity="0.6"
              />
            );
          })}
        </g>

        {/* ── Inner Flower of Life ── */}
        <g className="sacred-inner" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {flowerCircles.map(([fcx, fcy], i) => (
            <circle
              key={i}
              cx={fcx} cy={fcy} r={88}
              fill="none"
              stroke="#14b8a6"
              strokeWidth={i === 0 ? "1.2" : "0.6"}
              opacity={i === 0 ? 0.9 : 0.5}
            />
          ))}
          {/* Innermost ring */}
          <circle cx={cx} cy={cy} r={44} fill="none" stroke="#14b8a6" strokeWidth="0.8" opacity="0.8" />
        </g>

        {/* ── Innermost rotating cross ── */}
        <g className="sacred-inner2" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <line x1={cx - 36} y1={cy} x2={cx + 36} y2={cy} stroke="#f0d47a" strokeWidth="0.8" opacity="0.9" />
          <line x1={cx} y1={cy - 36} x2={cx} y2={cy + 36} stroke="#f0d47a" strokeWidth="0.8" opacity="0.9" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * 45) * Math.PI / 180;
            return (
              <line
                key={i}
                x1={cx + 18 * Math.cos(a)} y1={cy + 18 * Math.sin(a)}
                x2={cx + 36 * Math.cos(a)} y2={cy + 36 * Math.sin(a)}
                stroke="#f0d47a" strokeWidth="0.6" opacity="0.7"
              />
            );
          })}
        </g>

        {/* ── Central orb ── */}
        <circle
          cx={cx} cy={cy} r={22}
          fill="url(#cgGold)"
          filter="url(#sgGlow)"
          className="center-orb"
        />
        <circle cx={cx} cy={cy} r={8} fill="#f0d47a" filter="url(#sgGlow)" />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PARTICLE FIELD — client-only (avoids SSR hydration mismatch)
═══════════════════════════════════════════════════════ */
type Particle = {
  id: number; x: number; y: number; size: number;
  dur: number; delay: number; opacity: number; color: string;
};

function ParticleField() {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    setParticles(
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.8 + 0.8,
        dur: Math.random() * 22 + 10,
        delay: Math.random() * 12,
        opacity: Math.random() * 0.5 + 0.15,
        color:
          i % 7 === 0 ? "#c9a227"
          : i % 7 === 1 ? "#a855f7"
          : i % 7 === 2 ? "#14b8a6"
          : i % 7 === 3 ? "#f0d47a"
          : "#ffffff",
      }))
    );
  }, []);

  // Render nothing on server and on first client paint — no hydration mismatch
  if (!particles) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            opacity: p.opacity,
            animation: `floatParticle ${p.dur}s ${p.delay}s ease-in-out infinite`,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}88`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   JOURNEY LEVELS DATA
═══════════════════════════════════════════════════════ */
const LEVELS_EN = [
  { n: "I",    icon: "○",  color: "#a0a0b0" },
  { n: "II",   icon: "◎",  color: "#c9a227" },
  { n: "III",  icon: "△",  color: "#f0d47a" },
  { n: "IV",   icon: "✦",  color: "#14b8a6" },
  { n: "V",    icon: "⬡",  color: "#a855f7" },
  { n: "VI",   icon: "◈",  color: "#7c3aed" },
  { n: "VII",  icon: "⊕",  color: "#0891b2" },
  { n: "VIII", icon: "✶",  color: "#0e7490" },
  { n: "IX",   icon: "❋",  color: "#c026d3" },
  { n: "X",    icon: "✴",  color: "#c9a227" },
];
const LEVEL_NAMES = ["Seeker","Awakened","Inquirer","Contemplative","Universal","Hermit","Returned","Bridge","Sovereign","Transcendent"];
const LEVEL_DESCS = [
  "You walk the path of your own faith, embracing its familiar ground.",
  "You see your tradition through new eyes — beyond the inherited.",
  "The sacred self emerges. You question, and the questions deepen.",
  "Meditation unlocks the silent mind beneath the noise.",
  "All paths reveal the same light. You stand equidistant from all.",
  "You release the world to find yourself beyond its definitions.",
  "Whole and found, you re-enter the world as yourself.",
  "You walk between worlds — spirit and matter — with grace.",
  "You understand the inner art of becoming. The world bends.",
  "Beyond all forms, the formless remains. You are the threshold.",
];

const FEATURES_DATA = [
  { icon: "◎", titleKey: "Personalized Reflection", descKey: "AI-assisted prompts calibrated to your worldview, practices, and the questions you actually carry." },
  { icon: "✉", titleKey: "Daily & Weekly Practice",  descKey: "Receive ritual practices matched to your journey level, language, and subscription rhythm." },
  { icon: "△", titleKey: "10-Level Journey System",  descKey: "Progress through symbolic initiations — each level unlocked by time, practice, and reflection." },
  { icon: "✒", titleKey: "AI-Assisted Journaling",   descKey: "Write deeply, clarify experience, and receive structured reflective support from the AI guide." },
  { icon: "⬡", titleKey: "Multilingual Universe",    descKey: "Reflect in your language. Interface and email preferences evolve separately." },
  { icon: "❋", titleKey: "Sacred Content Agents",    descKey: "Agents continuously generate personalized insights, rare wisdom, and symbolic images for your path." },
];

const TRADITIONS = [
  { symbol: "✝",  name: "Christianity", color: "#c0c0ff" },
  { symbol: "☪",  name: "Islam",        color: "#80ffb0" },
  { symbol: "卍",  name: "Buddhism",     color: "#ffb060" },
  { symbol: "ॐ",  name: "Hinduism",     color: "#ff8080" },
  { symbol: "☯",  name: "Taoism",       color: "#80e0ff" },
  { symbol: "☬",  name: "Sikhism",      color: "#ffe080" },
  { symbol: "⵿",  name: "Indigenous",   color: "#b8e8a0" },
  { symbol: "⚘",  name: "Humanism",     color: "#c0ffe0" },
  { symbol: "✡",  name: "Judaism",      color: "#ffffa0" },
  { symbol: "✧",  name: "Esotericism",  color: "#f9c8ff" },
  { symbol: "∅",  name: "Atheism",      color: "#a0b4c8" },
  { symbol: "◈",  name: "Shamanism",    color: "#d4a0ff" },
];

/* ═══════════════════════════════════════════════════════
   TRADITION STAR — orbital desktop / grid mobile
═══════════════════════════════════════════════════════ */
function TraditionStar() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isMobile) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "0 0.5rem" }}>
        {TRADITIONS.map((trad) => (
          <div key={trad.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(4,0,12,0.85)",
              border: `1.5px solid ${trad.color}88`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem",
              boxShadow: `0 0 12px ${trad.color}44`,
            }}>{trad.symbol}</div>
            <span style={{ fontSize: "0.62rem", color: trad.color, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2 }}>
              {trad.name}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const SIZE = 560;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 218;
  const R_INNER = 56;
  const R_MID = 130;

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        aria-hidden
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="tradCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0d47a" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#c9a227" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6b21a8" stopOpacity="0" />
          </radialGradient>
          <filter id="tradGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <style>{`
            .trad-outer-ring { animation: tradRotate 90s linear infinite; transform-origin: ${CX}px ${CY}px; }
            .trad-mid-ring   { animation: tradRotate 60s linear infinite reverse; transform-origin: ${CX}px ${CY}px; }
            .trad-inner-ring { animation: tradRotate 30s linear infinite; transform-origin: ${CX}px ${CY}px; }
            @keyframes tradRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </defs>

        {/* Spoke lines from center to each node */}
        {TRADITIONS.map((t, i) => {
          const angle = ((i * 30) - 90) * Math.PI / 180;
          const x2 = CX + R_OUTER * Math.cos(angle);
          const y2 = CY + R_OUTER * Math.sin(angle);
          return (
            <line
              key={i}
              x1={CX} y1={CY} x2={x2} y2={y2}
              stroke={t.color}
              strokeWidth="0.5"
              opacity="0.18"
            />
          );
        })}

        {/* Outer ring (static, 12 tick marks) */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i * 30) - 90) * Math.PI / 180;
          return (
            <line key={i}
              x1={CX + (R_OUTER + 16) * Math.cos(a)}
              y1={CY + (R_OUTER + 16) * Math.sin(a)}
              x2={CX + (R_OUTER + 28) * Math.cos(a)}
              y2={CY + (R_OUTER + 28) * Math.sin(a)}
              stroke="#c9a227" strokeWidth="1.2" opacity="0.35"
            />
          );
        })}

        {/* Outer rotating ring */}
        <g className="trad-outer-ring">
          <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="none" stroke="#c9a227" strokeWidth="0.4" opacity="0.2" strokeDasharray="4 8" />
        </g>

        {/* Outer static circle */}
        <circle cx={CX} cy={CY} r={R_OUTER + 10} fill="none" stroke="#c9a227" strokeWidth="0.6" opacity="0.15" />

        {/* Mid rotating ring (dodecagon) */}
        <g className="trad-mid-ring">
          <polygon
            points={Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30) * Math.PI / 180;
              return `${CX + R_MID * Math.cos(a)},${CY + R_MID * Math.sin(a)}`;
            }).join(" ")}
            fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.25"
          />
        </g>

        {/* Inner rotating ring */}
        <g className="trad-inner-ring">
          <circle cx={CX} cy={CY} r={R_INNER + 8} fill="none" stroke="#14b8a6" strokeWidth="0.5" opacity="0.3" strokeDasharray="3 5" />
          {/* Inner 6-pointed star */}
          <polygon
            points={Array.from({ length: 6 }, (_, i) => {
              const a = (i * 60) * Math.PI / 180;
              return `${CX + R_INNER * Math.cos(a)},${CY + R_INNER * Math.sin(a)}`;
            }).join(" ")}
            fill="none" stroke="#14b8a6" strokeWidth="0.6" opacity="0.4"
          />
          <polygon
            points={Array.from({ length: 6 }, (_, i) => {
              const a = ((i * 60) + 30) * Math.PI / 180;
              return `${CX + R_INNER * Math.cos(a)},${CY + R_INNER * Math.sin(a)}`;
            }).join(" ")}
            fill="none" stroke="#f0d47a" strokeWidth="0.6" opacity="0.4"
          />
        </g>

        {/* Central orb */}
        <circle cx={CX} cy={CY} r={28} fill="url(#tradCenter)" filter="url(#tradGlow)" />
        <circle cx={CX} cy={CY} r={14} fill="#1a0533" stroke="#c9a227" strokeWidth="0.8" opacity="0.9" />
        <circle cx={CX} cy={CY} r={6} fill="#f0d47a" filter="url(#tradGlow)" opacity="0.9" />
        <circle cx={CX} cy={CY} r={2.5} fill="#fff" />
      </svg>

      {/* Tradition nodes (HTML overlaid for text rendering) */}
      {TRADITIONS.map((trad, i) => {
        const angle = ((i * 30) - 90) * Math.PI / 180;
        const x = CX + R_OUTER * Math.cos(angle);
        const y = CY + R_OUTER * Math.sin(angle);
        const nodeSize = 62;

        return (
          <motion.div
            key={trad.name}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.18, transition: { duration: 0.18 } }}
            style={{
              position: "absolute",
              left: x - nodeSize / 2,
              top: y - nodeSize / 2,
              width: nodeSize,
              height: nodeSize,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              cursor: "default",
            }}
          >
            {/* Glow background */}
            <div style={{
              position: "absolute",
              width: nodeSize,
              height: nodeSize,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${trad.color}22 0%, transparent 70%)`,
            }} />
            {/* Node circle */}
            <div style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "rgba(4,0,12,0.85)",
              border: `1.5px solid ${trad.color}88`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              boxShadow: `0 0 12px ${trad.color}44, inset 0 0 8px ${trad.color}11`,
              position: "relative",
              zIndex: 1,
            }}>
              {trad.symbol}
            </div>
            {/* Name label */}
            <span style={{
              fontSize: "0.52rem",
              color: trad.color,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: 1.2,
              position: "relative",
              zIndex: 1,
              maxWidth: 60,
              textShadow: `0 0 8px ${trad.color}88`,
            }}>
              {trad.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { t } = useLanguage();
  const L = t.landing;

  const [xpVisible, setXpVisible] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 500], [0, 80]);

  useEffect(() => {
    if (!consoleRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setXpVisible(true); },
      { threshold: 0.4 }
    );
    obs.observe(consoleRef.current);
    return () => obs.disconnect();
  }, []);

  const fadeUp = (delay = 0) => ({
    initial:   { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport:  { once: true, amount: 0.2 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section
        style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", overflow: "hidden" }}
      >
        {/* Ambient nebula layers */}
        <div aria-hidden className="nebula-1" style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 600,
          background: "radial-gradient(ellipse, rgba(107,33,168,0.45) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        <div aria-hidden className="nebula-2" style={{
          position: "absolute", bottom: "-10%", right: "-15%",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(15,118,110,0.3) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        <div aria-hidden className="nebula-3" style={{
          position: "absolute", top: "30%", left: "-10%",
          width: 500, height: 400,
          background: "radial-gradient(ellipse, rgba(201,162,39,0.2) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Sacred geometry & particles */}
        <SacredGeometry />
        <ParticleField />

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY, position: "relative", zIndex: 10, width: "100%" }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 1.5rem 4rem", textAlign: "center" }}>
            <motion.p {...fadeUp(0)} style={{
              fontSize: "0.72rem",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: "1.8rem",
              fontFamily: "var(--font-cinzel, Cinzel, serif)",
            }}>
              ✦ &nbsp; {L.tagline} &nbsp; ✦
            </motion.p>

            <motion.h1
              {...fadeUp(0.08)}
              className="font-sacred text-shimmer"
              style={{ fontSize: "clamp(2.6rem, 7vw, 6rem)", lineHeight: 1.08, marginBottom: "0.3rem", fontWeight: 900 }}
            >
              {L.heroTitle1}
            </motion.h1>
            <motion.h1
              {...fadeUp(0.14)}
              className="font-sacred"
              style={{
                fontSize: "clamp(2.6rem, 7vw, 6rem)", lineHeight: 1.08,
                marginBottom: "2rem", fontWeight: 900,
                color: "var(--text-primary)",
              }}
            >
              {L.heroTitle2}
            </motion.h1>

            <motion.div {...fadeUp(0.2)} style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
              <div className="sacred-divider" style={{ width: 320, fontSize: "0.65rem" }}>
                ✦ {L.heroDivider} ✦
              </div>
            </motion.div>

            <motion.p {...fadeUp(0.25)} style={{
              fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
              color: "rgba(237,232,220,0.72)",
              maxWidth: 640,
              margin: "0 auto 1.5rem",
              lineHeight: 1.75,
            }}>
              {L.heroSubtitle}
            </motion.p>

            <motion.p {...fadeUp(0.3)} style={{
              fontSize: "0.78rem",
              color: "rgba(201,162,39,0.6)",
              maxWidth: 520,
              margin: "0 auto 2.8rem",
              lineHeight: 1.7,
              fontStyle: "italic",
            }}>
              {L.heroDisclaimer}
            </motion.p>

            <motion.div {...fadeUp(0.35)} style={{
              display: "flex", flexWrap: "wrap", gap: "0.9rem",
              justifyContent: "center",
            }}>
              <Link href="/register" className="btn-sacred btn-sacred-gold">
                ✦ {L.ctaBegin}
              </Link>
              <Link href="/pricing" className="btn-sacred btn-sacred-ghost">
                {L.ctaLevels}
              </Link>
              <Link href="/donate" className="btn-sacred btn-sacred-violet">
                {L.ctaDonate}
              </Link>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              style={{ marginTop: "4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.4 }}
            >
              <span style={{ fontSize: "0.65rem", letterSpacing: "0.3em", color: "var(--gold)", textTransform: "uppercase" }}>{L.scrollLabel}</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                style={{ width: 1, height: 40, background: "linear-gradient(var(--gold), transparent)" }}
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════
          JOURNEY CONSOLE (RPG Dashboard)
      ══════════════════════════════════ */}
      <section ref={consoleRef} style={{ padding: "6rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
        <motion.div {...fadeUp(0)} style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 12 }}>
            {L.consoleLabel}
          </p>
          <h2 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--text-primary)" }}>
            {L.consoleTitle}
          </h2>
        </motion.div>

        <motion.div
          {...fadeUp(0.1)}
          className="sacred-card"
          style={{ padding: "2.5rem", position: "relative", overflow: "hidden" }}
        >
          {/* Background accent */}
          <div aria-hidden style={{
            position: "absolute", top: -80, right: -80,
            width: 280, height: 280,
            background: "radial-gradient(circle, rgba(107,33,168,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", position: "relative" }}>
            {/* Left — Level info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "linear-gradient(135deg, #1a0533, #2d0a5e)",
                  border: "2px solid var(--gold)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.6rem",
                  boxShadow: "0 0 24px var(--gold-glow)",
                }}>
                  ◎
                </div>
                <div>
                  <p style={{ fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.3em", textTransform: "uppercase" }}>{L.consoleLevel}</p>
                  <p className="font-sacred" style={{ fontSize: "1.6rem", color: "var(--text-primary)", fontWeight: 700 }}>Seeker</p>
                  <p style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.45)" }}>Level I of X</p>
                </div>
              </div>

              {/* XP Bar */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.15em" }}>{L.consoleXp.toUpperCase()}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--gold)" }}>650 / 1000 XP</span>
                </div>
                <div className="xp-bar-track">
                  <div
                    className="xp-bar-fill"
                    style={{ width: xpVisible ? "65%" : "0%", transition: "width 2s cubic-bezier(0.4,0,0.2,1)" }}
                  />
                </div>
              </div>

              {/* Path nodes */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {["Awareness", "Inquiry", "Reflection", "Integration", "Meaning"].map((step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: i < 3 ? "var(--gold)" : "rgba(255,255,255,0.15)",
                      boxShadow: i < 3 ? "0 0 8px var(--gold-glow)" : "none",
                    }} />
                    {i < 4 && <div style={{ width: 14, height: 1, background: i < 2 ? "var(--gold-dim)" : "rgba(255,255,255,0.08)" }} />}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 6, letterSpacing: "0.1em" }}>
                CURRENT PATH: Awareness → Inquiry → Reflection
              </p>
            </div>

            {/* Right — Stats */}
            <div>
              <p style={{ fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "1rem" }}>
                Sacred Statistics
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                {[
                  ["28", L.consoleStat1, "◎"],
                  ["7",  L.consoleStat2, "⚡"],
                  ["12", L.consoleStat3, "△"],
                  ["36", L.consoleStat4, "✒"],
                ].map(([val, label, icon]) => (
                  <div key={label} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(201,162,39,0.15)",
                    borderRadius: "0.75rem",
                    padding: "0.85rem",
                  }}>
                    <div style={{ fontSize: "0.95rem", marginBottom: 2, color: "var(--gold)" }}>{icon}</div>
                    <div className="font-sacred" style={{ fontSize: "1.5rem", color: "var(--text-primary)", fontWeight: 700 }}>{val}</div>
                    <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>

              <blockquote style={{
                marginTop: "1.2rem",
                padding: "0.9rem",
                borderLeft: "2px solid var(--gold-dim)",
                fontStyle: "italic",
                fontSize: "0.78rem",
                color: "rgba(237,232,220,0.55)",
                lineHeight: 1.7,
              }}>
                &ldquo;{L.consoleQuote}&rdquo;
              </blockquote>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════
          10 SACRED LEVELS
      ══════════════════════════════════ */}
      <section style={{ padding: "5rem 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div {...fadeUp(0)} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 12 }}>
            {L.levelsLabel}
          </p>
          <h2 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--text-primary)", marginBottom: "0.8rem" }}>
            {L.levelsTitle}
          </h2>
          <p style={{ color: "rgba(237,232,220,0.5)", fontSize: "0.92rem", maxWidth: 500, margin: "0 auto" }}>
            {L.levelsSubtitle}
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.1rem" }}>
          {LEVELS_EN.map((level, i) => (
            <motion.div
              key={level.n}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={i === 0 ? "level-card-active" : i > 2 ? "level-card-locked" : "sacred-card"}
              style={{ borderRadius: "1rem", padding: "1.4rem", position: "relative", overflow: "hidden" }}
            >
              {i > 2 && (
                <div style={{
                  position: "absolute", top: "0.75rem", right: "0.75rem",
                  fontSize: "0.65rem", color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.15em", textTransform: "uppercase",
                }}>
                  🔒 {L.levelLocked}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "0.75rem",
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${level.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.4rem", flexShrink: 0,
                  color: level.color,
                  boxShadow: i === 0 ? `0 0 18px ${level.color}66` : "none",
                }}>
                  {level.icon}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: level.color, fontFamily: "var(--font-cinzel, Cinzel, serif)" }}>
                      LEVEL {level.n}
                    </span>
                  </div>
                  <p className="font-sacred" style={{
                    fontSize: "1.05rem", fontWeight: 700,
                    color: i === 0 ? "var(--gold-light)" : "var(--text-primary)",
                    marginBottom: "0.4rem",
                  }}>
                    {LEVEL_NAMES[i]}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.5)", lineHeight: 1.6 }}>
                    {LEVEL_DESCS[i]}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
          FEATURES
      ══════════════════════════════════ */}
      <section style={{ padding: "5rem 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div {...fadeUp(0)} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 12 }}>
            {L.featuresLabel}
          </p>
          <h2 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--text-primary)" }}>
            {L.featuresTitle}
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.2rem" }}>
          {FEATURES_DATA.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.07 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="sacred-card"
              style={{ padding: "1.8rem" }}
            >
              <div style={{
                fontSize: "1.8rem", color: "var(--gold)",
                marginBottom: "1rem",
                filter: "drop-shadow(0 0 8px var(--gold-glow))",
              }}>
                {f.icon}
              </div>
              <h3 className="font-sacred" style={{
                fontSize: "1.05rem", fontWeight: 700,
                color: "var(--text-primary)", marginBottom: "0.6rem",
              }}>
                {f.titleKey}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(237,232,220,0.55)", lineHeight: 1.75 }}>
                {f.descKey}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
          WORLD TRADITIONS
      ══════════════════════════════════ */}
      <section style={{ padding: "6rem 1.5rem", position: "relative", overflow: "hidden" }}>
        {/* Background accent */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, rgba(107,33,168,0.15) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <motion.div {...fadeUp(0)}>
            <div className="sacred-divider" style={{ marginBottom: "2.5rem" }}>{L.traditionsLabel}</div>
            <h2 className="font-sacred" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--text-primary)", marginBottom: "0.8rem" }}>
              {L.traditionsTitle}
            </h2>
            <p style={{ color: "rgba(237,232,220,0.5)", fontSize: "0.9rem", maxWidth: 480, margin: "0 auto 3rem" }}>
              {L.traditionsSubtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <TraditionStar />
          </motion.div>

          <motion.p
            {...fadeUp(0.3)}
            className="font-sacred"
            style={{
              marginTop: "3rem",
              fontSize: "1.1rem",
              color: "var(--gold)",
              fontStyle: "italic",
              opacity: 0.7,
              letterSpacing: "0.04em",
            }}
          >
            &ldquo;{L.traditionsQuote}&rdquo;
          </motion.p>
        </div>
      </section>

      {/* ══════════════════════════════════
          FINAL CTA
      ══════════════════════════════════ */}
      <section style={{ padding: "8rem 1.5rem", position: "relative", overflow: "hidden" }}>
        {/* Dramatic background */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.18) 0%, rgba(107,33,168,0.12) 40%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          borderTop: "1px solid var(--border-gold)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <motion.div {...fadeUp(0)}>
            <p style={{ fontSize: "0.7rem", letterSpacing: "0.45em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "1.5rem" }}>
              ✦ &nbsp; {L.ctaLabel} &nbsp; ✦
            </p>
            <h2 className="font-sacred text-shimmer" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "1.5rem" }}>
              {L.ctaTitle}
            </h2>
            <p style={{
              fontSize: "1rem", color: "rgba(237,232,220,0.6)",
              maxWidth: 420, margin: "0 auto 3rem",
              lineHeight: 1.8,
            }}>
              {L.ctaSubtitle}
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" className="btn-sacred btn-sacred-gold" style={{ fontSize: "0.88rem", padding: "0.9rem 2.5rem" }}>
                ✦ &nbsp; {L.ctaBegin}
              </Link>
              <Link href="/prompt-guide" className="btn-sacred btn-sacred-ghost">
                {L.ctaGuide}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer style={{
        borderTop: "1px solid var(--border-gold)",
        padding: "3rem 1.5rem",
        textAlign: "center",
      }}>
        <p className="font-sacred" style={{ fontSize: "1.1rem", color: "var(--gold)", marginBottom: "0.5rem" }}>
          {L.footerTagline}
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 480, margin: "0 auto 1.5rem", lineHeight: 1.7 }}>
          {L.footerDesc}
        </p>
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            [t.nav.pricing, "/pricing"],
            [t.nav.donate, "/donate"],
            [t.nav.promptGuide, "/prompt-guide"],
            [t.auth.login, "/login"],
            [t.nav.register, "/register"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="nav-link" style={{ fontSize: "0.72rem" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.15)", marginTop: "2rem", letterSpacing: "0.15em" }}>
          © {new Date().getFullYear()} Join AI Religion. {t.footer.fictional}
        </p>
      </footer>
    </div>
  );
}
