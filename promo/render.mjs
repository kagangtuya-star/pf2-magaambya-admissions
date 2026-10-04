// Renders the promotional film with headless Chrome.
//   node promo/render.mjs                    full film → web/media/promo/
//   node promo/render.mjs --stills=3,20,40 --out=<dir>   PNG stills for review
//   node promo/render.mjs --audio --out=<dir>            score only, as WAV
// Set CHROME=/path/to/chrome when Chrome is not on PATH.
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeWebM, requireFFmpeg } from "./normalize.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "1"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);
const outDir = path.resolve(args.out || path.join(root, "web/media/promo"));
if (!args.stills && !args.audio) requireFFmpeg();
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of candidates) {
    if (path.isAbsolute(c) ? existsSync(c) : spawnSync(process.platform === "win32" ? "where" : "which", [c]).status === 0) return c;
  }
  throw new Error("找不到 Chrome，请通过 CHROME 环境变量指定。");
}

const body = (req) =>
  new Promise((resolve, reject) => {
    const parts = [];
    req.on("data", (d) => parts.push(d));
    req.on("end", () => resolve(Buffer.concat(parts)));
    req.on("error", reject);
  });

let finish;
const finished = new Promise((resolve, reject) => (finish = { resolve, reject }));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "POST") {
      const data = await body(req);
      if (url.pathname === "/log") console.log(`  ${data}`);
      else if (url.pathname === "/done") finish.resolve();
      else if (url.pathname === "/fail") finish.reject(new Error(String(data)));
      else if (url.pathname.startsWith("/out/")) {
        const name = path.basename(url.pathname);
        if (!/^[\w.-]+$/.test(name)) throw new Error(`bad name ${name}`);
        await mkdir(outDir, { recursive: true });
        await writeFile(path.join(outDir, name), data);
        console.log(`  wrote ${path.relative(root, path.join(outDir, name))} (${(data.length / 1048576).toFixed(2)} MB)`);
      }
      res.end("ok");
      return;
    }
    let file;
    if (url.pathname === "/") file = path.join(root, "promo/film.html");
    else if (url.pathname.startsWith("/promo/")) file = path.join(root, "promo", path.basename(url.pathname));
    else if (url.pathname.startsWith("/assets/")) file = path.join(root, "web/assets", path.basename(url.pathname));
    if (!file || !existsSync(file)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch (error) {
    res.statusCode = 500;
    res.end();
    finish.reject(error);
  }
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const query = new URLSearchParams();
if (args.stills) query.set("stills", args.stills);
if (args.audio) query.set("audio", "1");
if (args.bitrate) query.set("bitrate", args.bitrate);
const url = `http://127.0.0.1:${server.address().port}/?${query}`;
const profile = await mkdtemp(path.join(os.tmpdir(), "promo-chrome-"));
const chrome = spawn(
  findChrome(),
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=1920,1080",
    `--user-data-dir=${profile}`,
    ...(process.env.CHROME_NO_SANDBOX ? ["--no-sandbox"] : []),
    url,
  ],
  { stdio: "ignore" },
);
console.log(`Rendering via ${url}`);
const timeout = setTimeout(() => finish.reject(new Error("渲染超时")), 45 * 60 * 1000);
try {
  await finished;
  if (!args.stills && !args.audio) {
    console.log("Converting WebM to limited-range BT.709 for hardware decoding…");
    await normalizeWebM(path.join(outDir, "magaambya-promo.webm"));
  }
  console.log("Done.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  chrome.kill();
  server.close();
  await new Promise((r) => setTimeout(r, 500));
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
