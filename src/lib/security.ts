export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeUrl(url: string, baseUrl: string): string {
  const parsed = new URL(url, baseUrl);
  const base = new URL(baseUrl);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return base.toString();
  if (parsed.origin !== base.origin) return base.toString();
  return parsed.toString();
}

export function safeInternalPath(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\r\n]/.test(path)) return fallback;
  try {
    const url = new URL(path, "https://internal.invalid");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
