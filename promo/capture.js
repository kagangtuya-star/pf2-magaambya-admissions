// Runs inside headless Chrome: renders the score and every frame, encodes them
// with WebCodecs (VP9 + Opus) and posts the finished files back to render.mjs.
import { WIDTH, HEIGHT, FPS, DURATION } from "./timeline.js";
import { prepare, drawFrame } from "./film.js";
import { renderScore } from "./score.js";
import { muxWebM } from "./webm.js";

const POSTER_TIME = 58.5;
const params = new URLSearchParams(location.search);
const send = (url, body) => fetch(url, { method: "POST", body });
const log = (message) => send("/log", message);
const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
const bytes = (source) => {
  const out = new Uint8Array(source.byteLength);
  source.copyTo(out);
  return out;
};

function wav(buffer) {
  const frames = buffer.length,
    channels = buffer.numberOfChannels;
  const view = new DataView(new ArrayBuffer(44 + frames * channels * 2));
  const str = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + frames * channels * 2, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, frames * channels * 2, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  for (let i = 0, o = 44; i < frames; i++)
    for (let c = 0; c < channels; c++, o += 2) view.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true);
  return new Blob([view.buffer], { type: "audio/wav" });
}

async function encodeAudio(buffer) {
  const chunks = [];
  let description;
  let failure;
  const encoder = new AudioEncoder({
    output(chunk, meta) {
      chunks.push({ data: bytes(chunk), timestamp: chunk.timestamp });
      const d = meta?.decoderConfig?.description;
      if (d && !description)
        description = new Uint8Array(ArrayBuffer.isView(d) ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d.slice(0));
    },
    error: (e) => (failure = e),
  });
  encoder.configure({ codec: "opus", sampleRate: buffer.sampleRate, numberOfChannels: 2, bitrate: 160000 });
  const left = buffer.getChannelData(0),
    right = buffer.getChannelData(1);
  for (let offset = 0; offset < buffer.length; offset += 4800) {
    const n = Math.min(4800, buffer.length - offset);
    const data = new Float32Array(n * 2);
    data.set(left.subarray(offset, offset + n), 0);
    data.set(right.subarray(offset, offset + n), n);
    const frame = new AudioData({
      format: "f32-planar",
      sampleRate: buffer.sampleRate,
      numberOfFrames: n,
      numberOfChannels: 2,
      timestamp: Math.round((offset / buffer.sampleRate) * 1e6),
      data,
    });
    encoder.encode(frame);
    frame.close();
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  return { chunks, description };
}

async function encodeVideo(canvas, ctx) {
  const chunks = [];
  let failure;
  const encoder = new VideoEncoder({
    output: (chunk) => chunks.push({ data: bytes(chunk), timestamp: chunk.timestamp, key: chunk.type === "key" }),
    error: (e) => (failure = e),
  });
  encoder.configure({
    codec: "vp09.00.40.08",
    width: WIDTH,
    height: HEIGHT,
    bitrate: Number(params.get("bitrate")) || 3_200_000,
    bitrateMode: "variable",
    framerate: FPS,
    latencyMode: "quality",
  });
  const total = Math.round(DURATION * FPS);
  const started = performance.now();
  for (let i = 0; i < total; i++) {
    drawFrame(ctx, i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 4));
    if (failure) throw failure;
    if (i % (FPS * 5) === 0) log(`frame ${i}/${total} · ${((performance.now() - started) / 1000).toFixed(0)}s`);
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  return chunks;
}

async function main() {
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  await prepare();

  if (params.has("stills")) {
    for (const t of params.get("stills").split(",").map(Number)) {
      drawFrame(ctx, t);
      await send(`/out/still-${t.toFixed(2)}.png`, await toBlob(canvas, "image/png"));
    }
    return send("/done", "");
  }

  const score = await renderScore();
  let peak = 0;
  for (let c = 0; c < 2; c++) for (const v of score.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  log(`score rendered · peak ${peak.toFixed(3)}`);
  if (params.has("audio")) {
    await send("/out/score.wav", wav(score));
    return send("/done", "");
  }

  const audio = await encodeAudio(score);
  log(`audio encoded · ${audio.chunks.length} packets`);
  const video = await encodeVideo(canvas, ctx);
  log(`video encoded · ${video.length} frames`);
  const film = muxWebM({
    video: { width: WIDTH, height: HEIGHT, fps: FPS },
    audio: { sampleRate: score.sampleRate, channels: 2, description: audio.description },
    videoChunks: video,
    audioChunks: audio.chunks,
    durationMs: DURATION * 1000,
    title: "玛甘比学院 · 歌风之城的来信",
  });
  await send("/out/magaambya-promo.webm", new Blob([film], { type: "video/webm" }));
  drawFrame(ctx, POSTER_TIME);
  await send("/out/poster.webp", await toBlob(canvas, "image/webp", 0.86));
  await send("/done", "");
}

main().catch((error) => send("/fail", error?.stack || String(error)));
