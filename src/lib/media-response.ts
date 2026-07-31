import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(mp3|mp4)$/;

export async function serveGeneratedMedia(request: Request, input: { directory: "podcast" | "video"; file: string }) {
  if (!FILE_PATTERN.test(input.file)) return new Response("Not found", { status: 404 });
  const expectedExtension = input.directory === "podcast" ? ".mp3" : ".mp4";
  if (path.extname(input.file) !== expectedExtension) return new Response("Not found", { status: 404 });
  const mediaPath = path.join(process.cwd(), "public", "uploads", input.directory, path.basename(input.file));
  const file = await stat(mediaPath).catch(() => null);
  if (!file?.isFile() || file.size <= 0) return new Response("Not found", { status: 404 });

  const range = request.headers.get("range");
  let start = 0;
  let end = file.size - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
    start = match[1] ? Number(match[1]) : 0;
    end = match[2] ? Number(match[2]) : file.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= file.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
    }
    end = Math.min(end, file.size - 1);
    status = 206;
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": String(end - start + 1),
    "Content-Type": input.directory === "podcast" ? "audio/mpeg" : "video/mp4",
    "X-Content-Type-Options": "nosniff",
  });
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
  const body = Readable.toWeb(createReadStream(mediaPath, { start, end })) as ReadableStream;
  return new Response(body, { status, headers });
}
