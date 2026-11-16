// Shared helpers for the motion studies in this folder. Each study is a
// 1280×800 canvas with a pure `render(t)` (t in seconds, loops every LOOP
// seconds), so scripts/make-reels.mjs can step it frame by frame and the
// result is identical on every run.

window.LOOP = 8;

window.C = {
  ink: "#0a0a0a",
  coal: "#161616",
  line: "#2a2a2a",
  ash: "#8a8a8a",
  bone: "#edeae4",
  ember: "#ff4d00",
};

window.W = 1280;
window.H = 800;

window.setup = function setup() {
  // Drawn in 1280×800 units at the device pixel ratio, so the capture can
  // render it larger without blurring.
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.querySelector("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
};

/** Deterministic PRNG (mulberry32). */
window.rng = function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

window.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
window.lerp = (a, b, t) => a + (b - a) * t;
/** 0..1 progress of t through [a, b]. */
window.span = (t, a, b) => clamp((t - a) / (b - a));
window.easeOut = (t) => 1 - Math.pow(1 - t, 3);
window.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

window.mono = (size, weight = 400) => `${weight} ${size}px "Geist Mono", ui-monospace, monospace`;
window.display = (size, weight = 600) => `${weight} ${size}px "Inter Tight", system-ui, sans-serif`;

/** Uppercase mono label with tracking, like `.label` on the site. */
window.label = function label(ctx, text, x, y, color = C.ash, size = 15, align = "left") {
  ctx.save();
  ctx.font = mono(size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${size * 0.08}px`;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
};

/** Big compressed numerals, like the display face on the site. */
window.big = function big(ctx, text, x, y, size, color = C.bone, align = "left") {
  ctx.save();
  ctx.font = display(size, 600);
  ctx.letterSpacing = `${-size * 0.04}px`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
  ctx.restore();
};

/** Frame chrome shared by every study: corner index and a footer note. */
window.chrome = function chrome(ctx, title, note) {
  ctx.fillStyle = C.ember;
  ctx.fillRect(40, 38, 10, 10);
  label(ctx, title, 62, 48, C.bone);
  label(ctx, note, W - 40, 48, C.ash, 15, "right");
  ctx.fillStyle = C.line;
  ctx.fillRect(40, 66, W - 80, 1);
};

/** Fade in at the start of the loop and out at the end, so it loops cleanly. */
window.loopFade = function loopFade(ctx, t) {
  const a = Math.max(1 - span(t, 0, 0.35), span(t, LOOP - 0.35, LOOP));
  if (a <= 0) return;
  ctx.fillStyle = `rgba(10,10,10,${a})`;
  ctx.fillRect(0, 0, W, H);
};
