// Reel files carry a content hash in their name (reel.<hash>.mp4 / .jpg) so
// a re-rendered reel gets a new URL: browsers, the image optimiser and CDNs
// can cache them forever and never show a stale film. content/reels.json maps
// each project to its current hash; content/projects.ts (reelOf) reads it.

import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// The slider's textless loops (loop.<hash>.*) use the same scheme with
// content/loops.json; pass base "loop".
export const manifestFile = (root, base = "reel") => path.join(root, "content", `${base}s.json`);

export async function readManifest(root, base = "reel") {
  const file = manifestFile(root, base);
  return existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};
}

/**
 * Renames freshly written dir/<base>.mp4 + dir/<base>.jpg to their hashed
 * names, removes older hashed copies, and returns the hash.
 */
export async function publishReel(dir, base = "reel") {
  const mp4 = path.join(dir, `${base}.mp4`);
  const jpg = path.join(dir, `${base}.jpg`);
  const hash = createHash("sha1")
    .update(await readFile(mp4))
    .update(await readFile(jpg))
    .digest("hex")
    .slice(0, 10);
  for (const name of readdirSync(dir)) {
    if (new RegExp(`^${base}\\.[0-9a-f]{10}\\.(mp4|jpg)$`).test(name) && !name.includes(hash)) {
      await rm(path.join(dir, name));
    }
  }
  await rename(mp4, path.join(dir, `${base}.${hash}.mp4`));
  await rename(jpg, path.join(dir, `${base}.${hash}.jpg`));
  return hash;
}

export async function writeManifest(root, manifest, base = "reel") {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(manifestFile(root, base), `${JSON.stringify(sorted, null, 2)}\n`);
}
