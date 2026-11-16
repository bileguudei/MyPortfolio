// Runs work only while the visitor is not scrolling. Long main-thread tasks
// (loading three.js, building the 3D scene) stall a touch scroll that is
// under way; scheduled through here they land in the pauses instead.

const BUSY = ["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "keydown"] as const;
let lastBusy = 0;
let tracking = false;

/** Note that the visitor is interacting right now. */
export function markBusy() {
  lastBusy = performance.now();
}

function track() {
  if (tracking) return;
  tracking = true;
  BUSY.forEach((type) => window.addEventListener(type, markBusy, { passive: true, capture: true }));
}

/**
 * Calls `fn` once there has been no scroll, touch or key input for `quietMs`
 * and the main thread is idle. Returns a cancel function.
 */
export function whenQuiet(fn: () => void, quietMs = 400) {
  track();
  let cancelled = false;
  let timer: number | undefined;
  let idle: number | undefined;

  const check = () => {
    if (cancelled) return;
    const wait = lastBusy + quietMs - performance.now();
    if (wait > 0) {
      timer = window.setTimeout(check, wait + 16);
      return;
    }
    const run = () => {
      if (cancelled) return;
      // Input may have arrived while waiting for idle time.
      if (performance.now() - lastBusy < quietMs) check();
      else fn();
    };
    idle = window.requestIdleCallback
      ? window.requestIdleCallback(run, { timeout: 1500 })
      : window.setTimeout(run, 50);
  };
  check();

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (idle !== undefined) {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    }
  };
}
