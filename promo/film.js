// Picture for the Magaambya promotional film. Every frame is a pure function of
// time, so stills and the encoded film always agree.
import {
  WIDTH as W,
  HEIGHT as H,
  SCENES,
  MASK_HITS,
  BRANCH_HITS,
  BRANCH_UNITY,
  CREST_REVEAL,
} from "./timeline.js";

const CN = '"Noto Serif CJK SC", "Source Han Serif SC", serif';
const EN = '"Liberation Serif", "Times New Roman", "DejaVu Serif", serif';
const PAPER = "#f0e8d6";
const BRASS = "#cdb57f";
const GOLD = "#e7c77f";

const BRANCHES = [
  ["承流学会", "想象", "CASCADE BEARERS", "让最远的设想，化作切实的奇思。", "cascade", "#6fb3c8"],
  ["翠枝学社", "情谊", "EMERALD BOUGHS", "以情谊联结学院内外的每一个人。", "boughs", "#86b36d"],
  ["雨幕书会", "适应", "RAIN-SCRIBES", "顺势而变，从每一次失败中学习。", "rain", "#8fa6c4"],
  ["岚阳法盟", "勇气", "TEMPEST-SUN MAGES", "为同伴挺身，也敢于质疑权威。", "courage", "#d27a4c"],
  ["传智学派", "知识", "UZUNJATI", "知识藏于故事，也生于亲身实践。", "knowledge", "#cfa75a"],
];

// Icon outlines shared with the site (web/lib/dom.js), 24-unit viewBox.
const ICONS = {
  cascade: ["M5 4c4 0 3 5 7 5s3-5 7-5M5 10c4 0 3 5 7 5s3-5 7-5M5 16c4 0 3 4 7 4s3-4 7-4"],
  boughs: ["M12 21V8m0 6c-4 0-7-2-8-6 4 0 7 2 8 6Zm0-5c4 0 7-2 8-6-4 0-7 2-8 6Z"],
  rain: ["M7 4v8m5-10v8m5-6v8M5 17l2 3 2-3m6 0 2 3 2-3"],
  courage: [
    "M15.5 12a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0",
    "M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  ],
  knowledge: [
    "M12 6C9 3 5 3 3 4v14c3-1 6 0 9 3m0-15c3-3 7-3 9-2v14c-3-1-6 0-9 3V6Z",
    "M6 8h3m-3 3h3m6-3h3m-3 3h3",
  ],
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t) => 1 - (1 - clamp(t)) ** 3;
const easeInOut = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
const window01 = (t, a, b, fin = 0.6, fout = 0.6) => smooth(a, a + fin, t) * (1 - smooth(b - fout, b, t));
const TAU = Math.PI * 2;

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x) {
  const i = Math.floor(x),
    f = x - i,
    u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- assets ----------
const assets = {};
const buffers = [];

export async function prepare() {
  const load = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`无法加载 ${src}`));
      img.src = src;
    });
  const [crest, poster] = await Promise.all([load("/assets/crest.svg"), load("/assets/raincourt-poster.svg")]);
  assets.crest = crest;
  const p = document.createElement("canvas");
  p.width = 1920;
  p.height = 1200;
  p.getContext("2d").drawImage(poster, 0, 0, 1920, 1200);
  assets.poster = p;

  const source = await (await fetch(import.meta.url)).text();
  const glyphs = [...new Set(source.replace(/[\x00-\x7f]/g, ""))].join("");
  await Promise.all([
    document.fonts.load(`400 40px ${CN}`, glyphs),
    document.fonts.load(`700 40px ${CN}`, glyphs),
    document.fonts.load(`400 20px ${EN}`, "ABC"),
  ]);
  for (let i = 0; i < 2; i++) {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    buffers.push(c);
  }
  assets.sigil = buildSigil();
  assets.icons = Object.fromEntries(Object.entries(ICONS).map(([k, list]) => [k, list.map((d) => new Path2D(d))]));
  assets.reflect = document.createElement("canvas");
  assets.reflect.width = W;
  assets.reflect.height = H;
}

// ---------- typography ----------
function typeLine(ctx, str, x, y, o) {
  const {
    t,
    start,
    end = Infinity,
    size = 40,
    family = CN,
    weight = 400,
    color = PAPER,
    stagger = 0.05,
    dur = 0.8,
    rise = 16,
    spacing = 0,
    align = "center",
    blur = 10,
    glow = 0,
    glowColor = "rgba(231,199,127,.55)",
    alpha = 1,
  } = o;
  if (t < start || t > end) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glow;
  }
  const chars = [...str];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const out = end === Infinity ? 1 : 1 - smooth(end - 0.7, end, t);
  chars.forEach((c, i) => {
    const e = easeOut((t - start - i * stagger) / dur);
    const a = e * out * alpha;
    if (a > 0.002 && c !== " ") {
      ctx.globalAlpha = a;
      ctx.filter = blur && e < 0.999 ? `blur(${((1 - e) * blur).toFixed(2)}px)` : "none";
      ctx.fillText(c, cx, y + (1 - e) * rise);
    }
    cx += widths[i] + spacing;
  });
  ctx.restore();
}

const eyebrow = (ctx, str, x, y, o) =>
  typeLine(ctx, str, x, y, { size: 17, family: EN, color: BRASS, spacing: 6.5, stagger: 0.018, dur: 0.9, rise: 6, blur: 4, ...o });

function rule(ctx, x, y, width, progress, alpha = 1, color = BRASS) {
  if (progress <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
  g.addColorStop(0, "rgba(205,181,127,0)");
  g.addColorStop(0.5, color);
  g.addColorStop(1, "rgba(205,181,127,0)");
  ctx.fillStyle = g;
  const w = width * easeOut(progress);
  ctx.fillRect(x - w / 2, y, w, 1.4);
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x + 4, y + 0.7);
  ctx.lineTo(x, y + 5.4);
  ctx.lineTo(x - 4, y + 0.7);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * clamp(progress * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- shared layers ----------
function rain(ctx, t, amount, { tint = "220,232,222", wind = 0.16, seed = 3 } = {}) {
  if (amount <= 0) return;
  const r = rng(seed);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 340; i++) {
    const depth = r();
    const speed = 900 + depth * 1500;
    const len = 18 + depth * 62;
    const x0 = r() * (W + 400) - 200;
    const y0 = r() * (H + 200);
    const y = ((y0 + speed * t) % (H + 200)) - 100;
    const x = x0 + wind * (y + 100);
    ctx.globalAlpha = amount * (0.05 + depth * 0.16);
    ctx.strokeStyle = `rgb(${tint})`;
    ctx.lineWidth = 0.6 + depth * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + wind * len, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

function motes(ctx, t, { count = 60, color = "255,214,140", seed = 9, area = [0, 0, W, H], rise = 18, size = 2.4, alpha = 1 } = {}) {
  const r = rng(seed);
  const [ax, ay, aw, ah] = area;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const px = r(),
      py = r(),
      ph = r() * 100,
      sp = 0.4 + r();
    const x = ax + ((px * aw + Math.sin(t * 0.4 * sp + ph) * 30) % aw);
    const y = ay + ((((py * ah - t * rise * sp) % ah) + ah) % ah);
    const flicker = 0.35 + 0.65 * noise(t * 1.6 * sp + ph);
    const s = size * (0.5 + r());
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 6);
    g.addColorStop(0, `rgba(${color},${0.9 * flicker * alpha})`);
    g.addColorStop(0.25, `rgba(${color},${0.28 * flicker * alpha})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - s * 6, y - s * 6, s * 12, s * 12);
  }
  ctx.restore();
}

function glow(ctx, x, y, radius, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(0.35, `rgba(${color},${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

// The arcane sigil used across the site, rebuilt as paths in a 200-unit box.
function buildSigil() {
  const r = rng(1469);
  const polar = (rad, a) => [100 + Math.cos(a) * rad, 100 + Math.sin(a) * rad];
  const ticks = new Path2D();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const [x1, y1] = polar(i % 6 === 0 ? 89 : 92, a);
    const [x2, y2] = polar(95, a);
    ticks.moveTo(x1, y1);
    ticks.lineTo(x2, y2);
  }
  const glyphs = new Path2D();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const cx = 100 + Math.cos(a) * 82,
      cy = 100 + Math.sin(a) * 82;
    const n = 2 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      glyphs.moveTo(cx + (r() - 0.5) * 6, cy + (r() - 0.5) * 6);
      glyphs.lineTo(cx + (r() - 0.5) * 6, cy + (r() - 0.5) * 6);
    }
  }
  const nodes = Array.from({ length: 5 }, (_, i) => polar(48, -Math.PI / 2 + (i / 5) * TAU));
  return { ticks, glyphs, nodes };
}

function drawSigil(ctx, x, y, radius, progress, { rotation = 0, alpha = 1, color = GOLD, glowAmt = 16, inner = 1 } = {}) {
  if (progress <= 0 || alpha <= 0) return;
  const s = radius / 100;
  const { ticks, glyphs, nodes } = assets.sigil;
  const arc = (r, p, w) => {
    if (p <= 0) return;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(100, 100, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p));
    ctx.stroke();
  };
  const seg = (a, b) => clamp((progress - a) / (b - a));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.translate(-radius, -radius);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(236,197,120,.75)";
  ctx.shadowBlur = glowAmt;
  ctx.globalAlpha = alpha;
  arc(97, seg(0, 0.35), 1 / s + 0.6);
  arc(95, seg(0.05, 0.4), 0.4);
  ctx.globalAlpha = alpha * seg(0.25, 0.5);
  ctx.lineWidth = 0.6;
  ctx.stroke(ticks);
  ctx.globalAlpha = alpha;
  arc(76, seg(0.2, 0.55), 1);
  arc(74, seg(0.25, 0.6), 0.4);
  ctx.globalAlpha = alpha * seg(0.45, 0.7);
  ctx.lineWidth = 0.9;
  ctx.stroke(glyphs);
  ctx.globalAlpha = alpha * inner;
  arc(62, seg(0.4, 0.75), 0.6);
  const p = seg(0.55, 0.95);
  if (p > 0) {
    ctx.lineWidth = 0.8;
    const order = [0, 1, 2, 3, 4, 0];
    const star = [0, 2, 4, 1, 3, 0];
    const drawPoly = (ids, prog) => {
      const total = ids.length - 1;
      ctx.beginPath();
      ctx.moveTo(...nodes[ids[0]]);
      for (let i = 1; i <= total; i++) {
        const k = clamp(prog * total - (i - 1));
        if (k <= 0) break;
        const [ax, ay] = nodes[ids[i - 1]];
        const [bx, by] = nodes[ids[i]];
        ctx.lineTo(lerp(ax, bx, k), lerp(ay, by, k));
      }
      ctx.stroke();
    };
    drawPoly(order, p);
    ctx.lineWidth = 0.6;
    drawPoly(star, clamp(p * 1.15 - 0.1));
    ctx.globalAlpha = alpha * inner * p;
    ctx.lineWidth = 0.8;
    nodes.forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, TAU);
      ctx.stroke();
    });
    arc(16, p, 0.7);
  }
  ctx.restore();
}

// ---------- I. Prologue ----------
function prologue(ctx, t) {
  const bg = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, W * 0.75);
  bg.addColorStop(0, "#10251f");
  bg.addColorStop(0.55, "#07130f");
  bg.addColorStop(1, "#030807");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2,
    cy = 450;
  const ember = smooth(0.6, 5.5, t);
  glow(ctx, cx, cy, 520, "200,150,80", 0.16 * ember);
  glow(ctx, cx, cy, 90 + 40 * ember, "255,210,140", 0.5 * ember * (0.85 + 0.15 * noise(t * 3)));

  rain(ctx, t, 1 - smooth(6.6, 7.6, t) * 0.4, { seed: 11 });

  drawSigil(ctx, cx, cy, 270, easeInOut((t - 0.9) / 5.2), { rotation: t * 0.05, alpha: 0.92 });
  // A single drop falling into the sigil's heart.
  const dropT = clamp((t - 0.3) / 0.9);
  if (dropT > 0 && dropT < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - dropT;
    ctx.fillStyle = PAPER;
    ctx.fillRect(cx - 1, lerp(-40, cy, dropT ** 2) - 30, 2, 30);
    ctx.restore();
  }
  if (t > 1.2) {
    const k = clamp((t - 1.2) / 2.2);
    ctx.save();
    ctx.strokeStyle = `rgba(231,199,127,${0.5 * (1 - k)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 30 + k * 380, (30 + k * 380) * 0.98, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  eyebrow(ctx, "PROLOGUE · THE AGE OF ANGUISH", cx, 810, { t, start: 1.6, end: 7.4 });
  typeLine(ctx, "在痛苦之年的漫漫长夜里，", cx, 880, { t, start: 2.0, end: 7.4, size: 44, spacing: 4, glow: 12 });
  typeLine(ctx, "魔法从世间失落。", cx, 948, { t, start: 3.6, end: 7.4, size: 44, spacing: 4, glow: 12, color: GOLD });
}

// ---------- II. Rekindling ----------
function scroll(ctx, x, y, angle, size, alpha, warmth) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  const w = size * 2.6,
    h = size * 0.9;
  ctx.fillStyle = `rgb(${Math.round(lerp(190, 248, warmth))},${Math.round(lerp(170, 224, warmth))},${Math.round(lerp(130, 170, warmth))})`;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(-w / 2 - size * 0.18, -h / 2 - size * 0.12, size * 0.32, h + size * 0.24);
  ctx.fillRect(w / 2 - size * 0.14, -h / 2 - size * 0.12, size * 0.32, h + size * 0.24);
  ctx.fillStyle = "rgba(90,50,20,.55)";
  for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + size * 0.35, -h / 2 + h * (0.25 + i * 0.22), w * (0.62 - i * 0.12), 1);
  ctx.restore();
}

function rekindling(ctx, t) {
  const lt = t - SCENES.rekindling[0];
  const bg = ctx.createRadialGradient(W / 2, 470, 0, W / 2, 470, W * 0.8);
  bg.addColorStop(0, "#3a2412");
  bg.addColorStop(0.35, "#1a120c");
  bg.addColorStop(1, "#050605");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2,
    cy = 450;
  const zoom = lerp(1.0, 1.1, easeInOut(lt / 8.6));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  const flame = 0.85 + 0.15 * noise(t * 4) + 0.08 * Math.sin(t * 11);
  glow(ctx, cx, cy, 700, "220,140,60", 0.2);
  glow(ctx, cx, cy, 260 * flame, "255,190,110", 0.55);
  glow(ctx, cx, cy, 70 * flame, "255,240,210", 0.95);

  // 111 scrolls in a golden-angle spiral, kindled one after another.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 111; i++) {
    const appear = 0.8 + i * 0.045;
    const e = easeOut((lt - appear) / 0.9);
    if (e <= 0) continue;
    const a = i * golden + lt * 0.06;
    const rad = 70 + 30.5 * Math.sqrt(i + 1) * lerp(0.6, 1, e);
    const x = cx + Math.cos(a) * rad * 1.15,
      y = cy + Math.sin(a) * rad * 0.82;
    const bob = Math.sin(lt * 1.4 + i) * 3;
    scroll(ctx, x, y + bob, a + Math.PI / 2, 9 + (i % 5), e * 0.9, 1 - i / 160);
    if (lt - appear < 0.5) glow(ctx, x, y, 40, "255,220,150", (0.5 - (lt - appear)) * 1.2);
  }
  ctx.restore();

  motes(ctx, t, { count: 70, seed: 21, rise: 60, area: [W * 0.2, 0, W * 0.6, H], color: "255,190,110", alpha: smooth(0.2, 1.5, lt) });

  eyebrow(ctx, "OLD-MAGE JATEMBE", cx, 812, { t: lt, start: 0.9, end: 8.4 });
  typeLine(ctx, "老法师贾特比", cx, 888, { t: lt, start: 1.2, end: 8.4, size: 66, weight: 700, spacing: 18, color: GOLD, glow: 22, stagger: 0.12 });
  typeLine(ctx, "寻回失落的奥秘，写下一百一十一卷经卷，将它交还众人。", cx, 958, {
    t: lt,
    start: 3.0,
    end: 8.4,
    size: 30,
    spacing: 3,
    stagger: 0.035,
  });
}

// ---------- III. Masks ----------
function maskBase() {
  const p = new Path2D();
  p.moveTo(0, -0.5);
  p.bezierCurveTo(0.3, -0.5, 0.4, -0.3, 0.4, -0.05);
  p.bezierCurveTo(0.4, 0.22, 0.22, 0.42, 0, 0.53);
  p.bezierCurveTo(-0.22, 0.42, -0.4, 0.22, -0.4, -0.05);
  p.bezierCurveTo(-0.4, -0.3, -0.3, -0.5, 0, -0.5);
  return p;
}

function drawMask(ctx, kind, size, glint) {
  ctx.save();
  ctx.scale(size, size);
  const gold = ctx.createLinearGradient(-0.5, -0.6, 0.5, 0.6);
  gold.addColorStop(0, "#fbe8b0");
  gold.addColorStop(0.35, "#e2b65f");
  gold.addColorStop(0.7, "#a8762f");
  gold.addColorStop(1, "#5e3d16");
  const line = "#4a2e0e";
  const lw = 0.014;
  ctx.fillStyle = gold;
  ctx.strokeStyle = line;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const shape = (fn) => {
    ctx.beginPath();
    fn();
    ctx.fill();
    ctx.stroke();
  };
  const mirror = (fn) => {
    fn(1);
    fn(-1);
  };

  // Features behind the face.
  switch (kind) {
    case 0: // lion mane
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        shape(() => {
          ctx.moveTo(Math.cos(a - 0.17) * 0.42, Math.sin(a - 0.17) * 0.46);
          ctx.lineTo(Math.cos(a) * 0.7, Math.sin(a) * 0.7);
          ctx.lineTo(Math.cos(a + 0.17) * 0.42, Math.sin(a + 0.17) * 0.46);
        });
      }
      break;
    case 1: // elephant ears
      mirror((s) => shape(() => ctx.ellipse(s * 0.44, -0.02, 0.26, 0.34, s * 0.2, 0, TAU)));
      break;
    case 2: // antelope horns
      mirror((s) =>
        shape(() => {
          ctx.moveTo(s * 0.08, -0.44);
          ctx.quadraticCurveTo(s * 0.12, -0.85, s * 0.34, -1.08);
          ctx.quadraticCurveTo(s * 0.2, -0.8, s * 0.2, -0.42);
        }),
      );
      break;
    case 3: // leopard ears
    case 7: // kholo ears
      mirror((s) =>
        shape(() => {
          if (kind === 3) {
            ctx.moveTo(s * 0.16, -0.44);
            ctx.lineTo(s * 0.4, -0.72);
            ctx.lineTo(s * 0.38, -0.3);
          } else ctx.arc(s * 0.32, -0.46, 0.15, 0, TAU);
        }),
      );
      break;
    case 4: // hornbill casque
      shape(() => {
        ctx.moveTo(-0.16, -0.44);
        ctx.quadraticCurveTo(0, -0.82, 0.22, -0.5);
        ctx.quadraticCurveTo(0.05, -0.56, -0.16, -0.44);
      });
      break;
    case 5: // buffalo horns
      mirror((s) =>
        shape(() => {
          ctx.moveTo(s * 0.2, -0.38);
          ctx.bezierCurveTo(s * 0.55, -0.62, s * 0.86, -0.42, s * 0.82, -0.72);
          ctx.bezierCurveTo(s * 0.76, -0.34, s * 0.5, -0.34, s * 0.32, -0.2);
        }),
      );
      break;
    case 8: // Grandmother Spider's legs
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = gold;
      for (let i = 0; i < 4; i++)
        mirror((s) => {
          const a = -0.9 + i * 0.6;
          ctx.beginPath();
          ctx.moveTo(s * 0.3, a * 0.3);
          ctx.quadraticCurveTo(s * 0.62, a * 0.42 - 0.3, s * 0.78, a * 0.6 + 0.08);
          ctx.stroke();
        });
      ctx.strokeStyle = line;
      ctx.lineWidth = lw;
      break;
    case 9: // serpent hood
      shape(() => {
        ctx.moveTo(0, -0.66);
        ctx.bezierCurveTo(0.62, -0.6, 0.66, 0.2, 0.3, 0.5);
        ctx.lineTo(-0.3, 0.5);
        ctx.bezierCurveTo(-0.66, 0.2, -0.62, -0.6, 0, -0.66);
      });
      break;
  }

  ctx.fill(maskBase());
  ctx.stroke(maskBase());

  // Engraving.
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -0.46);
  ctx.lineTo(0, 0.08);
  mirror((s) => {
    ctx.moveTo(s * 0.05, -0.17);
    ctx.quadraticCurveTo(s * 0.16, -0.25, s * 0.29, -0.15);
    ctx.moveTo(s * 0.12, 0.14);
    ctx.lineTo(s * 0.2, 0.2);
    ctx.lineTo(s * 0.12, 0.26);
    ctx.moveTo(s * 0.22, 0.12);
    ctx.lineTo(s * 0.3, 0.18);
    ctx.lineTo(s * 0.22, 0.24);
  });
  ctx.moveTo(-0.08, 0.36);
  ctx.quadraticCurveTo(0, 0.4, 0.08, 0.36);
  ctx.stroke();
  // Eyes.
  ctx.fillStyle = "#120a04";
  mirror((s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -0.07);
    ctx.quadraticCurveTo(s * 0.15, -0.14, s * 0.25, -0.06);
    ctx.quadraticCurveTo(s * 0.15, -0.01, s * 0.06, -0.07);
    ctx.fill();
  });
  ctx.fillStyle = gold;

  // Features over the face.
  switch (kind) {
    case 1: // trunk
      ctx.lineWidth = 0.13;
      ctx.strokeStyle = gold;
      ctx.beginPath();
      ctx.moveTo(0, 0.04);
      ctx.bezierCurveTo(0, 0.5, 0.06, 0.72, 0.2, 0.74);
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.strokeStyle = line;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-0.055, 0.14 + i * 0.1);
        ctx.lineTo(0.055 + i * 0.008, 0.14 + i * 0.1);
        ctx.stroke();
      }
      break;
    case 3: // spots
      ctx.fillStyle = "rgba(74,46,14,.7)";
      [
        [0.2, 0.32],
        [-0.22, 0.3],
        [0.28, -0.32],
        [-0.27, -0.3],
        [0.1, -0.36],
        [-0.12, -0.38],
        [0.31, 0.06],
        [-0.31, 0.08],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 0.025, 0, TAU);
        ctx.fill();
      });
      break;
    case 4: // beak
      shape(() => {
        ctx.moveTo(-0.09, -0.02);
        ctx.quadraticCurveTo(0.02, 0.5, 0.06, 0.86);
        ctx.quadraticCurveTo(0.12, 0.4, 0.09, -0.02);
        ctx.closePath();
      });
      break;
    case 6: // crocodile snout
      shape(() => {
        ctx.moveTo(-0.12, 0.02);
        ctx.lineTo(-0.1, 0.84);
        ctx.quadraticCurveTo(0, 0.92, 0.1, 0.84);
        ctx.lineTo(0.12, 0.02);
      });
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        mirror((s) => {
          ctx.moveTo(s * 0.11, 0.12 + i * 0.1);
          ctx.lineTo(s * 0.16, 0.16 + i * 0.1);
          ctx.lineTo(s * 0.11, 0.2 + i * 0.1);
        });
      }
      ctx.stroke();
      break;
    case 7: // stripes
      ctx.beginPath();
      for (let i = 0; i < 3; i++)
        mirror((s) => {
          ctx.moveTo(s * (0.08 + i * 0.07), -0.44);
          ctx.lineTo(s * (0.11 + i * 0.07), -0.3);
        });
      ctx.stroke();
      break;
    case 9: // scales and tongue
      ctx.beginPath();
      for (let r = 0; r < 3; r++)
        for (let c = -2; c <= 2; c++) {
          const x = c * 0.08 + (r % 2) * 0.04,
            y = -0.4 + r * 0.06;
          ctx.moveTo(x - 0.035, y);
          ctx.quadraticCurveTo(x, y + 0.04, x + 0.035, y);
        }
      ctx.moveTo(0, 0.42);
      ctx.lineTo(0, 0.62);
      ctx.lineTo(-0.04, 0.68);
      ctx.moveTo(0, 0.62);
      ctx.lineTo(0.04, 0.68);
      ctx.stroke();
      break;
    case 8: // eight eyes
      ctx.fillStyle = "#120a04";
      [
        [0.05, -0.3],
        [-0.05, -0.3],
        [0.13, -0.33],
        [-0.13, -0.33],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 0.025, 0, TAU);
        ctx.fill();
      });
      break;
  }

  // Glint sweep.
  if (glint > 0 && glint < 1) {
    ctx.save();
    ctx.clip(maskBase());
    const gx = lerp(-0.9, 0.9, glint);
    const g = ctx.createLinearGradient(gx - 0.25, -0.5, gx + 0.25, 0.5);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,250,230,.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  ctx.restore();
}

function masks(ctx, t) {
  const lt = t - SCENES.masks[0];
  const bg = ctx.createRadialGradient(W / 2, 430, 0, W / 2, 430, W * 0.7);
  bg.addColorStop(0, "#16302a");
  bg.addColorStop(0.5, "#0a1815");
  bg.addColorStop(1, "#030706");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2,
    cy = 430,
    R = 300;
  ctx.save();
  ctx.strokeStyle = "rgba(205,181,127,.16)";
  for (let i = 0; i < 4; i++) {
    ctx.lineWidth = i === 1 ? 1.4 : 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, (R - 120 + i * 70) * lerp(0.9, 1, easeOut(lt / 2)), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, cx, cy, 420, "231,180,90", 0.12 + 0.05 * Math.sin(lt * 2));
  drawSigil(ctx, cx, cy, 120, easeInOut(lt / 3), { rotation: -lt * 0.12, alpha: 0.75, glowAmt: 12 });

  const spin = lt * 0.05;
  MASK_HITS.forEach((hit, i) => {
    const e = easeOut((t - hit + 0.15) / 0.7);
    if (e <= 0) return;
    const a = -Math.PI / 2 + (i / 10) * TAU + spin;
    const x = cx + Math.cos(a) * R,
      y = cy + Math.sin(a) * R * 0.92;
    const flash = clamp(1 - (t - hit) / 0.6);
    if (t >= hit) glow(ctx, x, y, 160, "255,214,140", flash * 0.6);
    ctx.save();
    ctx.translate(x, y + (1 - e) * 26);
    ctx.globalAlpha = e;
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    drawMask(ctx, i, 118 * lerp(0.82, 1, e), clamp((t - hit) / 0.8));
    ctx.restore();
  });
  motes(ctx, t, { count: 45, seed: 33, rise: 14, color: "255,214,140", alpha: 0.7 });

  eyebrow(ctx, "THE TEN MAGIC WARRIORS", cx, 868, { t: lt, start: 0.8, end: 9.4 });
  typeLine(ctx, "十魔将戴上金色兽面，隐去自己的姓名。", cx, 940, { t: lt, start: 1.3, end: 5.4, size: 40, spacing: 4, glow: 10 });
  typeLine(ctx, "力量不为彰显自身，而为守护与教导他人。", cx, 940, { t: lt, start: 5.7, end: 9.5, size: 40, spacing: 4, glow: 12, color: GOLD });
}

// ---------- IV. Nantambu ----------
const TILE = ["#6fb3c8", "#86b36d", "#cfa75a", "#d27a4c", "#8fa6c4", "#e9d9a8"];

function tower(ctx, x, base, s, haze, seed, t) {
  const r = rng(seed);
  const tiers = 5;
  let w = 104 * s,
    y = base;
  const rects = [];
  for (let k = 0; k < tiers; k++) {
    const h = (k === tiers - 1 ? 30 : 46) * s;
    const top = w * 0.88;
    rects.push([x, y, w, top, h]);
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, "#c08a59");
    g.addColorStop(0.55, "#8d6243");
    g.addColorStop(1, "#4b3326");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - top / 2, y - h);
    ctx.lineTo(x + top / 2, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.fill();
    // Mosaic band.
    const tiles = Math.max(4, Math.round(top / (7 * s)));
    const tw = top / tiles;
    for (let j = 0; j < tiles; j++) {
      ctx.fillStyle = TILE[Math.floor(r() * TILE.length)];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x - top / 2 + j * tw + 0.5, y - h + 3 * s, tw - 1, 5 * s);
    }
    ctx.globalAlpha = 1;
    // Lit windows.
    const windows = k === tiers - 1 ? 1 : 3;
    for (let j = 0; j < windows; j++) {
      const wx = x + (j - (windows - 1) / 2) * top * 0.26;
      const on = 0.55 + 0.45 * noise(t * 0.8 + seed + j * 7.3);
      ctx.fillStyle = `rgba(255,${190 + Math.round(30 * on)},110,${0.55 + 0.45 * on})`;
      ctx.fillRect(wx - 3 * s, y - h * 0.62, 6 * s, 13 * s);
    }
    ctx.fillStyle = "rgba(255,230,180,.35)";
    ctx.fillRect(x - top / 2, y - h, top, 1.2);
    y -= h;
    w = top * 0.84;
  }
  // Golden finial.
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y);
  ctx.quadraticCurveTo(x, y - 34 * s, x, y - 46 * s);
  ctx.quadraticCurveTo(x, y - 34 * s, x + 9 * s, y);
  ctx.fill();
  glow(ctx, x, y - 40 * s, 30 * s, "255,210,140", 0.5);
  // Atmospheric haze.
  if (haze > 0) {
    ctx.fillStyle = `rgba(214,170,112,${haze})`;
    rects.forEach(([rx, ry, rw, top, h]) => {
      ctx.beginPath();
      ctx.moveTo(rx - rw / 2, ry);
      ctx.lineTo(rx - top / 2, ry - h);
      ctx.lineTo(rx + top / 2, ry - h);
      ctx.lineTo(rx + rw / 2, ry);
      ctx.fill();
    });
  }
  return y;
}

function ridge(ctx, baseY, amp, freq, seed, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-50, H);
  for (let x = -50; x <= W + 50; x += 12) {
    const n = noise(x * freq + seed) * 0.7 + noise(x * freq * 3.1 + seed * 2) * 0.3;
    const crown = Math.abs(Math.sin(x * freq * 9 + seed)) * amp * 0.25;
    ctx.lineTo(x, baseY - n * amp - crown);
  }
  ctx.lineTo(W + 50, H);
  ctx.fill();
}

function cityLayer(ctx, t) {
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, "#0e2230");
  sky.addColorStop(0.45, "#36504c");
  sky.addColorStop(0.78, "#c98f55");
  sky.addColorStop(1, "#f0c47e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 760);
  glow(ctx, 1240, 560, 520, "255,196,120", 0.55);
  glow(ctx, 1240, 560, 110, "255,236,200", 0.9);
  // Stars fading out at the top.
  const r = rng(77);
  for (let i = 0; i < 90; i++) {
    const x = r() * W,
      y = r() * 300,
      a = (1 - y / 300) * (0.25 + 0.5 * noise(t * 2 + i));
    ctx.fillStyle = `rgba(255,245,225,${a * 0.6})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // Clouds.
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x = ((i * 337 + t * (6 + i)) % (W + 600)) - 300;
    const y = 300 + (i % 3) * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 260);
    g.addColorStop(0, `rgba(255,200,150,${0.12 - i * 0.008})`);
    g.addColorStop(1, "rgba(255,200,150,0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.22);
    ctx.translate(-x, -y);
    ctx.fillRect(x - 260, y - 260, 520, 520);
    ctx.restore();
  }
  ctx.restore();

  ridge(ctx, 590, 70, 0.004, 3, "#6d6a52");
  ridge(ctx, 620, 60, 0.006, 8, "#4a5543");

  // Ring of ten terraced towers around the academy hall.
  const cx = 960,
    cy = 640,
    rx = 590,
    ry = 70;
  const items = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * TAU + 0.05;
    return { i, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, depth: Math.sin(a) };
  }).sort((a, b) => a.depth - b.depth);
  const drawTower = (it) =>
    tower(ctx, it.x, it.y, 0.78 + 0.32 * ((it.depth + 1) / 2), 0.32 * (1 - (it.depth + 1) / 2), 100 + it.i * 13, t);

  // Low town behind.
  const town = rng(5);
  for (let i = 0; i < 70; i++) {
    const x = town() * W,
      y = 600 + town() * 40,
      w = 18 + town() * 34,
      h = 12 + town() * 20;
    const roof = town();
    ctx.fillStyle = "#6b5541";
    ctx.beginPath();
    ctx.rect(x, y - h, w, h);
    if (roof < 0.4) ctx.ellipse(x + w / 2, y - h, w / 2, h * 0.55, 0, Math.PI, TAU);
    else if (roof < 0.75) {
      ctx.moveTo(x - 3, y - h);
      ctx.lineTo(x + w / 2, y - h - h * 0.7);
      ctx.lineTo(x + w + 3, y - h);
    }
    ctx.fill();
    if (town() > 0.5) {
      ctx.fillStyle = `rgba(255,200,120,${0.5 + 0.4 * noise(t + i)})`;
      ctx.fillRect(x + w * 0.4, y - h * 0.6, 3, 4);
    }
  }
  items.filter((it) => it.depth < 0).forEach(drawTower);

  // Central hall with its dome.
  ctx.fillStyle = "#7d573b";
  ctx.fillRect(cx - 160, 560, 320, 80);
  ctx.fillStyle = "#946847";
  ctx.fillRect(cx - 120, 520, 240, 44);
  const dome = ctx.createLinearGradient(cx - 110, 0, cx + 110, 0);
  dome.addColorStop(0, "#d9b071");
  dome.addColorStop(0.6, "#9a6f3e");
  dome.addColorStop(1, "#5a3d24");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.ellipse(cx, 522, 108, 96, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,226,170,.6)";
  ctx.lineWidth = 2;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.ellipse(cx, 522, Math.abs(k) * 26 + 1, 96, 0, Math.PI, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - 2, 400, 4, 30);
  glow(ctx, cx, 404, 60, "255,220,150", 0.7);
  for (let j = 0; j < 7; j++) {
    ctx.fillStyle = `rgba(255,205,120,${0.6 + 0.4 * noise(t * 0.7 + j * 3)})`;
    ctx.fillRect(cx - 132 + j * 42, 590, 10, 26);
  }
  items.filter((it) => it.depth >= 0).forEach(drawTower);

  // Bank.
  ctx.fillStyle = "#2f3a2d";
  ctx.fillRect(0, 700, W, 46);
  ctx.fillStyle = "rgba(240,196,126,.22)";
  ctx.fillRect(0, 700, W, 2);
}

function nantambu(ctx, t) {
  const lt = t - SCENES.nantambu[0];
  const k = easeInOut(lt / 11.2);
  const zoom = lerp(1.08, 1.0, k);
  ctx.save();
  ctx.translate(W / 2, H * 0.62);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2 + lerp(-26, 26, k), -H * 0.62);

  cityLayer(ctx, t);

  // Canal reflection of the city, broken into rippling strips.
  const reflect = assets.reflect.getContext("2d");
  reflect.setTransform(1, 0, 0, 1, 0, 0);
  cityLayer(reflect, t);
  const waterTop = 746;
  const water = ctx.createLinearGradient(0, waterTop, 0, H);
  water.addColorStop(0, "#7c6a4a");
  water.addColorStop(1, "#0e1f1a");
  ctx.fillStyle = water;
  ctx.fillRect(-60, waterTop, W + 120, H - waterTop + 60);
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let y = 0; y < H - waterTop + 40; y += 4) {
    const src = waterTop - y - 4;
    if (src < 0) break;
    const off = Math.sin(y * 0.09 + t * 2.2) * (1.5 + y * 0.03);
    ctx.drawImage(assets.reflect, 0, src, W, 4, off, waterTop + y, W, 4);
  }
  ctx.restore();
  const fade = ctx.createLinearGradient(0, waterTop, 0, H);
  fade.addColorStop(0, "rgba(10,30,26,.15)");
  fade.addColorStop(1, "rgba(6,18,15,.85)");
  ctx.fillStyle = fade;
  ctx.fillRect(-60, waterTop, W + 120, H - waterTop + 60);
  ctx.strokeStyle = "rgba(255,220,170,.22)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const y = waterTop + 10 + ((i * 53) % (H - waterTop));
    const x = ((i * 271 + t * 18 * (i % 3 ? 1 : -1)) % (W + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30 + (i % 5) * 18, y);
    ctx.stroke();
  }

  // Arched bridge over the canal, mirrored in the water.
  const bx = 1230,
    bw = 540,
    deck = 700,
    spring = 768,
    arches = [1340, 1500, 1660];
  const bridge = (dir) => {
    ctx.beginPath();
    ctx.moveTo(bx, spring);
    ctx.lineTo(bx, spring + dir * (spring - deck));
    ctx.lineTo(bx + bw, spring + dir * (spring - deck));
    ctx.lineTo(bx + bw, spring);
    [...arches].reverse().forEach((ax) => {
      ctx.lineTo(ax + 52, spring);
      ctx.arc(ax, spring, 52, 0, Math.PI, dir < 0);
    });
    ctx.closePath();
  };
  ctx.fillStyle = "#3a3328";
  bridge(-1);
  ctx.fill();
  ctx.fillStyle = "rgba(255,214,150,.28)";
  ctx.fillRect(bx, deck, bw, 2);
  ctx.fillStyle = "rgba(42,38,30,.5)";
  bridge(1);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const lx = bx + 20 + i * 100;
    ctx.fillStyle = "#2a251d";
    ctx.fillRect(lx - 1.5, deck - 22, 3, 22);
    glow(ctx, lx, deck - 24, 26, "255,200,120", 0.75 + 0.25 * noise(t * 3 + i));
    glow(ctx, lx, spring + (spring - deck) + 24, 22, "255,200,120", 0.25);
  }

  // A Tempest-Sun mage crossing the dusk.
  const fly = clamp((lt - 3.2) / 4.4);
  if (fly > 0 && fly < 1) {
    const path = (p) => [lerp(-120, W + 120, p), 250 - Math.sin(p * Math.PI) * 120 + p * 40];
    for (let i = 26; i >= 0; i--) {
      const p = fly - i * 0.006;
      if (p < 0) continue;
      const [x, y] = path(p);
      glow(ctx, x, y, 34 - i, "255,180,90", (1 - i / 26) * 0.5);
    }
    const [hx, hy] = path(fly);
    glow(ctx, hx, hy, 70, "255,230,180", 0.9);
  }
  ctx.restore();

  // Foreground: glass chimes of the Song-Wind City, swaying on a branch.
  ctx.save();
  ctx.fillStyle = "#0b1712";
  ctx.beginPath();
  ctx.moveTo(-20, 40);
  ctx.quadraticCurveTo(320, 70, 640, 28);
  ctx.lineTo(640, 40);
  ctx.quadraticCurveTo(320, 88, -20, 64);
  ctx.fill();
  const leaf = rng(41);
  for (let i = 0; i < 36; i++) {
    const x = leaf() * 640,
      y = 30 + leaf() * 30,
      a = leaf() * TAU,
      s = 18 + leaf() * 26;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.sin(t * 0.8 + i) * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.6, s * 0.32, s * 0.7, 0, 0, TAU);
    ctx.fillStyle = i % 3 ? "#13261d" : "#1c3326";
    ctx.fill();
    ctx.restore();
  }
  const chimes = [
    [90, 210, "111,179,200"],
    [180, 300, "210,122,76"],
    [262, 170, "134,179,109"],
    [350, 260, "207,167,90"],
    [440, 200, "143,166,196"],
    [530, 140, "233,200,140"],
  ];
  chimes.forEach(([x, len, color], i) => {
    const sway = Math.sin(t * 1.1 + i * 1.7) * 0.07 + Math.sin(t * 2.3 + i) * 0.025;
    ctx.save();
    ctx.translate(x, 52);
    ctx.rotate(sway);
    ctx.strokeStyle = "rgba(220,200,160,.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.stroke();
    ctx.translate(0, len);
    const g = ctx.createLinearGradient(-12, 0, 12, 0);
    g.addColorStop(0, `rgba(${color},.95)`);
    g.addColorStop(0.5, "rgba(255,250,235,.85)");
    g.addColorStop(1, `rgba(${color},.7)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(11, 18);
    ctx.lineTo(8, 70);
    ctx.lineTo(0, 84);
    ctx.lineTo(-8, 70);
    ctx.lineTo(-11, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const gx = x - Math.sin(sway) * (len + 40),
      gy = 52 + Math.cos(sway) * (len + 40);
    glow(ctx, gx, gy, 90, color, 0.35 + 0.25 * Math.sin(t * 2 + i));
  });
  ctx.restore();

  motes(ctx, t, { count: 50, seed: 55, rise: 8, area: [0, 520, W, 520], color: "220,255,170", size: 1.8 });
  rain(ctx, t, 0.25, { seed: 61, tint: "255,230,200" });

  const cx = W / 2 + 120;
  eyebrow(ctx, "NANTAMBU · THE SONG-WIND CITY", cx, 150, { t: lt, start: 0.8, end: 5.9 });
  typeLine(ctx, "纳塔穆博", cx, 262, { t: lt, start: 1.1, end: 5.9, size: 104, weight: 700, spacing: 40, stagger: 0.16, glow: 26, glowColor: "rgba(40,20,0,.6)" });
  typeLine(ctx, "歌风之城 · 芒吉莽原的智慧之灯", cx, 330, { t: lt, start: 2.2, end: 5.9, size: 30, spacing: 8, color: "#fbe7c2", glow: 14, glowColor: "rgba(40,20,0,.7)" });
  typeLine(ctx, "无需城墙，也无需军队，", cx, 220, { t: lt, start: 6.3, end: 11.2, size: 46, spacing: 5, glow: 18, glowColor: "rgba(40,20,0,.7)" });
  typeLine(ctx, "十座塔楼守望着这座城与它的邻人。", cx, 290, { t: lt, start: 7.2, end: 11.2, size: 46, spacing: 5, glow: 18, glowColor: "rgba(40,20,0,.7)", color: "#fbe7c2" });
}

// ---------- V. Branches ----------
function archPath(ctx, x, y, w, h) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, TAU);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function strokeIcon(ctx, name, x, y, size, progress, color) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.35;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.setLineDash([80 * progress, 200]);
  assets.icons[name].forEach((p) => ctx.stroke(p));
  ctx.restore();
}

function branches(ctx, t) {
  const lt = t - SCENES.branches[0];
  ctx.fillStyle = "#08130f";
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, "#14302a");
  bg.addColorStop(1, "#050c0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const unity = easeOut((t - BRANCH_UNITY) / 0.9);
  const colW = 300,
    gap = 34,
    left = (W - (colW * 5 + gap * 4)) / 2,
    top = 168,
    colH = 640;
  BRANCHES.forEach(([name, value, en, line, icon, color], i) => {
    const hit = BRANCH_HITS[i];
    const e = easeOut((t - hit + 0.25) / 0.9);
    if (e <= 0) return;
    const next = BRANCH_HITS[i + 1] ?? BRANCH_UNITY;
    const active = t < next ? 1 : lerp(0.5, 1, unity);
    const x = left + i * (colW + gap),
      y = top + (1 - e) * 40;
    const rgb = color.match(/\w\w/g).map((h) => parseInt(h, 16)).join(",");
    ctx.save();
    ctx.globalAlpha = e;
    // Panel.
    archPath(ctx, x, y, colW, colH);
    const fill = ctx.createLinearGradient(0, y, 0, y + colH);
    fill.addColorStop(0, `rgba(${rgb},${0.28 * active})`);
    fill.addColorStop(0.6, `rgba(${rgb},${0.08 * active})`);
    fill.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = "rgba(6,16,13,.75)";
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = `rgba(205,181,127,${0.35 + 0.45 * active})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.save();
    archPath(ctx, x + 10, y + 10, colW - 20, colH - 20);
    ctx.strokeStyle = `rgba(${rgb},${0.25 + 0.35 * active})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
    if (t >= hit) glow(ctx, x + colW / 2, y + 190, 260, rgb, clamp(1 - (t - hit) / 1.2) * 0.55 + 0.12 * active);

    ctx.font = `400 15px ${EN}`;
    ctx.fillStyle = BRASS;
    ctx.textAlign = "center";
    ctx.globalAlpha = e * (0.5 + 0.5 * active);
    ctx.fillText(`0${i + 1}`, x + colW / 2, y + 74);
    ctx.restore();

    strokeIcon(ctx, icon, x + colW / 2, y + 196, 118, clamp((t - hit) / 1.1) * e, `rgba(${rgb},1)`);

    const a = e * (0.55 + 0.45 * active);
    typeLine(ctx, name, x + colW / 2, y + 362, { t, start: hit + 0.1, size: 40, weight: 700, spacing: 8, stagger: 0.07, alpha: a, glow: 10 });
    typeLine(ctx, value, x + colW / 2, y + 412, { t, start: hit + 0.35, size: 24, spacing: 14, color, alpha: a, stagger: 0.1 });
    typeLine(ctx, en, x + colW / 2, y + 456, { t, start: hit + 0.45, size: 13, family: EN, spacing: 4, color: BRASS, stagger: 0.012, alpha: a, blur: 3, rise: 4 });
    ctx.save();
    ctx.globalAlpha = a * 0.6;
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + colW / 2 - 18, y + 482, 36, 1);
    ctx.restore();
    const half = Math.ceil([...line].length / 2);
    typeLine(ctx, [...line].slice(0, half).join(""), x + colW / 2, y + 530, { t, start: hit + 0.55, size: 19, spacing: 2, stagger: 0.025, alpha: a * 0.9, color: "#e6dcc4" });
    typeLine(ctx, [...line].slice(half).join(""), x + colW / 2, y + 562, { t, start: hit + 0.75, size: 19, spacing: 2, stagger: 0.025, alpha: a * 0.9, color: "#e6dcc4" });
    motes(ctx, t, { count: 10, seed: 70 + i, rise: 40, area: [x, y + 80, colW, colH - 80], color: rgb, size: 1.6, alpha: active * e });
  });

  if (unity > 0) {
    rule(ctx, W / 2, 848, 1500, unity, 0.9);
    glow(ctx, W / 2, 848, 700, "231,199,127", 0.08 * unity);
  }
  eyebrow(ctx, "THE FIVE BRANCHES OF THE MAGAAMBYA", W / 2, 118, { t: lt, start: 0.5, end: 12.2 });
  typeLine(ctx, "五种求知的方式，同一座学院。", W / 2, 930, { t, start: BRANCH_UNITY + 0.1, end: SCENES.branches[1], size: 42, spacing: 6, glow: 14, color: GOLD });
  eyebrow(ctx, "FIVE BRANCHES · ONE COMMUNITY", W / 2, 980, { t, start: BRANCH_UNITY + 0.4, end: SCENES.branches[1] });
}

// ---------- VI. The Word and the Way ----------
function wordway(ctx, t) {
  const lt = t - SCENES.wordway[0];
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#07120f");
  sky.addColorStop(0.42, "#16332b");
  sky.addColorStop(0.5, "#5d6b4c");
  sky.addColorStop(0.56, "#1b3129");
  sky.addColorStop(1, "#06100d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const hx = W / 2,
    hy = 520;
  glow(ctx, hx, hy, 640, "236,200,130", 0.25);
  glow(ctx, hx, hy, 40, "255,244,220", 0.9);
  // Horizon hills.
  ridge(ctx, 548, 40, 0.005, 12, "#122720");
  ridge(ctx, 600, 50, 0.004, 19, "#0c1d18");

  // Path from the book to the horizon.
  const P = (u) => {
    const x = hx + Math.sin(u * Math.PI * 2.2) * 260 * (1 - u) ** 1.2;
    const y = lerp(790, hy + 8, u ** 0.85);
    return [x, y];
  };
  const reveal = easeInOut((lt - 0.4) / 3.2);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 160; i++) {
    const u = i / 160;
    if (u > reveal) break;
    const [x, y] = P(u);
    const w = lerp(90, 4, u);
    ctx.fillStyle = `rgba(231,199,127,${0.11 * (1 - u * 0.4)})`;
    ctx.fillRect(x - w / 2, y - 1, w, 3);
  }
  ctx.restore();
  // Glyph sparks drifting up from the pages along the path.
  const g = rng(91);
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineCap = "round";
  for (let i = 0; i < 120; i++) {
    const offset = g(),
      speed = 0.06 + g() * 0.05,
      side = g() - 0.5,
      len = 4 + g() * 7,
      ang = g() * Math.PI;
    const u = (offset + lt * speed) % 1;
    if (u > reveal) continue;
    const [x, y] = P(u);
    const spread = (1 - u) * 160 * side;
    const a = Math.sin(u * Math.PI) * 0.9;
    ctx.globalAlpha = a;
    ctx.lineWidth = lerp(2, 0.8, u);
    ctx.shadowColor = "rgba(255,210,140,.9)";
    ctx.shadowBlur = 8;
    const s = lerp(1, 0.3, u);
    ctx.beginPath();
    ctx.moveTo(x + spread, y - 30 * s);
    ctx.lineTo(x + spread + Math.cos(ang) * len * s, y - 30 * s + Math.sin(ang) * len * s);
    ctx.stroke();
  }
  ctx.restore();
  // Travellers of light walking the Way.
  for (let k = 0; k < 3; k++) {
    const u = ((lt - 1.6 - k * 1.3) / 4.2) % 1;
    if (lt < 1.6 + k * 1.3 || u > reveal) continue;
    const [x, y] = P(u);
    glow(ctx, x, y - 6, lerp(36, 8, u), "255,226,170", 0.9 * Math.sin(u * Math.PI));
  }

  // The open book.
  const bx = W / 2,
    by = 830;
  ctx.save();
  ctx.translate(bx, by);
  const page = (dir, lift = 0) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dir * 120, -24 - lift, dir * 250, -8 - lift * 0.6);
    ctx.lineTo(dir * 236, 92);
    ctx.quadraticCurveTo(dir * 120, 78, 0, 104);
    ctx.closePath();
  };
  ctx.shadowColor = "rgba(255,210,140,.5)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#e9dcbc";
  page(-1);
  ctx.fill();
  page(1);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#8d7444";
  ctx.lineWidth = 1.4;
  page(-1);
  ctx.stroke();
  page(1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,70,40,.45)";
  ctx.lineWidth = 1;
  for (let l = 0; l < 7; l++)
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(d * 30, 4 + l * 11);
      ctx.quadraticCurveTo(d * 120, -12 + l * 11, d * (200 - (l % 3) * 18), -2 + l * 11);
      ctx.stroke();
    });
  // A turning page.
  const flip = (lt * 0.42) % 1;
  const sx = Math.cos(flip * Math.PI);
  ctx.save();
  ctx.scale(sx, 1);
  ctx.fillStyle = sx > 0 ? "#f3e8cc" : "#ddcda7";
  ctx.globalAlpha = 0.92;
  page(1, 30 * Math.sin(flip * Math.PI));
  ctx.fill();
  ctx.strokeStyle = "#8d7444";
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  glow(ctx, bx, by + 10, 300, "255,210,140", 0.22);

  eyebrow(ctx, "THE WORD AND THE WAY", W / 2, 150, { t: lt, start: 0.4, end: 6.4 });
  typeLine(ctx, "以言求知，以行证道。", W / 2, 250, { t: lt, start: 0.8, end: 6.4, size: 70, weight: 700, spacing: 22, stagger: 0.11, color: GOLD, glow: 22 });
  typeLine(ctx, "所学之物，终要用来服务他人。", W / 2, 330, { t: lt, start: 2.8, end: 6.4, size: 34, spacing: 6 });
}

// ---------- VII. Finale ----------
function finale(ctx, t) {
  const lt = t - SCENES.finale[0];
  const bloomAt = CREST_REVEAL - 0.5;

  if (t < CREST_REVEAL + 0.4) {
    // The courtyard of the admissions site, still raining, the letter waiting.
    const k = easeInOut(lt / (bloomAt - SCENES.finale[0] + 0.6));
    const s = lerp(1.02, 1.42, k);
    const fx = 1338,
      fy = 690;
    const sx = lerp(1338, 1120, k),
      sy = lerp(690, 600, k);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(s, s);
    ctx.translate(-fx, -fy);
    ctx.drawImage(assets.poster, 0, -60);
    ctx.restore();
    ctx.fillStyle = "rgba(6,20,16,.45)";
    ctx.fillRect(0, 0, W, H);
    const shade = ctx.createLinearGradient(0, H * 0.55, 0, H);
    shade.addColorStop(0, "rgba(6,18,15,0)");
    shade.addColorStop(1, "rgba(6,18,15,.9)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    const lantern = 0.8 + 0.2 * noise(t * 5);
    glow(ctx, sx, sy, 260 + 120 * k, "255,205,130", (0.35 + 0.4 * k) * lantern);
    rain(ctx, t, 0.9, { seed: 81, tint: "215,232,220" });
    eyebrow(ctx, "THE RAINCOURT · A LETTER AWAITS", W / 2, 906, { t: lt, start: 0.5, end: bloomAt - SCENES.finale[0] + 0.2 });
    typeLine(ctx, "雨庭之中，一封来信正等你启封。", W / 2, 972, { t: lt, start: 0.8, end: bloomAt - SCENES.finale[0] + 0.2, size: 44, spacing: 6, glow: 14 });
  }

  if (t >= bloomAt) {
    const reveal = smooth(CREST_REVEAL - 0.1, CREST_REVEAL + 0.5, t);
    ctx.save();
    ctx.globalAlpha = reveal;
    const bg = ctx.createRadialGradient(W / 2, 420, 0, W / 2, 420, W * 0.75);
    bg.addColorStop(0, "#1b3a31");
    bg.addColorStop(0.5, "#0b1d18");
    bg.addColorStop(1, "#030807");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const ct = t - CREST_REVEAL;
    if (ct > -0.1) {
      const cx = W / 2,
        cy = 400;
      glow(ctx, cx, cy, 560, "231,190,110", 0.18 * reveal);
      drawSigil(ctx, cx, cy, 300, easeOut(ct / 2.4), { rotation: ct * 0.06, alpha: 0.85 * reveal, inner: 0 });
      drawSigil(ctx, cx, cy, 236, easeOut((ct - 0.2) / 2.6), { rotation: -ct * 0.04, alpha: 0.35 * reveal, inner: 0, glowAmt: 6 });
      // Sparks bursting from the crest.
      const sp = rng(123);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 70; i++) {
        const a = sp() * TAU,
          v = 180 + sp() * 420,
          life = 1.2 + sp() * 1.4;
        const p = ct / life;
        if (p <= 0 || p >= 1) continue;
        const d = v * easeOut(p);
        const x = cx + Math.cos(a) * d,
          y = cy + Math.sin(a) * d + p * p * 60;
        ctx.fillStyle = `rgba(255,${200 + Math.round(sp() * 40)},140,${(1 - p) * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 * (1 - p) + 0.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      const ce = easeOut(ct / 1.2);
      const size = 380 * lerp(0.86, 1, ce);
      ctx.save();
      ctx.globalAlpha = clamp(ct / 0.6);
      ctx.shadowColor = "rgba(120,190,220,.45)";
      ctx.shadowBlur = 40;
      ctx.drawImage(assets.crest, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
      motes(ctx, t, { count: 40, seed: 140, rise: 16, color: "255,214,140", alpha: reveal * 0.8 });

      typeLine(ctx, "玛甘比学院", cx, 840, { t: ct, start: 0.35, size: 86, weight: 700, spacing: 34, stagger: 0.13, color: GOLD, glow: 26 });
      eyebrow(ctx, "THE MAGAAMBYA · NANTAMBU", cx, 898, { t: ct, start: 0.8, size: 19, spacing: 9 });
      rule(ctx, cx, 928, 520, clamp((ct - 1.0) / 0.9), 0.8);
      typeLine(ctx, "让你的故事，在此生根。", cx, 990, { t: ct, start: 1.25, size: 36, spacing: 10 });
    }
  }

  // Bloom of light that carries the courtyard into the crest.
  const bloom = clamp(1 - Math.abs(t - (CREST_REVEAL - 0.05)) / 0.55);
  if (bloom > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(W / 2 + 160, 560, 0, W / 2 + 160, 560, W);
    g.addColorStop(0, `rgba(255,236,200,${bloom})`);
    g.addColorStop(0.4, `rgba(255,210,150,${bloom * 0.6})`);
    g.addColorStop(1, `rgba(255,200,140,${bloom * 0.15})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ---------- compositing ----------
const ORDER = [
  ["prologue", prologue],
  ["rekindling", rekindling],
  ["masks", masks],
  ["nantambu", nantambu],
  ["branches", branches],
  ["wordway", wordway],
  ["finale", finale],
];

export function drawFrame(ctx, t) {
  const active = ORDER.filter(([key]) => t >= SCENES[key][0] && t < SCENES[key][1] + 0.0001);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  active.forEach(([key, draw], i) => {
    const buffer = buffers[i % 2];
    const b = buffer.getContext("2d");
    b.save();
    b.globalAlpha = 1;
    b.globalCompositeOperation = "source-over";
    b.filter = "none";
    b.textAlign = "start";
    draw(b, t);
    b.restore();
    const [start] = SCENES[key];
    const prev = ORDER[ORDER.findIndex(([k]) => k === key) - 1];
    const fadeIn = prev ? smooth(start, SCENES[prev[0]][1], t) : 1;
    ctx.globalAlpha = i === 0 ? 1 : fadeIn;
    ctx.drawImage(buffer, 0, 0);
  });
  ctx.globalAlpha = 1;

  // Vignette and fades to and from black.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const black = Math.max(1 - smooth(0, 1.0, t), smooth(58.9, 59.95, t));
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`;
    ctx.fillRect(0, 0, W, H);
  }
}
