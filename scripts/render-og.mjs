// Renders the Open Graph cards (1200×630) as static PNGs.
//
//   npm run og
//
// Outputs
//   public/og/default.png        home card: name, role, portrait halftone
//   public/og/<slug>.png         one card per project: name + headline figure
//
// Rendered with the site's own fonts in a real browser, so the cards match
// the pages. Text is Latin-only, so one set serves both locales.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { baseCss, colors, fontLinks, launch, render } from "./lib/brand.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "og");
const W = 1200;
const H = 630;

// Kept in step with content/projects.ts (name + headline figure).
const projects = [
  { slug: "kuma", name: "KUMA", value: "2,500+", label: "Registered users" },
  { slug: "reelscaption", name: "ReelsCaption", value: "14.5% / 7.5%", label: "Speech recognition WER / CER" },
  { slug: "driver-drowsiness", name: "Driver Drowsiness Detection", value: "15 FPS", label: "Real-time detection" },
  { slug: "minigift", name: "MiniGift Studio", value: "−84%", label: "Image bundle size" },
  { slug: "chiglel", name: "Chiglel", value: "5.4×", label: "Searchable buildings" },
];

const frame = `
  body { width: ${W}px; height: ${H}px; }
  .frame { position: absolute; inset: 44px 48px; display: flex; flex-direction: column; justify-content: space-between; }
  .row { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 16px; }
  .label { font-size: 17px; }
  .dot { display: inline-block; width: 12px; height: 12px; background: ${colors.ember}; margin-right: 12px; }
`;

async function homeHtml() {
  const poster = await readFile(path.join(root, "public", "portrait", "poster.webp"));
  const portrait = `data:image/webp;base64,${poster.toString("base64")}`;
  return `<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>
    ${baseCss}${frame}
    .name { font-size: 205px; }
    .portrait { position: absolute; right: 40px; top: 24px; height: 580px; mix-blend-mode: difference; }
  </style></head><body>
    <div class="frame">
      <div><div class="row label"><span><span class="dot"></span>Full-Stack Software Engineer</span><span>Ulaanbaatar, Mongolia</span></div><div class="rule"></div></div>
      <div class="display mega name">Bileguudei<br>Ijilmurun</div>
    </div>
    <img class="portrait" src="${portrait}" alt="">
  </body></html>`;
}

function projectHtml(project, index) {
  const value = project.value;
  return `<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>
    ${baseCss}${frame}
    .value { font-size: ${value.length > 5 ? 190 : 250}px; white-space: nowrap; }
    .name { font-size: ${project.name.length > 16 ? 84 : 112}px; max-width: 1000px; }
  </style></head><body><div class="frame">
    <div><div class="row label"><span><b>${String(index + 1).padStart(2, "0")}</b> / ${project.label}</span><span>Bileguudei Ijilmurun</span></div><div class="rule"></div></div>
    <div class="display mega value ember">${value}</div>
    <div class="display name">${project.name}</div>
  </div></body></html>`;
}

await mkdir(out, { recursive: true });
const browser = await launch(chromium);
const context = await browser.newContext({ deviceScaleFactor: 1 });

const save = async (name, png) => {
  // Palette PNG keeps every card well under the 300 KB social-preview budget.
  const file = path.join(out, `${name}.png`);
  await writeFile(file, await sharp(png).png({ compressionLevel: 9, palette: true, colours: 128 }).toBuffer());
  console.log(`og: ${path.relative(root, file)}`);
};

await save("default", await render(context, await homeHtml(), W, H));
for (const [index, project] of projects.entries()) {
  await save(project.slug, await render(context, projectHtml(project, index), W, H));
}

await browser.close();
