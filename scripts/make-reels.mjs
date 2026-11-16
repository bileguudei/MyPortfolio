// Builds the moving footage for each project: public/work/<slug>/reel.<hash>.mp4
// (1600×1000, H.264, muted, loops) and reel.<hash>.jpg (poster frame); the
// hash is recorded in content/reels.json (see scripts/lib/reel-files.mjs).
//
//   npm run reels                    every project
//   npm run reels -- kuma minigift   only these
//   npm run reels -- --preview       contact sheets of the studies, no video
//   npm run reels -- --loops         the slider's device mockup loops instead:
//                                    public/work/<slug>/loop.<hash>.mp4/.jpg
//                                    and content/loops.json
//
// The loops fill the home page's work slider behind a large title, so they
// carry no headlines: textless films, or the project's footage on a device
// in a studio plate (scripts/mockups/plates, generated images with a
// chroma-green screen). Projects without one fall back to their reel.
//
// Where the footage comes from (also written to content/media-credits.json):
//   clip   a cut of the project's own promo film (paths below; override with
//          REEL_SRC_<SLUG>=/path/to/file.mp4)
//   live   a screen capture of the public site, recorded through Chrome
//   story  a real-time capture of a template played through on the public
//          demo page (the clicks a visitor would make)
//   study  a motion study rendered from scripts/reels/<slug>.html, for
//          projects without a public build. Those pages draw schematics
//          around the project's recorded figures and say "Schematic" on
//          screen; they are not product footage.
//
// Needs ffmpeg with libx264 on PATH.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { launch } from "./lib/brand.mjs";
import { publishReel, readManifest, writeManifest } from "./lib/reel-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1600;
const H = 1000;
// Studies and site captures are laid out at 1280×800 CSS px and rendered
// at this device scale, so text stays crisp at the output size.
const SCALE = W / 1280;
const FPS = 30;
const desktop = path.join(os.homedir(), "Desktop");

const plan = {
  kuma: {
    kind: "clip",
    file: path.join(desktop, "Kuma/marketing-video/out/kuma-promo-1920x1080.mp4"),
    start: 3.6,
    duration: 16,
    poster: 6.2,
  },
  reelscaption: {
    kind: "clip",
    // The long launch film: the product UI fills the frame (editor, caption
    // styles, export) instead of title cards on an empty background.
    file: path.join(desktop, "mongol-reels-creator-studio-mvp/marketing-video/out/reelscaption-launch-film-16x9.mp4"),
    start: 19.6,
    duration: 16,
    poster: 9,
  },
  // Promo made in Remotion (~/Desktop/chiglel-marketing-video) from Chiglel's
  // own data: the real Ulaanbaatar building points and the 14-stop route the
  // app's planner solved over OSRM (176.7 → 89.7 km), plus real app screens
  // captured from its /ui/screens preview routes.
  chiglel: {
    kind: "clip",
    file: path.join(desktop, "chiglel-marketing-video/out/chiglel-promo-1920x1080.mp4"),
    start: 0,
    duration: 26.3,
    poster: 13.4,
  },
  // The "Цэцгэн хайрын түүх" (floral-love) template, played through on the
  // public demo: unlock with the published demo code, bloom, photo garden,
  // envelope, handwritten letter, keepsake.
  minigift: { kind: "story", url: "https://minigift.online/demo?templateId=floral-love", poster: 6.0, crf: 26 },
  // App promo made in Remotion (~/Desktop/fatigueguard-marketing-video): the
  // FatigueGuard screens rebuilt from the app's source
  // (github.com/bileguudei/intern-4ab-driver-fatigue), demo trip values.
  "driver-drowsiness": {
    kind: "clip",
    file: path.join(desktop, "fatigueguard-marketing-video/out/fatigueguard-promo-1920x1080.mp4"),
    start: 0,
    duration: 25.6,
    // The reveal: FatigueGuard wordmark beside the phone's home screen.
    poster: 7.0,
  },
};

// Loops for the home page's work slider (closed loops, no headlines). Two
// kinds: "mockup" keys the project's real footage onto the screen of a
// device in a studio plate (see mockup() below); the others are textless
// films of their own. Screen footage is a file or, with `reel`, the
// project's current reel from content/reels.json.
const loops = {
  // Remotion "Hero" composition added to the promo: real app screens.
  kuma: {
    kind: "clip",
    file: path.join(desktop, "Kuma/marketing-video/out/hero-1920x1200.mp4"),
    start: 0,
    duration: 12,
    poster: 6.6,
  },
  // A stretch of the launch film with only the product UI in frame, on a laptop.
  reelscaption: {
    kind: "mockup",
    screen: {
      file: path.join(desktop, "mongol-reels-creator-studio-mvp/marketing-video/out/reelscaption-launch-film-16x9.mp4"),
      start: 19.2,
      duration: 11.8,
      crop: "crop=ih*16/10:ih",
    },
    poster: 8,
  },
  // The real UB building points and the 14-stop route, without the copy.
  chiglel: {
    kind: "clip",
    file: path.join(desktop, "chiglel-marketing-video/out/hero-1920x1200.mp4"),
    start: 0,
    duration: 12,
    poster: 8.8,
  },
  // The floral-love template's own flower art, recomposed as a loop.
  minigift: {
    kind: "study",
    page: "minigift",
    poster: 6,
    crf: 27,
    source: "Loop composed from the floral-love template's own flower art (scripts/reels/minigift.html)",
  },
  // App screens from the promo's "HeroScreen" composition, on a phone.
  "driver-drowsiness": {
    kind: "mockup",
    screen: {
      file: path.join(desktop, "fatigueguard-marketing-video/out/hero-screen-1170x2532.mp4"),
      duration: 12,
    },
    poster: 6,
  },
};

const encode = ["-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-an"];

function run(cmd, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: [input ? "pipe" : "ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${err.slice(-800)}`))));
    if (input) input(child.stdin);
  });
}

async function clip(slug, job, out) {
  const file = process.env[`REEL_SRC_${slug.toUpperCase().replace(/-/g, "_")}`] ?? job.file;
  if (!existsSync(file)) throw new Error(`source film not found: ${file}`);
  // 16:9 film → centre-cropped 16:10 frame.
  await run("ffmpeg", [
    "-v", "error", "-y", "-ss", String(job.start), "-t", String(job.duration), "-i", file,
    "-vf", `crop=ih*16/10:ih,scale=${W}:${H}:flags=lanczos,fps=${FPS}`,
    ...encode, out,
  ]);
  return { kind: "clip", source: path.relative(desktop, file) };
}

async function study(slug, browser, out, preview, job) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: SCALE });
  const file = `${job?.page ?? slug}.html`;
  await page.goto(pathToFileURL(path.join(root, "scripts", "reels", file)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.ready);
  const loop = await page.evaluate(() => window.LOOP);

  if (preview) {
    const shots = [];
    for (const t of [0.9, 2.6, 4.4, 6.2, 6.9, 7.5]) {
      await page.evaluate((s) => window.render(s), t);
      shots.push(await page.screenshot({ type: "png" }));
    }
    await page.close();
    return shots;
  }

  const frames = Math.round(loop * FPS);
  await run(
    "ffmpeg",
    [
      "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      ...encode.map((v, i, all) => (all[i - 1] === "-crf" && job?.crf ? String(job.crf) : v)), out,
    ],
    {
      input: async (stdin) => {
        for (let i = 0; i < frames; i += 1) {
          await page.evaluate((s) => window.render(s), i / FPS);
          const shot = await page.screenshot({ type: "jpeg", quality: 92 });
          if (!stdin.write(shot)) await new Promise((r) => stdin.once("drain", r));
        }
        stdin.end();
      },
    },
  );
  await page.close();
  return { kind: "study", source: job?.source ?? `Motion study rendered from scripts/reels/${slug}.html (schematic)` };
}

/**
 * Capture of a public site: the hero, then an eased scroll down to its
 * catalogue. Frame by frame: each frame sets the scroll position, waits for
 * paint and takes a screenshot, so scrolling is perfectly smooth and never
 * tears (real-time screen recording did both).
 */
async function live(slug, job, browser, out) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: SCALE });
  await page.goto(job.url, { waitUntil: "networkidle" });
  // Warm-up pass: load every lazy image, then return to the top.
  for (let y = 0; y < 7000; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);

  const target = await page.evaluate(() => {
    // Stop where the template catalogue sits in view, if the page has one.
    const heading = [...document.querySelectorAll("h2, h3")].find((el) => /загвар/i.test(el.textContent ?? ""));
    return heading ? Math.max(0, heading.getBoundingClientRect().top + window.scrollY - 90) : 900;
  });
  // Timeline (s): hold hero, scroll to catalogue, hold.
  const keys = [
    [0, 0],
    [3.2, 0],
    [6.4, target],
    [9.6, target],
  ];
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const scrollAt = (t) => {
    for (let i = 1; i < keys.length; i += 1) {
      const [t0, y0] = keys[i - 1];
      const [t1, y1] = keys[i];
      if (t <= t1) return y0 + (y1 - y0) * ease((t - t0) / (t1 - t0));
    }
    return keys[keys.length - 1][1];
  };
  const duration = keys[keys.length - 1][0];
  const frames = Math.round(duration * FPS);

  await run(
    "ffmpeg",
    [
      "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      ...encode.map((v, i, all) => (all[i - 1] === "-crf" && job?.crf ? String(job.crf) : v)), out,
    ],
    {
      input: async (stdin) => {
        for (let i = 0; i < frames; i += 1) {
          await page.evaluate(
            (top) =>
              new Promise((resolve) => {
                window.scrollTo(0, top);
                requestAnimationFrame(() => requestAnimationFrame(resolve));
              }),
            scrollAt(i / FPS),
          );
          const shot = await page.screenshot({ type: "jpeg", quality: 92 });
          if (!stdin.write(shot)) await new Promise((r) => stdin.once("drain", r));
        }
        stdin.end();
      },
    },
  );
  await page.close();
  return { kind: "live", source: job.url, captured: new Date().toISOString().slice(0, 10) };
}

/**
 * A MiniGift template on its public demo, played through the way a visitor
 * would (unlock code, bloom, garden, envelope, letter, keepsake), recorded
 * in real time with Chrome's screencast. Frames carry their own timestamps,
 * so GSAP and CSS animations keep their real speed.
 */
async function story(slug, job, browser, out, scratch) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: SCALE });
  const page = await context.newPage();
  await page.goto(job.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const client = await context.newCDPSession(page);
  const frames = [];
  client.on("Page.screencastFrame", async (frame) => {
    frames.push({ data: frame.data, ts: frame.metadata.timestamp });
    await client.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
  });
  await client.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

  const press = async (name) => {
    await page.getByRole("button", { name: `${name} цифр`, exact: true }).first().click({ force: true });
  };
  const step = async (locator, wait) => {
    await locator.first().waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(wait);
    await locator.first().click({ force: true });
  };

  await page.waitForTimeout(1200);
  for (const digit of "1234") {
    await press(digit);
    await page.waitForTimeout(260);
  }
  await step(page.getByRole("button", { name: /Захидал руу/ }), 2600);
  await step(page.getByRole("button", { name: "Захидлын дугтуйг нээх" }), 1400);
  await step(page.getByRole("button", { name: "Захидлыг дэлгэх" }), 1100);
  await page.waitForTimeout(3800);
  await step(page.getByRole("button", { name: /Дурсгал/ }), 200);
  await page.waitForTimeout(3200);

  await client.send("Page.stopScreencast");
  await context.close();

  // Resample to a constant FPS here, by timestamp: output frame k shows the
  // newest screencast frame at or before k / FPS. (Feeding the frames to
  // ffmpeg's concat demuxer with per-frame durations rounds them to its
  // 1/25 s time base: the film became 25 fps, and converting that to 30 fps
  // repeated every sixth frame — a visible stutter five times a second.)
  const dir = path.join(scratch, slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const t0 = frames[0].ts;
  const total = Math.floor((frames.at(-1).ts - t0) * FPS);
  let src = 0;
  for (let k = 0; k <= total; k += 1) {
    const t = t0 + k / FPS;
    while (src + 1 < frames.length && frames[src + 1].ts <= t + 1e-4) src += 1;
    await writeFile(path.join(dir, `f${String(k).padStart(5, "0")}.jpg`), Buffer.from(frames[src].data, "base64"));
  }
  await run("ffmpeg", [
    "-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(dir, "f%05d.jpg"),
    "-vf", `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`,
    ...encode.map((v, i, all) => (all[i - 1] === "-crf" && job.crf ? String(job.crf) : v)), out,
  ]);
  return { kind: "story", source: job.url, captured: new Date().toISOString().slice(0, 10) };
}

/**
 * Device mockup: a photographed studio plate whose device screen is flat
 * chroma green (scripts/mockups/plates/<slug>.png), with the project's real
 * footage keyed onto that screen in perspective. The camera does not move. The screen's corners are found from the
 * green itself, so a new plate needs no hand-placed coordinates.
 */
async function mockup(slug, job, out, scratch) {
  const sharp = (await import("sharp")).default;
  const work = path.join(scratch, `mockup-${slug}`);
  await mkdir(work, { recursive: true });

  // Plate: centre-cropped to 16:10 at a little over the output size; the
  // final crop trims that margin.
  const PW = Math.round(W * 1.06);
  const PH = Math.round(H * 1.06);
  const plate = path.join(work, "plate.png");
  await sharp(path.join(root, "scripts", "mockups", "plates", `${slug}.png`))
    .resize(PW, PH, { fit: "cover", position: "centre", kernel: "lanczos3" })
    .png()
    .toFile(plate);

  // Key: green pixels, generously (the screen's anti-aliased rim is only
  // partly green). Then despill: any green cast left on the plate (the rim,
  // light bounced onto the bezel) is pulled back to neutral.
  const { data, info } = await sharp(plate).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const mask = Buffer.alloc(w * h);
  let count = 0;
  for (let i = 0; i < w * h; i += 1) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    if (g > 90 && g > r * 1.3 && g > b * 1.3) {
      mask[i] = 255;
      count += 1;
    }
    const cap = Math.max(r, b) * 1.08;
    if (g > cap) data[i * channels + 1] = Math.round(cap);
  }
  if (count < w * h * 0.01) throw new Error(`${slug}: no green screen found on the plate`);
  await sharp(data, { raw: { width: w, height: h, channels } }).png().toFile(plate);

  // Corners: fit a line to each edge of the screen over the middle of its
  // run (away from the rounded corners) and intersect neighbours.
  let x0b = w;
  let x1b = 0;
  let y0b = h;
  let y1b = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      if (x < x0b) x0b = x;
      if (x > x1b) x1b = x;
      if (y < y0b) y0b = y;
      if (y > y1b) y1b = y;
    }
  }
  const fit = (pts) => {
    // Least squares v = a*u + b.
    const n = pts.length;
    let su = 0;
    let sv = 0;
    let suu = 0;
    let suv = 0;
    for (const [u, v] of pts) {
      su += u;
      sv += v;
      suu += u * u;
      suv += u * v;
    }
    const a = (n * suv - su * sv) / (n * suu - su * su);
    return [a, (sv - a * su) / n];
  };
  const left = [];
  const right = [];
  for (let y = Math.round(y0b + (y1b - y0b) * 0.2); y <= y0b + (y1b - y0b) * 0.8; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = x0b; x <= x1b; x += 1) {
      if (!mask[y * w + x]) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first >= 0) {
      left.push([y, first]);
      right.push([y, last]);
    }
  }
  const top = [];
  const bottom = [];
  for (let x = Math.round(x0b + (x1b - x0b) * 0.2); x <= x0b + (x1b - x0b) * 0.8; x += 1) {
    let first = -1;
    let last = -1;
    for (let y = y0b; y <= y1b; y += 1) {
      if (!mask[y * w + x]) continue;
      if (first < 0) first = y;
      last = y;
    }
    if (first >= 0) {
      top.push([x, first]);
      bottom.push([x, last]);
    }
  }
  const [la, lb] = fit(left); // x = la*y + lb
  const [ra, rb] = fit(right);
  const [ta, tb] = fit(top); // y = ta*x + tb
  const [ba, bb] = fit(bottom);
  const meet = (a, b, c, d) => {
    const x = (a * d + b) / (1 - a * c);
    return [Math.round(x * 10) / 10, Math.round((c * x + d) * 10) / 10];
  };
  const tl = meet(la, lb, ta, tb);
  const tr = meet(ra, rb, ta, tb);
  const bl = meet(la, lb, ba, bb);
  const br = meet(ra, rb, ba, bb);

  // Grow the key a touch and soften it, so no rim survives at the bezel.
  const matte = path.join(work, "matte.png");
  await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
    .dilate(3)
    .blur(0.8)
    .png()
    .toFile(matte);

  const film = job.screen.reel
    ? path.join(root, "public", "work", job.screen.reel, `reel.${(await readManifest(root))[job.screen.reel]}.mp4`)
    : job.screen.file;
  if (!existsSync(film)) throw new Error(`${slug}: screen footage not found: ${film}`);

  const [x0, y0] = tl;
  const [x1, y1] = tr;
  const [x2, y2] = bl;
  const [x3, y3] = br;
  const period = job.screen.duration;
  const dx = (PW - W) / 2;
  const dy = (PH - H) / 2;
  const screenVf = [
    ...(job.screen.crop ? [job.screen.crop] : []),
    `scale=${PW}:${PH}:flags=lanczos`,
    "setsar=1",
    // Glass: the screen sits a little under the studio light.
    "eq=brightness=-0.02:saturation=0.96",
    `perspective=x0=${x0}:y0=${y0}:x1=${x1}:y1=${y1}:x2=${x2}:y2=${y2}:x3=${x3}:y3=${y3}:sense=destination:interpolation=cubic`,
    `fps=${FPS}`,
  ].join(",");
  await run("ffmpeg", [
    "-v", "error", "-y",
    "-loop", "1", "-framerate", String(FPS), "-t", String(period), "-i", plate,
    "-ss", String(job.screen.start ?? 0), "-t", String(period), "-i", film,
    "-loop", "1", "-framerate", String(FPS), "-t", String(period), "-i", matte,
    "-filter_complex",
    [
      // In planar RGB the grey matte becomes the same mask on every plane
      // (in YUV its chroma planes would sit at a neutral half blend).
      `[0:v]format=gbrp[plate]`,
      `[1:v]${screenVf},format=gbrp[screen]`,
      `[2:v]scale=${PW}:${PH},format=gray,format=gbrp[matte]`,
      `[plate][screen][matte]maskedmerge[comp]`,
      // The frame stays still: only the screen moves.
      `[comp]crop=${W}:${H}:${dx}:${dy},format=yuv420p[out]`,
    ].join(";"),
    "-map", "[out]", "-t", String(period),
    ...encode.map((v, i, all) => (all[i - 1] === "-crf" && job.crf ? String(job.crf) : v)),
    out,
  ]);
  return {
    kind: "mockup",
    source: `Device mockup: generated studio plate scripts/mockups/plates/${slug}.png, screen footage ${path.relative(desktop, film)}`,
  };
}

async function poster(video, at, out) {
  await run("ffmpeg", ["-v", "error", "-y", "-ss", String(at), "-i", video, "-frames:v", "1", "-q:v", "3", out]);
}

const args = process.argv.slice(2);
const preview = args.includes("--preview");
const base = args.includes("--loops") ? "loop" : "reel";
const jobs = base === "loop" ? loops : plan;
const only = args.filter((a) => !a.startsWith("--"));
const slugs = Object.keys(jobs).filter((s) => !only.length || only.includes(s));
const scratch = path.join(os.tmpdir(), "portfolio-reels");

const creditsFile = path.join(root, "content", "media-credits.json");
const reels = await readManifest(root, base);
const credits = JSON.parse(await readFile(creditsFile, "utf8"));

const browser = await launch(chromium);
try {
  for (const slug of slugs) {
    const job = jobs[slug];
    const dir = path.join(root, "public", "work", slug);
    await mkdir(dir, { recursive: true });

    if (preview) {
      if (job.kind !== "study") continue;
      const shots = await study(slug, browser, null, true);
      const sharp = (await import("sharp")).default;
      const tiles = await Promise.all(shots.map((s) => sharp(s).resize(640, 400).toBuffer()));
      const sheet = path.join(scratch, `${slug}-sheet.png`);
      await mkdir(scratch, { recursive: true });
      await sharp({ create: { width: 1280, height: 1200, channels: 3, background: "#333" } })
        .composite(tiles.map((input, i) => ({ input, left: (i % 2) * 640, top: Math.floor(i / 2) * 400 })))
        .png()
        .toFile(sheet);
      console.log(`preview: ${sheet}`);
      continue;
    }

    const out = path.join(dir, `${base}.mp4`);
    let credit;
    if (job.kind === "clip") credit = await clip(slug, job, out);
    else if (job.kind === "study") credit = await study(slug, browser, out, false, job);
    else if (job.kind === "story") credit = await story(slug, job, browser, out, scratch);
    else if (job.kind === "mockup") credit = await mockup(slug, job, out, scratch);
    else credit = await live(slug, job, browser, out);
    await poster(out, job.poster, path.join(dir, `${base}.jpg`));
    const { size } = await import("node:fs").then((fs) => fs.statSync(out));
    // Hashed names: a new render is a new URL, never a stale cached film.
    reels[slug] = await publishReel(dir, base);

    credits[slug] = { ...credits[slug], [base]: credit };
    console.log(`reel: ${slug.padEnd(18)} ${(size / 1024 / 1024).toFixed(2)} MB  (${credit.kind})`);
  }
} finally {
  await browser.close();
}

if (!preview) {
  await writeFile(creditsFile, `${JSON.stringify(credits, null, 2)}\n`);
  await writeManifest(root, reels, base);
}
