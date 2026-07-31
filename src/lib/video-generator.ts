import { execFile } from "node:child_process";
import { mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function generateReflectiveVideo(input: { audioFileName: string; outputFileName: string }) {
  const audioPath = path.join(process.cwd(), "public", "uploads", "podcast", path.basename(input.audioFileName));
  const coverPath = path.join(process.cwd(), "public", "visuals", "reflective-video-cover.jpg");
  const outputDirectory = path.join(process.cwd(), "public", "uploads", "video");
  const outputPath = path.join(outputDirectory, path.basename(input.outputFileName));
  const temporaryPath = `${outputPath}.tmp.mp4`;
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([stat(audioPath), stat(coverPath)]);

  await execFileAsync("ffmpeg", [
    "-y", "-loop", "1", "-i", coverPath, "-i", audioPath,
    "-filter_complex",
    "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p[v]",
    "-map", "[v]", "-map", "1:a:0", "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage",
    "-r", "25", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", temporaryPath,
  ], { maxBuffer: 2_000_000, timeout: 300_000 });
  await rename(temporaryPath, outputPath);
  const [file, probe] = await Promise.all([
    stat(outputPath),
    execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outputPath], { timeout: 30_000 }),
  ]);
  const durationSeconds = Number(probe.stdout.trim());
  if (file.size < 10_000 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("Generated video failed media validation");
  return { bytes: file.size, durationSeconds };
}
