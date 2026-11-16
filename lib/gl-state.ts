// Shared, mutable bridge between the DOM (GSAP, pointer handlers) and the
// WebGL scene. GSAP tweens these numbers; the render loop only reads them, so
// nothing here triggers a React render.
export const glState = {
  /**
   * 3D sculpture targets, set per section (see ObjectCanvas). o = opacity,
   * x / y = offset as a fraction of the viewport, s = scale, m = shape
   * (0 knot, 1 infinity, 2 coil, 3 crown; fractions blend). icons = show the
   * hero's code symbols around [data-object-anchor].
   */
  object: { o: 0, x: 0.31, y: 0.1, s: 0.8, m: 0, icons: true },
};

type Listener = () => void;
const listeners = new Set<Listener>();
let ready = false;

/** Whether the 3D sculpture is drawing. Hides the hero's still poster. */
export const glReady = {
  get: () => ready,
  set(value: boolean) {
    if (ready === value) return;
    ready = value;
    document.documentElement.dataset.gl = value ? "on" : "off";
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
