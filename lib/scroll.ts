import type Lenis from "lenis";

// One smooth-scroll engine (Lenis). This module is the only handle to it, so
// menus, transitions and anchor links never talk to the instance directly.
let instance: Lenis | null = null;

export const scroll = {
  set(lenis: Lenis | null) {
    instance = lenis;
  },
  lock() {
    instance?.stop();
    document.documentElement.classList.add("is-locked");
  },
  unlock() {
    instance?.start();
    document.documentElement.classList.remove("is-locked");
  },
  toTop() {
    if (instance) instance.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  },
  /** Where the page is heading (Lenis' target), or where it is. */
  target() {
    return instance ? instance.targetScroll : window.scrollY;
  },
  /**
   * Smooth scroll to an absolute position (px from the top). With `lock`,
   * user input cannot interrupt it.
   */
  toY(y: number, onComplete?: () => void, { lock = false, duration = 1.1 } = {}) {
    if (instance) {
      instance.scrollTo(y, { force: true, lock, duration, onComplete: () => onComplete?.() });
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
      window.setTimeout(() => onComplete?.(), 900);
    }
  },
  to(target: string | HTMLElement, immediate = false) {
    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : target;
    if (!el) return;
    if (instance) {
      instance.scrollTo(el, { immediate, force: true });
    } else {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
  },
};
