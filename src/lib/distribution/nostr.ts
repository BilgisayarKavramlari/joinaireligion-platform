import crypto from "crypto";
import { distributionSlug } from "@/lib/distribution/content";
import {
  assertDistributionArticle,
  type DistributionArticle,
  type DistributionPublicationResult,
} from "@/lib/distribution/types";

export type UnsignedNostrEvent = {
  pubkey: string;
  created_at: number;
  kind: 30023;
  tags: string[][];
  content: string;
};

export type SignedNostrEvent = UnsignedNostrEvent & { id: string; sig: string };

export type NostrSigner = {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent>;
};

export type NostrRelayPublisher = (relayUrl: string, event: SignedNostrEvent) => Promise<boolean>;

function validateHex(value: string, length: number, label: string): void {
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(value)) throw new Error(`${label} is invalid`);
}

export function computeNostrEventId(event: UnsignedNostrEvent): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
}

function normalizeRelayUrls(values: readonly string[]): string[] {
  const unique = [...new Set(values.map((value) => {
    const parsed = new URL(value);
    if (parsed.protocol !== "wss:" || parsed.username || parsed.password) throw new Error("Nostr relays must use credential-free WSS URLs");
    return parsed.toString();
  }))];
  if (unique.length < 2) throw new Error("Nostr publication requires at least two independent relays");
  return unique;
}

export async function buildUnsignedNostrArticle(
  article: DistributionArticle,
  signer: Pick<NostrSigner, "getPublicKey">,
  now = new Date(),
): Promise<UnsignedNostrEvent> {
  assertDistributionArticle(article);
  const pubkey = (await signer.getPublicKey()).toLowerCase();
  validateHex(pubkey, 64, "Nostr public key");
  return {
    pubkey,
    created_at: Math.floor(now.getTime() / 1000),
    kind: 30023,
    tags: [
      ["d", distributionSlug(article)],
      ["title", article.title],
      ["summary", article.summary],
      ["image", article.imageUrl],
      ["published_at", String(Math.floor(article.publishedAt.getTime() / 1000))],
      ["r", article.canonicalUrl],
      ["L", "ISO-639-1"],
      ["l", article.locale, "ISO-639-1"],
      ...article.tags.slice(0, 8).map((tag) => ["t", tag.toLowerCase()]),
    ],
    content: article.bodyMarkdown,
  };
}

export function createWebSocketRelayPublisher(WebSocketImpl: typeof WebSocket = WebSocket): NostrRelayPublisher {
  return (relayUrl, event) => new Promise<boolean>((resolve, reject) => {
    const socket = new WebSocketImpl(relayUrl);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Nostr relay acknowledgement timed out"));
    }, 12_000);
    socket.addEventListener("open", () => socket.send(JSON.stringify(["EVENT", event])));
    socket.addEventListener("message", (message) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(message.data));
      } catch {
        return;
      }
      if (!Array.isArray(parsed) || parsed[0] !== "OK" || parsed[1] !== event.id || typeof parsed[2] !== "boolean") return;
      clearTimeout(timeout);
      socket.close();
      resolve(parsed[2]);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Nostr relay connection failed"));
    });
  });
}

export async function publishNostrArticle(
  article: DistributionArticle,
  config: { relayUrls: readonly string[]; minimumAcceptedRelays?: number },
  signer: NostrSigner,
  relayPublisher: NostrRelayPublisher = createWebSocketRelayPublisher(),
): Promise<DistributionPublicationResult> {
  const relayUrls = normalizeRelayUrls(config.relayUrls);
  const minimumAcceptedRelays = config.minimumAcceptedRelays ?? 2;
  if (!Number.isInteger(minimumAcceptedRelays) || minimumAcceptedRelays < 2 || minimumAcceptedRelays > relayUrls.length) {
    throw new Error("Nostr minimum accepted relay count is invalid");
  }
  const unsigned = await buildUnsignedNostrArticle(article, signer);
  const signed = await signer.signEvent(unsigned);
  const signedPayload = { pubkey: signed.pubkey, created_at: signed.created_at, kind: signed.kind, tags: signed.tags, content: signed.content };
  if (JSON.stringify(signedPayload) !== JSON.stringify(unsigned)) {
    throw new Error("Nostr signer changed the event payload");
  }
  validateHex(signed.id, 64, "Nostr event ID");
  validateHex(signed.sig, 128, "Nostr event signature");
  if (signed.id !== computeNostrEventId(unsigned)) {
    throw new Error("Nostr signer returned an event ID that does not match the NIP-01 serialization");
  }
  const results = await Promise.allSettled(relayUrls.map((relayUrl) => relayPublisher(relayUrl, signed)));
  const accepted = results.filter((result) => result.status === "fulfilled" && result.value).length;
  if (accepted < minimumAcceptedRelays) throw new Error(`Nostr event accepted by ${accepted}/${minimumAcceptedRelays} required relays`);
  return { provider: "nostr", externalId: signed.id, externalUrl: null };
}
