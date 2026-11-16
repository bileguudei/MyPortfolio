// Builds the cover + WebGL thumbnail for every project.
//
//   npm run covers            capture / render everything
//   npm run covers -- kuma    only the given slugs
//
// Sources, in order of preference:
//   1. public/work/<slug>/source.(png|jpg|webp)  — a screenshot you supply
//   2. assets/work/<slug>/*.png posters listed in `collage` (laid out in a row)
//   3. the project's live site (captured with Playwright)
//   4. a typographic plate: the project's name and headline figure
//
// Outputs public/work/<slug>/cover.jpg (1600×1000) and thumb.jpg (800×500),
// and records where each image came from in content/media-credits.json.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { baseCss, fontLinks, launch, render } from "./lib/brand.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1600;
const H = 1000;

/** Slug, display name, live URL (if any) and the plate's headline figure. */
const projects = [
  {
    slug: "kuma",
    name: "KUMA",
    // The live site opens on a login form, so the cover uses the project's
    // own campaign posters instead.
    collage: ["05-duel.png", "01-reveal.png", "11-tutor-ask.png"],
    value: "6–12",
    label: "Grades served",
  },
  { slug: "reelscaption", name: "ReelsCaption", url: "https://reelscaption.com", value: "39 → 94", label: "Performance score" },
  { slug: "minigift", name: "MiniGift Studio", url: "https://minigift.online", value: "−84%", label: "Image bundle size" },
  { slug: "driver-drowsiness", name: "Driver Drowsiness Detection", value: "15 FPS", label: "Real-time detection" },
  { slug: "chiglel", name: "Chiglel", value: "5.4×", label: "Searchable buildings" },
];

const only = process.argv.slice(2);
async function collage(project) {
  const gap = 40;
  const margin = 72;
  const count = project.collage.length;
  const tileW = Math.floor((W - margin * 2 - gap * (count - 1)) / count);
  const tileH = Math.round((tileW * 1350) / 1080);
  const total = project.collage.length * tileW + (project.collage.length - 1) * gap;
  const left = Math.round((W - total) / 2);
  const tiles = await Promise.all(
    project.collage.map(async (file, i) => ({
      input: await sharp(path.join(root, "assets", "work", project.slug, file))
        .resize(tileW, tileH, { fit: "cover" })
        .toBuffer(),
      left: left + i * (tileW + gap),
      top: Math.round((H - tileH) / 2),
    })),
  );
  return sharp({ create: { width: W, height: H, channels: 3, background: "#050505" } })
    .composite(tiles)
    .png()
    .toBuffer();
}

function plateHtml(project, index) {
  const value = project.value;
  return `<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>
    ${baseCss}
    body { width: ${W}px; height: ${H}px; }
    .frame { position: absolute; inset: 56px; display: flex; flex-direction: column; justify-content: space-between; }
    .row { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 20px; }
    .value { font-size: ${value.length > 5 ? 500 : 620}px; white-space: nowrap; }
    .name { font-size: 150px; max-width: 1300px; }
  </style></head><body><div class="frame">
    <div><div class="row label"><span><b>${String(index + 1).padStart(2, "0")}</b> / ${project.label}</span><span>2026</span></div><div class="rule"></div></div>
    <div class="display mega value ember">${value}</div>
    <div class="display name">${project.name}</div>
  </div></body></html>`;
}

async function write(slug, buffer, credit) {
  const dir = path.join(root, "public", "work", slug);
  await mkdir(dir, { recursive: true });
  const base = sharp(buffer).resize(W, H, { fit: "cover", position: "top" });
  await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(dir, "cover.jpg"));
  await base.clone().resize(800, 500).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(dir, "thumb.jpg"));
  return credit;
}

const creditsFile = path.join(root, "content", "media-credits.json");
const credits = existsSync(creditsFile) ? JSON.parse(await readFile(creditsFile, "utf8")) : {};

const browser = await launch(chromium);
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  colorScheme: "light",
  reducedMotion: "reduce",
});

for (const [index, project] of projects.entries()) {
  if (only.length && !only.includes(project.slug)) continue;
  const dir = path.join(root, "public", "work", project.slug);
  const supplied = ["source.png", "source.jpg", "source.jpeg", "source.webp"]
    .map((name) => path.join(dir, name))
    .find((file) => existsSync(file));

  try {
    if (supplied) {
      credits[project.slug] = await write(project.slug, await readFile(supplied), {
        kind: "supplied",
        source: path.relative(root, supplied),
      });
    } else if (project.collage) {
      credits[project.slug] = await write(project.slug, await collage(project), {
        kind: "collage",
        source: `Project campaign posters: ${project.collage.map((f) => `assets/work/${project.slug}/${f}`).join(", ")}`,
      });
    } else if (project.url) {
      const page = await context.newPage();
      await page.goto(project.url, { waitUntil: "networkidle", timeout: 45_000 });
      await page.waitForTimeout(1500);
      const shot = await page.screenshot({ type: "png" });
      await page.close();
      credits[project.slug] = await write(project.slug, shot, {
        kind: "screenshot",
        source: project.url,
        captured: new Date().toISOString().slice(0, 10),
      });
    } else {
      const shot = await render(context, plateHtml(project, index), W, H);
      credits[project.slug] = await write(project.slug, shot, {
        kind: "plate",
        source: "Typographic plate rendered by scripts/capture-work.mjs",
      });
    }
    console.log(`${project.slug}: ${credits[project.slug].kind}`);
  } catch (error) {
    console.error(`${project.slug}: failed — ${error.message}`);
    process.exitCode = 1;
  }
}

await browser.close();
await writeFile(creditsFile, `${JSON.stringify(credits, null, 2)}\n`);
