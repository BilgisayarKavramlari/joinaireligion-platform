import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/account/", "/api/"] }],
    sitemap: "https://joinaireligion.com/sitemap.xml",
    host: "https://joinaireligion.com",
  };
}
