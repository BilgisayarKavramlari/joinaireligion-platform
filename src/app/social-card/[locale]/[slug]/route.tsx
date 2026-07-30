import { ImageResponse } from "next/og";
import React from "react";
import sharp from "sharp";
import { decodeContentRouteSegment } from "@/lib/content-routing";
import { db } from "@/lib/db";
import { SUPPORTED_CONTENT_LOCALES, type SupportedContentLocale } from "@/lib/growth-agents/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ locale: string; slug: string }> };

const THEMES: Record<string, { primary: string; secondary: string; symbol: string }> = {
  meditation: { primary: "#8b5cf6", secondary: "#14b8a6", symbol: "◉" },
  reflection: { primary: "#a855f7", secondary: "#0ea5e9", symbol: "◇" },
  journaling: { primary: "#c9a227", secondary: "#f97316", symbol: "✦" },
  values: { primary: "#14b8a6", secondary: "#3b82f6", symbol: "△" },
  responsible_ai: { primary: "#7c3aed", secondary: "#06b6d4", symbol: "⌁" },
  comparative_culture: { primary: "#c9a227", secondary: "#8b5cf6", symbol: "◎" },
};

const CARD_COPY: Record<string, { series: string; action: string }> = {
  en: { series: "GUIDED REFLECTION SERIES", action: "READ THE FULL REFLECTION" },
  tr: { series: "REHBERLİ DÜŞÜNME SERİSİ", action: "YAZININ TAMAMINI OKUYUN" },
  es: { series: "SERIE DE REFLEXIÓN GUIADA", action: "LEER LA REFLEXIÓN COMPLETA" },
  de: { series: "REIHE FÜR GEFÜHRTE REFLEXION", action: "VOLLSTÄNDIGEN TEXT LESEN" },
  fr: { series: "SÉRIE DE RÉFLEXION GUIDÉE", action: "LIRE LA RÉFLEXION COMPLÈTE" },
  ru: { series: "СЕРИЯ НАПРАВЛЕННЫХ РАЗМЫШЛЕНИЙ", action: "ПРОЧИТАТЬ ПОЛНЫЙ ТЕКСТ" },
  zh: { series: "引导式思考系列", action: "阅读全文" },
};

export function socialCardDimensions(preset: string | null) {
  return preset === "instagram"
    ? { width: 1080, height: 1350 }
    : preset === "pinterest"
      ? { width: 1000, height: 1500 }
      : { width: 1200, height: 1200 };
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
  const summary = Array.from(variant.summary).slice(0, preset === "pinterest" ? 240 : 190).join("");

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
        padding: preset === "pinterest" ? "76px" : "72px",
        color: "#ede8dc",
        background:
          `radial-gradient(circle at 12% 10%, ${theme.primary}88, transparent 42%), radial-gradient(circle at 90% 88%, ${theme.secondary}66, transparent 46%), linear-gradient(145deg, #05000d 0%, #0d0418 52%, #02060d 100%)`,
      }}
    >
      <div style={{ position: "absolute", right: "-70px", top: preset === "pinterest" ? "240px" : "190px", display: "flex", color: `${theme.primary}24`, fontSize: preset === "pinterest" ? "480px" : "420px", lineHeight: 1 }}>
        {theme.symbol}
      </div>
      <div style={{ position: "absolute", left: "0", top: "0", width: "100%", height: "12px", display: "flex", background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, #c9a227)` }} />

      <div style={{ display: "flex", alignItems: "center", gap: "24px", zIndex: 1 }}>
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

      <div style={{ display: "flex", flexDirection: "column", maxWidth: preset === "pinterest" ? "820px" : "930px", zIndex: 1 }}>
        <div style={{ display: "flex", alignSelf: "flex-start", color: "#f6e7a8", background: `${theme.primary}44`, border: `2px solid ${theme.primary}88`, borderRadius: "999px", padding: "10px 18px", fontSize: "16px", letterSpacing: "3px", textTransform: "uppercase" }}>
          {variant.contentItem.category.replaceAll("_", " ")} · {variant.locale.toUpperCase()}
        </div>
        <div style={{ marginTop: "26px", fontSize: preset === "pinterest" ? "58px" : "56px", fontWeight: 700, lineHeight: 1.08, textShadow: "0 4px 30px rgba(0,0,0,.6)" }}>
          {variant.title}
        </div>
        <div style={{ marginTop: "26px", color: "rgba(237,232,220,.78)", fontSize: preset === "pinterest" ? "24px" : "22px", lineHeight: 1.48 }}>
          {summary}{variant.summary.length > summary.length ? "…" : ""}
        </div>
        <div style={{ marginTop: "34px", display: "flex", alignItems: "center", gap: "16px", color: "#f6e7a8", fontSize: "14px", letterSpacing: "3px" }}>
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
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
