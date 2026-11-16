// Builds every portrait asset from one source photo.
//
//   1. Drop the photo at  assets/portrait/source.jpg  (or .png / .webp)
//      Portrait orientation, head and shoulders visible, >= 1600px tall.
//      It lives outside public/ so the full-size original is never served.
//   2. Run  npm run portrait   (also re-renders the Open Graph cards)
//
// The person is cut out with scripts/segment-portrait.swift (macOS Vision,
// runs locally) into assets/portrait/mask.png. With the mask, a busy
// background turns into nothing in the halftone and dims in the About
// photo, and both crops are framed from the top of the head. Without it
// the script still works, on the plain photo with an automatic crop.
//
// Outputs
//   public/portrait/poster.webp    halftone still: used on the Open Graph card
//   public/portrait/about.webp     tonal photo for the About section
//   public/portrait/dots.webp      the hero bust as a dot field (still)
//   content/portrait-dots.json     the same dots, for the WebGL particles
//   content/portrait.json          { hasPhoto } flag read by the components
//
// With no source photo it renders an abstract ember field instead, so the
// site still builds and the hero still has something to assemble.

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "portrait");
const srcDir = path.join(root, "assets", "portrait");
const maskFile = path.join(srcDir, "mask.png");

const MAP_W = 320;
const MAP_H = 400;
const POSTER_W = 880;
const POSTER_H = 1100;
const COLS = 110;
const ROWS = Math.round((COLS * MAP_H) / MAP_W);

const source = ["source.jpg", "source.jpeg", "source.png", "source.webp"]
  .map((name) => path.join(srcDir, name))
  .find((file) => existsSync(file));

/** Deterministic value noise so the placeholder is identical on every build. */
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let value = 0;
  let amp = 0.5;
  for (let i = 0; i < 4; i += 1) {
    value += amp * noise(x, y);
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return value;
}

/** Abstract ember: a hot core with turbulent, banded falloff. */
function emberField() {
  const data = Buffer.alloc(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const nx = (x / MAP_W - 0.5) * 2;
      const ny = (y / MAP_H - 0.56) * 2 * (MAP_H / MAP_W);
      const warp = fbm(nx * 2.2 + 3.1, ny * 2.2 - 1.7) - 0.5;
      const r = Math.hypot(nx * 1.08 + warp * 0.5, ny + warp * 0.6);
      const core = Math.max(0, 1 - r / 1.02);
      const bands = 0.5 + 0.5 * Math.sin(r * 15 - fbm(nx * 3.4, ny * 3.4) * 7);
      const lum = Math.pow(core, 1.25) * (0.5 + 0.5 * bands);
      data[y * MAP_W + x] = Math.round(Math.min(1, lum * 1.35) * 255);
    }
  }
  return data;
}

/** Person mask, regenerated whenever the photo is newer than it. */
function ensureMask() {
  if (!source) return null;
  const stale = !existsSync(maskFile) || statSync(maskFile).mtimeMs < statSync(source).mtimeMs;
  if (stale && process.platform === "darwin") {
    try {
      execFileSync("swift", [path.join(root, "scripts", "segment-portrait.swift"), source, maskFile], {
        stdio: "inherit",
      });
    } catch {
      console.warn("portrait: person segmentation failed, using the plain photo");
    }
  }
  return existsSync(maskFile) ? maskFile : null;
}

async function rawGrey(input, region, width, height) {
  return sharp(input)
    .extract(region)
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
}

/**
 * Crop of the given aspect (w/h) that is `share` of the photo's width,
 * centred on the head and starting a little above it.
 */
async function framing(mask, aspect, share, headroom) {
  const meta = await sharp(source).metadata();
  const W = meta.width;
  const H = meta.height;
  let width = Math.round(W * share);
  let height = Math.round(width / aspect);
  if (height > H) {
    height = H;
    width = Math.round(height * aspect);
  }
  let top = Math.round((H - height) / 4);
  let cx = W / 2;

  if (mask) {
    const { data, info } = await sharp(mask).greyscale().raw().toBuffer({ resolveWithObject: true });
    const minRun = info.width * 0.02;
    let head = -1;
    for (let y = 0; y < info.height && head < 0; y += 1) {
      let count = 0;
      for (let x = 0; x < info.width; x += 1) if (data[y * info.width + x] > 127) count += 1;
      if (count > minRun) head = y;
    }
    if (head >= 0) {
      // Horizontal centre of the head: the person's pixels in the band
      // just below its top.
      let sum = 0;
      let n = 0;
      const band = Math.min(info.height, head + Math.round(info.height * 0.12));
      for (let y = head; y < band; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (data[y * info.width + x] > 127) {
            sum += x;
            n += 1;
          }
        }
      }
      if (n) cx = (sum / n) * (W / info.width);
      top = Math.round(head * (H / info.height) - height * headroom);
    }
  }

  const left = Math.round(Math.min(Math.max(cx - width / 2, 0), W - width));
  top = Math.min(Math.max(top, 0), H - height);
  return { left, top, width, height };
}

/** Value at percentile p (0..1) of the samples where weight > 0.5. */
function percentile(values, weights, p) {
  const picked = [];
  for (let i = 0; i < values.length; i += 1) if (weights[i] > 127) picked.push(values[i]);
  if (!picked.length) return p < 0.5 ? 0 : 255;
  picked.sort((a, b) => a - b);
  return picked[Math.min(picked.length - 1, Math.floor(p * picked.length))];
}

async function luminanceMap(mask) {
  if (!source) return emberField();
  if (!mask) {
    return sharp(source)
      .rotate()
      .resize(MAP_W, MAP_H, { fit: "cover", position: "attention" })
      .greyscale()
      .normalise({ lower: 2, upper: 98 })
      .linear(1.15, -12)
      .raw()
      .toBuffer();
  }

  // Head and shoulders: the face carries the likeness, so it gets most
  // of the halftone dots.
  const region = await framing(mask, MAP_W / MAP_H, 0.8, 0.08);
  const grey = await rawGrey(source, region, MAP_W, MAP_H);
  const alpha = await sharp(mask)
    .extract(region)
    .resize(MAP_W, MAP_H, { fit: "fill" })
    .blur(0.8)
    .greyscale()
    .raw()
    .toBuffer();

  // Stretch the tones of the person only, so the background can't eat
  // the contrast range. A low floor keeps a dark garment as a faint
  // silhouette instead of a hole.
  const lo = percentile(grey, alpha, 0.02);
  const hi = percentile(grey, alpha, 0.985);
  const out = Buffer.alloc(MAP_W * MAP_H);
  for (let i = 0; i < out.length; i += 1) {
    const t = Math.min(1, Math.max(0, (grey[i] - lo) / Math.max(1, hi - lo)));
    const tone = Math.max(0.1, Math.pow(t, 0.85));
    out[i] = Math.round(tone * (alpha[i] / 255) * 255);
  }
  return out;
}

/** Greyscale photo for About; with a mask the background is dimmed. */
async function aboutPhoto(mask) {
  const W = 960;
  const H = 1200;
  if (!mask) {
    return sharp(source)
      .rotate()
      .resize(W, H, { fit: "cover", position: "attention" })
      .greyscale()
      .normalise({ lower: 1, upper: 99 });
  }
  const region = await framing(mask, W / H, 1, 0.1);
  const grey = await rawGrey(source, region, W, H);
  const alpha = await sharp(mask).extract(region).resize(W, H, { fit: "fill" }).blur(1.5).greyscale().raw().toBuffer();
  const lo = percentile(grey, alpha, 0.01);
  const hi = percentile(grey, alpha, 0.99);
  const out = Buffer.alloc(W * H);
  for (let i = 0; i < out.length; i += 1) {
    const t = Math.min(1, Math.max(0, (grey[i] - lo) / Math.max(1, hi - lo)));
    const keep = 0.22 + 0.78 * (alpha[i] / 255);
    out[i] = Math.round(t * keep * 255);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 1 } });
}

function halftoneSvg(map) {
  const stepX = POSTER_W / COLS;
  const stepY = POSTER_H / ROWS;
  const maxR = Math.min(stepX, stepY) * 0.56;
  let circles = "";
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const mx = Math.min(MAP_W - 1, Math.floor(((col + 0.5) / COLS) * MAP_W));
      const my = Math.min(MAP_H - 1, Math.floor(((row + 0.5) / ROWS) * MAP_H));
      const lum = map[my * MAP_W + mx] / 255;
      if (lum < 0.06) continue;
      const r = (0.22 + lum * 0.78) * maxR;
      const cx = ((col + 0.5) * stepX).toFixed(1);
      const cy = ((row + 0.5) * stepY).toFixed(1);
      circles += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_W}" height="${POSTER_H}" viewBox="0 0 ${POSTER_W} ${POSTER_H}"><g fill="#f5f5f3">${circles}</g></svg>`;
}

/**
 * The person cut out of the photo: greyscale, transparent background,
 * framed from just above the head to the bottom of the photo. Needs the mask.
 */
/**
 * Head-and-shoulders crop of the photo: a little air above the hair, cut
 * at the chest, centred on the head.
 */
async function bustRegion(mask) {
  const meta = await sharp(source).metadata();
  const W = meta.width;
  const H = meta.height;
  const { data, info } = await sharp(mask).greyscale().raw().toBuffer({ resolveWithObject: true });
  let top = H;
  let sumX = 0;
  let count = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[y * info.width + x] > 127) {
        top = Math.min(top, y);
        // Centre on the head (top fifth of the figure), not the whole body.
        if (y < top + H * 0.2) {
          sumX += x;
          count += 1;
        }
      }
    }
  }
  const cx = count ? sumX / count : W / 2;
  const regionTop = Math.max(0, Math.round(top - H * 0.05));
  const height = Math.min(H - regionTop, Math.round(H * 0.56));
  const width = Math.min(W, Math.round(height * 0.9));
  const left = Math.max(0, Math.min(W - width, Math.round(cx - width / 2)));
  return { left, top: regionTop, width, height };
}

/**
 * The hero portrait as a field of dots: one per grid cell of the bust,
 * sized by brightness (the dark hoodie keeps a small dot so the figure
 * stays whole). Written twice from the same grid, so they line up exactly:
 *   content/portrait-dots.json   sizes for the WebGL particles
 *   public/portrait/dots.webp    the same dots as a still (first paint,
 *                                no WebGL, reduced motion)
 */
const DOT_COLS = 104;
async function heroDots(mask) {
  const region = await bustRegion(mask);
  const cols = DOT_COLS;
  const rows = Math.round((region.height / region.width) * cols);
  // Local contrast first, so eyes and glasses survive the coarse grid.
  const grey = await sharp(source)
    .extract(region)
    .greyscale()
    .clahe({ width: 64, height: 64, maxSlope: 3 })
    .resize(cols, rows, { fit: "fill" })
    .raw()
    .toBuffer();
  const alpha = await sharp(mask).extract(region).resize(cols, rows, { fit: "fill" }).greyscale().raw().toBuffer();
  const lo = percentile(grey, alpha, 0.02);
  const hi = percentile(grey, alpha, 0.99);
  const sizes = Buffer.alloc(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    if (alpha[i] < 110) continue;
    const t = Math.min(1, Math.max(0, (grey[i] - lo) / Math.max(1, hi - lo)));
    const edge = Math.min(1, (alpha[i] - 110) / 120);
    const size = (0.18 + 0.82 * Math.pow(t, 1.3)) * edge;
    sizes[i] = Math.max(1, Math.round(size * 255));
  }

  const W = 900;
  const H = Math.round((rows / cols) * W);
  const cell = W / cols;
  const circles = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const v = sizes[y * cols + x];
      if (!v) continue;
      const r = ((v / 255) * cell * 0.92) / 2;
      circles.push(`<circle cx="${((x + 0.5) * cell).toFixed(1)}" cy="${((y + 0.5) * cell).toFixed(1)}" r="${r.toFixed(2)}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="#edeae4">${circles.join("")}</g></svg>`;
  const still = sharp(Buffer.from(svg));
  const json = { cols, rows, aspect: cols / rows, sizes: sizes.toString("base64") };
  return { still, json };
}

await mkdir(dir, { recursive: true });

const mask = ensureMask();
const map = await luminanceMap(mask);

const poster = sharp(Buffer.from(halftoneSvg(map)));
await poster.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(dir, "poster.webp"));

if (source) {
  const about = await aboutPhoto(mask);
  await about.webp({ quality: 84 }).toFile(path.join(dir, "about.webp"));
  if (mask) {
    const dots = await heroDots(mask);
    await dots.still.webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(dir, "dots.webp"));
    await writeFile(path.join(root, "content", "portrait-dots.json"), `${JSON.stringify(dots.json)}\n`);
  }
} else {
  await poster.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(dir, "about.webp"));
}

await writeFile(
  path.join(root, "content", "portrait.json"),
  `${JSON.stringify({ hasPhoto: Boolean(source), width: POSTER_W, height: POSTER_H }, null, 2)}\n`,
);

console.log(
  source
    ? `portrait: built from ${path.relative(root, source)}`
    : "portrait: no source photo found — rendered the ember placeholder",
);
