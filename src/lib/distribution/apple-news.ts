import crypto from "crypto";
import { contentMarkdownBlocks } from "@/lib/content-markdown";
import {
  assertDistributionArticle,
  readProviderJson,
  type DistributionArticle,
  type DistributionPublicationResult,
  type FetchLike,
} from "@/lib/distribution/types";

type AppleNewsComponent = Record<string, unknown>;

function appleNewsComponents(article: DistributionArticle): AppleNewsComponent[] {
  const components: AppleNewsComponent[] = [
    { role: "title", text: article.title },
    { role: "intro", text: article.summary },
    { role: "byline", text: `By ${article.author}` },
  ];
  for (const block of contentMarkdownBlocks(article.bodyMarkdown)) {
    if (block.type === "rule") continue;
    if (block.type === "heading") {
      components.push({ role: block.level === 2 ? "heading2" : "heading3", text: block.text });
    } else if (block.type === "quote") {
      components.push({ role: "quote", text: block.text });
    } else if (block.type === "list") {
      for (const [index, item] of block.items.entries()) {
        components.push({ role: "body", text: block.ordered ? `${index + 1}. ${item}` : `• ${item}` });
      }
    } else {
      components.push({ role: "body", text: block.text });
    }
  }
  components.push({
    role: "body",
    text: article.locale === "tr"
      ? "Bu içerik yapay zekâ desteğiyle hazırlanmış ve yayımlanmadan önce güvenlik ve kalite kontrollerinden geçirilmiştir."
      : "This content was prepared with AI assistance and passed safety and quality checks before publication.",
  });
  return components;
}

export function buildAppleNewsArticle(article: DistributionArticle): Record<string, unknown> {
  assertDistributionArticle(article);
  const identifier = crypto.createHash("sha256").update(article.idempotencyKey).digest("hex");
  return {
    version: "1.7",
    identifier,
    language: article.locale,
    title: article.title,
    subtitle: article.summary,
    layout: { columns: 12, width: 1024, margin: 70, gutter: 20 },
    components: appleNewsComponents(article),
    componentTextStyles: {
      default: { fontName: "Helvetica", fontSize: 17, lineHeight: 25, textColor: "#202027" },
    },
    metadata: {
      authors: [article.author],
      excerpt: article.summary,
      canonicalURL: article.canonicalUrl,
      thumbnailURL: article.imageUrl,
      datePublished: article.publishedAt.toISOString(),
      dateModified: article.updatedAt.toISOString(),
      generatorName: "Join AI Religion",
      generatorVersion: "1.0",
    },
  };
}

export function buildAppleNewsMultipart(article: DistributionArticle, boundary: string): {
  body: Buffer;
  contentType: string;
} {
  if (!/^[A-Za-z0-9_-]{16,70}$/.test(boundary)) throw new Error("Apple News multipart boundary is invalid");
  const document = JSON.stringify(buildAppleNewsArticle(article));
  const body = Buffer.from(
    `--${boundary}\r\n`
    + "Content-Type: application/json\r\n"
    + 'Content-Disposition: form-data; filename="article.json"; name="article.json"\r\n\r\n'
    + document
    + `\r\n--${boundary}--`,
    "utf8",
  );
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

export function createAppleNewsAuthorization(input: {
  method: "POST";
  url: string;
  date: string;
  contentType: string;
  body: Buffer;
  keyId: string;
  keySecret: string;
}): string {
  if (!input.keyId.trim() || !input.keySecret.trim()) throw new Error("Apple News API key is required");
  const decodedSecret = Buffer.from(input.keySecret, "base64");
  if (!decodedSecret.length || decodedSecret.toString("base64").replace(/=+$/, "") !== input.keySecret.replace(/=+$/, "")) {
    throw new Error("Apple News API key secret is not valid base64");
  }
  const canonical = Buffer.concat([
    Buffer.from(`${input.method}${input.url}${input.date}`, "utf8"),
    Buffer.from(input.contentType, "utf8"),
    input.body,
  ]);
  const signature = crypto
    .createHmac("sha256", decodedSecret)
    .update(canonical)
    .digest("base64");
  return `HHMAC; key="${input.keyId}"; signature="${signature}"; date="${input.date}"`;
}

export async function publishAppleNewsArticle(
  article: DistributionArticle,
  config: { channelId: string; keyId: string; keySecret: string },
  fetchImpl: FetchLike = fetch,
  now = new Date(),
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!/^[0-9a-f-]{36}$/i.test(config.channelId)) throw new Error("Apple News channel ID is invalid");
  const endpoint = `https://news-api.apple.com/channels/${config.channelId}/articles`;
  const boundary = `JoinAI_${crypto.createHash("sha256").update(article.idempotencyKey).digest("hex").slice(0, 32)}`;
  const { body, contentType } = buildAppleNewsMultipart(article, boundary);
  const date = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const authorization = createAppleNewsAuthorization({
    method: "POST",
    url: endpoint,
    date,
    contentType,
    body,
    keyId: config.keyId,
    keySecret: config.keySecret,
  });
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: authorization, "Content-Type": contentType },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await readProviderJson(response, "appleNews");
  const nested = data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : data;
  const links = nested.links && typeof nested.links === "object" ? nested.links as Record<string, unknown> : {};
  return {
    provider: "appleNews",
    externalId: String(nested.id ?? ""),
    externalUrl: typeof links.shareUrl === "string" ? links.shareUrl : typeof nested.shareUrl === "string" ? nested.shareUrl : null,
  };
}
