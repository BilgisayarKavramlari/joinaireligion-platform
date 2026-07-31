export const dynamic = "force-dynamic";

import { serveGeneratedMedia } from "@/lib/media-response";

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  return serveGeneratedMedia(request, { directory: "video", file: (await params).file });
}
