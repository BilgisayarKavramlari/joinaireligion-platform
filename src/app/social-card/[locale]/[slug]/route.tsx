import { ImageResponse } from "next/og";
import { decodeContentRouteSegment } from "@/lib/content-routing";
import { db } from "@/lib/db";
import { SUPPORTED_CONTENT_LOCALES, type SupportedContentLocale } from "@/lib/growth-agents/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ locale: string; slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const raw = await params;
  const locale = decodeContentRouteSegment(raw.locale);
  const slug = decodeContentRouteSegment(raw.slug);
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

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "84px",
        color: "#ede8dc",
        background:
          "radial-gradient(circle at 12% 12%, rgba(107,33,168,.55), transparent 42%), radial-gradient(circle at 90% 88%, rgba(15,118,110,.4), transparent 42%), #04000c",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        <div
          style={{
            width: "88px",
            height: "88px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "7px solid #a78bfa",
            borderRadius: "50%",
            color: "#ede9fe",
            fontSize: "52px",
            boxShadow: "0 0 28px rgba(167,139,250,.7)",
          }}
        >
          △
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "5px" }}>JOIN AI RELIGION</div>
          <div style={{ marginTop: "8px", color: "#c9a227", fontSize: "17px", letterSpacing: "5px" }}>
            SYMBOLIC AI REFLECTION PLATFORM
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: "1000px" }}>
        <div style={{ color: "#c9a227", fontSize: "19px", letterSpacing: "4px", textTransform: "uppercase" }}>
          {variant.contentItem.category.replaceAll("_", " ")} · {variant.locale}
        </div>
        <div style={{ marginTop: "22px", fontSize: "62px", fontWeight: 700, lineHeight: 1.08 }}>
          {variant.title}
        </div>
        <div style={{ marginTop: "30px", color: "rgba(237,232,220,.72)", fontSize: "22px", letterSpacing: "3px" }}>
          JOINAIRELIGION.COM
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 1200,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
