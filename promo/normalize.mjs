// Canvas/WebCodecs VP9 uses full-range colour, which can fail in D3D11 decoders.
// Convert the actual pixels to limited-range BT.709, not just the metadata.
import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ffmpeg = () => process.env.FFMPEG || "ffmpeg";

export function requireFFmpeg() {
  const result = spawnSync(ffmpeg(), ["-version"], { stdio: "ignore" });
  if (result.error || result.status !== 0)
    throw new Error("找不到 FFmpeg，请安装或通过 FFMPEG 环境变量指定，以生成兼容硬件解码的 WebM。");
}

export async function normalizeWebM(input, output = input) {
  const destination = path.resolve(output);
  await mkdir(path.dirname(destination), { recursive: true });
  const work = await mkdtemp(path.join(path.dirname(destination), ".promo-normalize-"));
  const encoded = path.join(work, "film.webm");
  try {
    const child = spawn(ffmpeg(), [
      "-hide_banner", "-loglevel", "error", "-nostdin",
      "-i", path.resolve(input),
      "-map", "0:v:0", "-map", "0:a:0",
      "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709",
      "-c:v", "libvpx-vp9", "-row-mt", "1",
      "-deadline", "realtime", "-cpu-used", "4",
      "-crf", "24", "-b:v", "0", "-g", "60",
      "-pix_fmt", "yuv420p", "-color_range", "tv",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-c:a", "copy", encoded,
    ], { stdio: "inherit" });
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`)));
    });
    await rename(encoded, destination);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: node promo/normalize.mjs <input.webm> [output.webm]");
  requireFFmpeg();
  await normalizeWebM(input, process.argv[3] || input);
}
