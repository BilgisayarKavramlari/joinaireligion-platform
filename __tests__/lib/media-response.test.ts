import { EventEmitter } from "node:events";

const mockStat = jest.fn();
const mockCreateReadStream = jest.fn();

jest.mock("node:fs/promises", () => ({ stat: mockStat }));
jest.mock("node:fs", () => ({ createReadStream: mockCreateReadStream }));
jest.mock("node:stream", () => ({ Readable: { toWeb: jest.fn(() => new ReadableStream({ start(controller) { controller.close(); } })) } }));

import { serveGeneratedMedia } from "@/lib/media-response";

describe("runtime generated media", () => {
  beforeEach(() => {
    mockStat.mockResolvedValue({ isFile: () => true, size: 1_000 });
    mockCreateReadStream.mockReturnValue(new EventEmitter());
  });

  it("serves byte ranges without requiring an application restart", async () => {
    const response = await serveGeneratedMedia(new Request("https://example.com/uploads/video/example.mp4", { headers: { Range: "bytes=0-99" } }), { directory: "video", file: "example.mp4" });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-99/1000");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(mockCreateReadStream).toHaveBeenCalledWith(expect.stringContaining("/public/uploads/video/example.mp4"), { start: 0, end: 99 });
  });

  it("rejects traversal and wrong extensions", async () => {
    expect((await serveGeneratedMedia(new Request("https://example.com"), { directory: "video", file: "../secret.mp4" })).status).toBe(404);
    expect((await serveGeneratedMedia(new Request("https://example.com"), { directory: "video", file: "episode.mp3" })).status).toBe(404);
    expect(mockStat).not.toHaveBeenCalled();
  });

  it("returns 416 for invalid ranges", async () => {
    const response = await serveGeneratedMedia(new Request("https://example.com", { headers: { Range: "bytes=1000-2000" } }), { directory: "podcast", file: "episode.mp3" });
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */1000");
  });
});
