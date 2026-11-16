export type Tier = {
  name: "high" | "mid" | "lite";
  maxDpr: number;
};

const HIGH: Tier = { name: "high", maxDpr: 2 };
const MID: Tier = { name: "mid", maxDpr: 1.5 };
const LITE: Tier = { name: "lite", maxDpr: 1.5 };

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/**
 * True only for hardware-accelerated WebGL 2. `failIfMajorPerformanceCaveat`
 * makes the browser refuse a software renderer, where a full-screen canvas
 * would cost far more than it is worth; those visitors keep the poster.
 */
function webglAvailable() {
  try {
    const gl = document
      .createElement("canvas")
      .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks how much WebGL this device gets. `null` means none: the static
 * halftone poster stays, which is also the reduced-motion experience.
 */
export function detectTier(): Tier | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return null;
  if (!webglAvailable()) return null;

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;

  if (touch || small) return memory <= 2 ? null : LITE;
  if (cores >= 8 && memory >= 8) return HIGH;
  if (cores <= 2 || memory <= 2) return LITE;
  return MID;
}
