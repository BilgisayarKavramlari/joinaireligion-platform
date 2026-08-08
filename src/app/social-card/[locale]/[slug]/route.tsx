import { ImageResponse } from "next/og";
import React from "react";
import sharp from "sharp";
import crypto from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { decodeContentRouteSegment } from "@/lib/content-routing";
import { db } from "@/lib/db";
import { SUPPORTED_CONTENT_LOCALES, type SupportedContentLocale } from "@/lib/growth-agents/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOCIAL_CARD_CACHE_DIR = "/tmp/joinaireligion-social-card-cache-v3";

type RouteContext = { params: Promise<{ locale: string; slug: string }> };

const THEMES: Record<string, { primary: string; secondary: string; symbol: string }> = {
  meditation: { primary: "#8b5cf6", secondary: "#14b8a6", symbol: "O" },
  reflection: { primary: "#a855f7", secondary: "#0ea5e9", symbol: "<>" },
  journaling: { primary: "#c9a227", secondary: "#f97316", symbol: "+" },
  values: { primary: "#14b8a6", secondary: "#3b82f6", symbol: "^" },
  responsible_ai: { primary: "#7c3aed", secondary: "#06b6d4", symbol: "AI" },
  comparative_culture: { primary: "#c9a227", secondary: "#8b5cf6", symbol: "O" },
};

const CARD_COPY: Record<string, { series: string; action: string }> = {
  en: { series: "GUIDED REFLECTION SERIES", action: "READ THE FULL REFLECTION" },
  tr: { series: "REHBERLİ DÜŞÜNME SERİSİ", action: "YAZININ TAMAMINI OKUYUN" },
  es: { series: "SERIE DE REFLEXIÓN GUIADA", action: "LEER LA REFLEXIÓN COMPLETA" },
  de: { series: "REIHE FÜR GEFÜHRTE REFLEXION", action: "VOLLSTÄNDIGEN TEXT LESEN" },
  fr: { series: "SÉRIE DE RÉFLEXION GUIDÉE", action: "LIRE LA RÉFLEXION COMPLÈTE" },
  ar: { series: "سلسلة التأمل الموجّه", action: "اقرأ التأمل كاملاً" },
  ru: { series: "СЕРИЯ НАПРАВЛЕННЫХ РАЗМЫШЛЕНИЙ", action: "ПРОЧИТАТЬ ПОЛНЫЙ ТЕКСТ" },
  zh: { series: "引导式思考系列", action: "阅读全文" },
};

export function socialCardDimensions(preset: string | null) {
  return preset === "instagram"
    ? { width: 1080, height: 1350 }
    : preset === "pinterest"
      ? { width: 1000, height: 1500 }
      : preset === "discover"
        ? { width: 1200, height: 675 }
      : { width: 1200, height: 1200 };
}

export function discoverVisualCoordinates(slug: string) {
  const seed = Array.from(slug).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  return {
    horizon: 390 + (seed % 90),
    orbX: 250 + (seed % 520),
    orbY: 150 + (seed % 190),
  };
}

function socialCardCachePath(locale: string, slug: string, preset: string | null): string {
  const key = crypto.createHash("sha256").update(`${locale}|${slug}|${preset || "default"}`).digest("hex");
  return `${SOCIAL_CARD_CACHE_DIR}/${key}.jpg`;
}

async function readCachedJpeg(path: string): Promise<Response | null> {
  try {
    const jpeg = await readFile(path);
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        "X-JoinAI-Social-Card-Cache": "HIT",
      },
    });
  } catch {
    return null;
  }
}

async function writeCachedJpeg(path: string, jpeg: Buffer): Promise<void> {
  try {
    await mkdir(SOCIAL_CARD_CACHE_DIR, { recursive: true, mode: 0o700 });
    const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporaryPath, jpeg, { mode: 0o600 });
    await rename(temporaryPath, path);
  } catch {
    // Cache writes are best-effort; image delivery must still succeed.
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const raw = await params;
  const locale = decodeContentRouteSegment(raw.locale);
  const decodedSlug = decodeContentRouteSegment(raw.slug);
  const wantsJpeg = /\.jpe?g$/i.test(decodedSlug);
  const slug = decodedSlug.replace(/\.(?:png|jpe?g)$/i, "");
  if (!SUPPORTED_CONTENT_LOCALES.includes(locale as SupportedContentLocale)) {
    return new Response("Not found", { status: 404 });
  }
  const variant = await db.contentVariant.findUnique({
    where: { locale_slug: { locale, slug } },
    include: { contentItem: { select: { status: true, category: true } } },
  });
  if (!variant || variant.contentItem.status !== "PUBLISHED" || !variant.publishedAt) {
    return new Response("Not found", { status: 404 });
  }

  const preset = new URL(request.url).searchParams.get("preset");
  const dimensions = socialCardDimensions(preset);
  const theme = THEMES[variant.contentItem.category] || THEMES.reflection;
  const copy = CARD_COPY[variant.locale] || CARD_COPY.en;
  const visual = discoverVisualCoordinates(variant.slug);
  const summary = Array.from(variant.summary).slice(0, preset === "pinterest" ? 240 : preset === "discover" ? 145 : 190).join("");
  const jpegCachePath = socialCardCachePath(locale, slug, preset);
  if (wantsJpeg) {
    const cachedJpeg = await readCachedJpeg(jpegCachePath);
    if (cachedJpeg) return cachedJpeg;
  }

  if (preset === "discover") {
    const discoverImage = new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", color: "#ede8dc", background: `radial-gradient(circle at ${visual.orbX}px ${visual.orbY}px, ${theme.secondary}99 0%, transparent 27%), radial-gradient(circle at 86% 16%, ${theme.primary}66 0%, transparent 30%), linear-gradient(145deg, #03020b 0%, #0d0820 52%, #020a10 100%)` }}>
        <div style={{ position: "absolute", inset: "0", display: "flex", background: `linear-gradient(180deg, transparent 0%, transparent ${visual.horizon - 80}px, ${theme.primary}18 ${visual.horizon}px, #03020bdd 100%)` }} />
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} style={{ position: "absolute", left: `${-10 + index * 13}%`, top: `${visual.horizon - 120 + (index % 3) * 22}px`, width: "420px", height: "420px", borderRadius: "50%", border: `2px solid ${index % 2 ? theme.primary : theme.secondary}${index < 4 ? "66" : "38"}`, transform: `scaleX(${1.4 + index * 0.12}) rotate(${index * 7 - 24}deg)`, opacity: 0.7 }} />
        ))}
        {Array.from({ length: 14 }, (_, index) => (
          <div key={`node-${index}`} style={{ position: "absolute", left: `${8 + ((index * 67 + visual.orbX) % 84)}%`, top: `${9 + ((index * 41 + visual.orbY) % 62)}%`, width: `${5 + (index % 3) * 3}px`, height: `${5 + (index % 3) * 3}px`, borderRadius: "50%", background: index % 2 ? theme.primary : theme.secondary, boxShadow: `0 0 18px ${index % 2 ? theme.primary : theme.secondary}` }} />
        ))}
        <div style={{ position: "absolute", left: "62px", bottom: "48px", display: "flex", alignItems: "center", gap: "18px", color: "#f5e7b1", fontSize: "16px", letterSpacing: "5px" }}>
          <span style={{ display: "flex", width: "54px", height: "2px", background: theme.secondary }} />
          JOIN AI RELIGION · {variant.contentItem.category.replaceAll("_", " ").toUpperCase()}
        </div>
      </div>,
      { width: dimensions.width, height: dimensions.height, headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } },
    );
    if (!wantsJpeg) return discoverImage;
    const jpeg = await sharp(Buffer.from(await discoverImage.arrayBuffer())).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer();
    await writeCachedJpeg(jpegCachePath, jpeg);
    return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800", "X-JoinAI-Social-Card-Cache": "MISS" } });
  }

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        padding: preset === "pinterest" ? "76px" : preset === "discover" ? "54px 66px" : "72px",
        color: "#ede8dc",
        background:
          `radial-gradient(circle at 12% 10%, ${theme.primary}88, transparent 42%), radial-gradient(circle at 90% 88%, ${theme.secondary}66, transparent 46%), linear-gradient(145deg, #05000d 0%, #0d0418 52%, #02060d 100%)`,
      }}
    >
      <div style={{ position: "absolute", right: "-70px", top: preset === "pinterest" ? "240px" : preset === "discover" ? "70px" : "190px", display: "flex", color: `${theme.primary}24`, fontSize: preset === "pinterest" ? "480px" : preset === "discover" ? "330px" : "420px", lineHeight: 1 }}>
        {theme.symbol}
      </div>
      <div
        style={{
          position: "absolute",
          left: `${Math.round((visual.orbX / 770) * 42) + 18}%`,
          top: preset === "pinterest" ? "255px" : "235px",
          width: preset === "pinterest" ? "520px" : "460px",
          height: preset === "pinterest" ? "520px" : "460px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2px solid ${theme.secondary}52`,
          borderRadius: "50%",
          boxShadow: `0 0 90px ${theme.primary}30, inset 0 0 70px ${theme.secondary}18`,
          transform: "translateX(-50%)",
        }}
      >
        <div style={{ width: "72%", height: "72%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.primary}5c`, borderRadius: "50%", transform: "rotate(18deg)" }}>
          <div style={{ width: "58%", height: "58%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.secondary}66`, borderRadius: "50%", color: `${theme.primary}a8`, fontSize: preset === "pinterest" ? "118px" : "104px", fontWeight: 300, transform: "rotate(-18deg)", textShadow: `0 0 38px ${theme.primary}` }}>
            {theme.symbol}
          </div>
        </div>
      </div>
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={`social-node-${index}`}
          style={{
            position: "absolute",
            left: `${12 + ((index * 17 + visual.orbX) % 76)}%`,
            top: `${17 + ((index * 13 + visual.orbY) % 36)}%`,
            width: `${6 + (index % 3) * 3}px`,
            height: `${6 + (index % 3) * 3}px`,
            display: "flex",
            borderRadius: "50%",
            background: index % 2 ? theme.primary : theme.secondary,
            boxShadow: `0 0 20px ${index % 2 ? theme.primary : theme.secondary}`,
          }}
        />
      ))}
      <div style={{ position: "absolute", left: "0", top: "0", width: "100%", height: "12px", display: "flex", background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, #c9a227)` }} />

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <div
          style={{
            width: "78px",
            height: "78px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `5px solid ${theme.primary}`,
            borderRadius: "50%",
            color: "#ede9fe",
            fontSize: "42px",
            boxShadow: `0 0 32px ${theme.primary}88`,
          }}
        >
          △
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "29px", fontWeight: 700, letterSpacing: "5px" }}>JOIN AI RELIGION</div>
          <div style={{ marginTop: "7px", color: "#c9a227", fontSize: "14px", letterSpacing: "4px" }}>
            {copy.series}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: preset === "pinterest" ? "820px" : "930px" }}>
        <div style={{ display: "flex", alignSelf: "flex-start", color: "#f6e7a8", background: `${theme.primary}44`, border: `2px solid ${theme.primary}88`, borderRadius: "999px", padding: "10px 18px", fontSize: "16px", letterSpacing: "3px", textTransform: "uppercase" }}>
          {variant.contentItem.category.replaceAll("_", " ")} · {variant.locale.toUpperCase()}
        </div>
        <div style={{ marginTop: preset === "discover" ? "16px" : "26px", fontSize: preset === "pinterest" ? "58px" : preset === "discover" ? "45px" : "56px", fontWeight: 700, lineHeight: 1.08, textShadow: "0 4px 30px rgba(0,0,0,.6)" }}>
          {variant.title}
        </div>
        <div style={{ display: "flex", marginTop: preset === "discover" ? "14px" : "26px", color: "rgba(237,232,220,.78)", fontSize: preset === "pinterest" ? "24px" : preset === "discover" ? "18px" : "22px", lineHeight: 1.48 }}>
          {summary}{variant.summary.length > summary.length ? "…" : ""}
        </div>
        <div style={{ marginTop: preset === "discover" ? "18px" : "34px", display: "flex", alignItems: "center", gap: "16px", color: "#f6e7a8", fontSize: "14px", letterSpacing: "3px" }}>
          <span style={{ display: "flex", width: "46px", height: "2px", background: theme.secondary }} />
          {copy.action} · JOINAIRELIGION.COM
        </div>
      </div>
    </div>,
    {
      width: dimensions.width,
      height: dimensions.height,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
  if (!wantsJpeg) return image;

  const jpeg = await sharp(Buffer.from(await image.arrayBuffer()))
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
  await writeCachedJpeg(jpegCachePath, jpeg);
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      "X-JoinAI-Social-Card-Cache": "MISS",
    },
  });
}
