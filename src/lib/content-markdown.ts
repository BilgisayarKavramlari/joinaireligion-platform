export type ContentInlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "emphasis"; text: string }
  | { type: "link"; text: string; href: string };

export type ContentMarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "rule" };

function isSafeLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Parse the deliberately small, HTML-free inline Markdown subset used by public content. */
export function contentInlineTokens(value: string): ContentInlineToken[] {
  const pattern = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g;
  const tokens: ContentInlineToken[] = [];
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "text", text: value.slice(cursor, index) });
    const raw = match[0];
    const link = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link && isSafeLink(link[2])) {
      tokens.push({ type: "link", text: link[1], href: link[2] });
    } else if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "strong", text: raw.slice(2, -2) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "emphasis", text: raw.slice(1, -1) });
    } else {
      tokens.push({ type: "text", text: raw });
    }
    cursor = index + raw.length;
  }

  if (cursor < value.length) tokens.push({ type: "text", text: value.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", text: value }];
}

function blockStart(line: string): boolean {
  return /^#{1,3}\s+/.test(line)
    || /^>\s?/.test(line)
    || /^[-*]\s+/.test(line)
    || /^\d+[.)]\s+/.test(line)
    || /^---+$/.test(line);
}

/** Parse public article Markdown without executing embedded HTML. */
export function contentMarkdownBlocks(value: string): ContentMarkdownBlock[] {
  const lines = value
    .replace(/\\r\\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks: ContentMarkdownBlock[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (/^---+$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length >= 3 ? 3 : 2, text: heading[2].trim() });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        const match = isOrdered ? candidate.match(/^\d+[.)]\s+(.+)$/) : candidate.match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || blockStart(candidate)) break;
      paragraph.push(candidate);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}
