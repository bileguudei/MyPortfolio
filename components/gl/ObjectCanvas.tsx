"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { whenQuiet } from "@/lib/quiet";
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PMREMGenerator,
  Scene,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
  type Points,
} from "three";
import { glReady, glState } from "@/lib/gl-state";
import { ScrollTrigger } from "@/lib/gsap";
import {
  bracesGeometry,
  chrome,
  cursorGeometry,
  glass,
  tagGeometry,
  terminalGeometry,
} from "./code-icons";
import { portraitCols, portraitGeometry, portraitMaterial } from "./portrait-dots";
import type { Tier } from "./quality";

/**
 * The site's 3D layer, one canvas, two casts:
 *   • in the hero, four code symbols (</>, { }, >_ and a pointer) in blue
 *     glass and silver chrome, one at each corner of the framed portrait;
 *   • below the hero, one glossy chrome tube reshapes itself section by
 *     section (knot → infinity → coil → crown), behind the content.
 * Both lean toward the cursor; dragging on the hero spins them.
 *
 * Perspective camera, normal blending. The canvas sits behind the page, and moves in front of it
 * (html[data-object-front]) only while the hero symbols are out.
 * The four shapes are morph targets of a single tube with identical vertex
 * counts, so changing shape is a weighted blend on the GPU, not a rebuild.
 */

type Props = { tier: Tier };
type CanvasProps = Props & {
  /** The GPU context was lost: drop the 3D layer. */
  onLost: () => void;
};

const SHAPES = 4;

/** Closed curves, all sampled to the same number of points. */
function curvePoints(shape: number, count: number) {
  const points: Vector3[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i / count) * Math.PI * 2;
    let x = 0;
    let y = 0;
    let z = 0;
    if (shape === 0) {
      // Trefoil-like torus knot (p = 2, q = 3).
      const r = 1 + 0.42 * Math.cos(3 * t);
      x = r * Math.cos(2 * t);
      y = r * Math.sin(2 * t);
      z = 0.55 * Math.sin(3 * t);
    } else if (shape === 1) {
      // Infinity loop with a twist out of plane.
      const d = 1 + Math.sin(t) ** 2;
      x = (1.55 * Math.cos(t)) / d;
      y = (1.55 * Math.sin(t) * Math.cos(t)) / d;
      z = 0.45 * Math.sin(2 * t);
    } else if (shape === 2) {
      // Coil: a helix wrapped around a ring.
      const r = 1.05 + 0.32 * Math.cos(9 * t);
      x = r * Math.cos(t);
      y = r * Math.sin(t);
      z = 0.32 * Math.sin(9 * t);
    } else {
      // Crown: a ring that waves up and down.
      x = 1.2 * Math.cos(t);
      y = 1.2 * Math.sin(t) * 0.42 + 0.14 * Math.sin(5 * t);
      z = 1.2 * Math.sin(t) * 0.9;
      y += 0.28 * Math.cos(5 * t);
    }
    points.push(new Vector3(x, y, z));
  }
  return points;
}

function buildGeometry(segments: number, radial: number): BufferGeometry {
  const tubes = Array.from({ length: SHAPES }, (_, shape) => {
    const curve = new CatmullRomCurve3(curvePoints(shape, 240), true, "centripetal");
    return new TubeGeometry(curve, segments, 0.15, radial, true);
  });
  const base = tubes[0];
  base.morphAttributes.position = tubes.slice(1).map((tube) => tube.getAttribute("position"));
  base.morphAttributes.normal = tubes.slice(1).map((tube) => tube.getAttribute("normal"));
  tubes.slice(1).forEach((tube) => tube.dispose());
  base.computeBoundingSphere();
  return base;
}

/**
 * A tiny studio for reflections: a dark room, white softboxes, one warm
 * ember gel, so chrome reads silver with a hot edge. Rendered once into a
 * prefiltered environment map.
 */
function useStudio() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const studio = new Scene();
    studio.background = new Color("#0a0a0a");
    const box = new BoxGeometry(1, 1, 1);
    const panel = (color: string, strength: number, position: [number, number, number], scale: [number, number, number]) => {
      const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(strength) });
      const mesh = new Mesh(box, material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      studio.add(mesh);
      return material;
    };
    const materials = [
      panel("#f3efe8", 4.2, [0, 6, 0], [9, 0.2, 5]),
      panel("#ff4d00", 3.2, [-6, 1, 1], [0.2, 5, 4]),
      panel("#d9d4cc", 2.6, [6, 1.5, -1], [0.2, 3, 5]),
      panel("#f3efe8", 1.6, [0, -4, 3], [7, 0.2, 2]),
      // A soft fill from the camera's side, so faces turned to the viewer
      // (the flat fronts of the symbols) catch light instead of the room.
      panel("#efe9e0", 1.3, [0, 0.5, 7], [7, 4, 0.2]),
      // Rim from behind, so silhouettes read against the dark page.
      panel("#f3efe8", 2.4, [0, 1, -6], [10, 1.2, 0.2]),
    ];
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(studio, 0.035);
    scene.environment = target.texture;

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      box.dispose();
      materials.forEach((material) => material.dispose());
    };
  }, [gl, scene]);
}

/**
 * Shared by both casts: spin from drags and taps, pointer, icon life.
 * `extra` is only the spin added by drags (the sculpture's idle turn left
 * out); the hero symbols use it and settle back to facing front.
 */
const motion = { spin: 0, vel: 0.22, extra: 0, px: 0, py: 0, cx: -1e4, cy: -1e4, iconsAlive: false, portraitAlive: false, time: 0 };

function damp(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function Sculpture({ tier }: Props) {
  useStudio();
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const viewport = useThree((state) => state.viewport);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const live = useRef({ o: 0, x: 0.3, y: 0, s: 0.6, m: 0, rx: 0, ry: 0 });
  const shown = useRef(false);

  const geometry = useMemo(
    () => (tier.name === "high" ? buildGeometry(720, 28) : buildGeometry(420, 18)),
    [tier.name],
  );
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: "#151515",
        metalness: 0.92,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        iridescence: 0.35,
        iridescenceIOR: 1.35,
        envMapIntensity: 1.9,
        transparent: true,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Pointer, read by the loop. Fine pointers only.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (event: PointerEvent) => {
      motion.px = (event.clientX / window.innerWidth) * 2 - 1;
      motion.py = (event.clientY / window.innerHeight) * 2 - 1;
      motion.cx = event.clientX;
      motion.cy = event.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Drag (or flick) on the hero to spin everything; a tap gives a push.
  useEffect(() => {
    let dragging = false;
    let lastX = 0;
    let moved = 0;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-hero]") || target.closest("a, button")) return;
      dragging = true;
      moved = 0;
      lastX = event.clientX;
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      lastX = event.clientX;
      moved += Math.abs(dx);
      motion.vel += dx * 0.012;
    };
    const onUp = () => {
      if (dragging && moved < 4) motion.vel += 4;
      dragging = false;
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      glReady.set(false);
    };
  }, []);

  // Choreography changes wake the loop; it sleeps again once hidden.
  useEffect(() => {
    const wake = () => setFrameloop("always");
    window.addEventListener("object-target", wake);
    return () => window.removeEventListener("object-target", wake);
  }, [setFrameloop]);

  useFrame((_, delta) => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const dt = Math.min(delta, 0.05);
    const target = glState.object;
    const s = live.current;

    // Spin: eases back to a slow idle after a drag or a push.
    motion.time += dt;
    motion.vel = damp(motion.vel, 0.22, 0.9, dt);
    motion.spin += dt * motion.vel;
    const push = motion.vel - 0.22;
    motion.extra += dt * push;
    if (Math.abs(push) < 0.08) {
      const rest = Math.round(motion.extra / (Math.PI * 2)) * Math.PI * 2;
      motion.extra = damp(motion.extra, rest, 1.8, dt);
    }

    s.o = damp(s.o, target.o, 3.2, dt);
    s.x = damp(s.x, target.x, 2.4, dt);
    s.y = damp(s.y, target.y, 2.4, dt);
    s.s = damp(s.s, target.s, 2.4, dt);
    s.m = damp(s.m, target.m, 1.6, dt);

    if (s.o < 0.005 && target.o === 0) {
      g.visible = false;
      // Sleep only once the hero symbols are gone too (and not about to
      // appear: this frame runs before theirs).
      if (!motion.iconsAlive && !motion.portraitAlive && !target.icons) setFrameloop("never");
      return;
    }
    g.visible = true;

    // Morph: blend between the two shapes around the current float index.
    const influences = m.morphTargetInfluences;
    if (influences) {
      const k = Math.min(SHAPES - 1, Math.max(0, s.m));
      const a = Math.floor(k);
      const f = k - a;
      for (let i = 1; i < SHAPES; i += 1) {
        influences[i - 1] = (i === a ? 1 - f : 0) + (i === a + 1 ? f : 0);
      }
    }

    // Idle turn, a kick from scrolling, a lean toward the cursor.
    const spin = motion.spin;
    s.rx = damp(s.rx, motion.py * 0.45, 2, dt);
    s.ry = damp(s.ry, motion.px * 0.6, 2, dt);
    g.rotation.set(0.35 + s.rx + Math.sin(spin * 0.6) * 0.15, spin + s.ry, Math.sin(spin * 0.4) * 0.12);

    const unit = Math.min(viewport.width, viewport.height * 1.2);
    g.position.set(s.x * viewport.width, -s.y * viewport.height + Math.sin(spin * 1.3) * 0.05, 0);
    g.scale.setScalar(s.s * unit * 0.24);
    material.opacity = s.o;

    if (!shown.current && s.o > 0.6) {
      shown.current = true;
      glReady.set(true);
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={mesh} geometry={geometry} material={material} morphTargetInfluences={[0, 0, 0]} />
    </group>
  );
}

/**
 * The hero portrait as particles over the dot still (see portrait-dots.ts).
 * On first draw the dots fly in and assemble while the still fades out;
 * scrolling away scatters them; the cursor pushes them aside.
 */
function PortraitDots() {
  const viewport = useThree((state) => state.viewport);
  // The canvas' own size, not the window's: it is 100lvh tall, so it stays
  // put while a phone's toolbar slides.
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const dpr = useThree((state) => state.viewport.dpr);
  const points = useRef<Points>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const hero = useRef<HTMLElement | null>(null);
  const assemble = useRef(0);
  const scattered = useRef(0);
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const taken = useRef(false);
  const fine = useMemo(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches, []);

  const geometry = useMemo(() => portraitGeometry(), []);
  const material = useMemo(() => portraitMaterial(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      delete document.documentElement.dataset.portraitGl;
      motion.portraitAlive = false;
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    const p = points.current;
    if (!p) return;
    const dt = Math.min(delta, 0.05);
    if (!anchor.current?.isConnected) anchor.current = document.querySelector<HTMLElement>("[data-object-anchor]");
    if (!hero.current?.isConnected) hero.current = document.querySelector<HTMLElement>("[data-hero]");
    const box = anchor.current?.getBoundingClientRect();
    const h = hero.current?.getBoundingClientRect();
    if (!box || !h || box.width === 0) {
      p.visible = false;
      motion.portraitAlive = false;
      return;
    }

    // Scroll: 0 with the hero in place, 1 once most of it has gone.
    const target = Math.min(1, Math.max(0, -h.top / (h.height * 0.75)));
    // Touch screens: the dots ease after the scroll instead of reading it
    // raw. iOS Safari hands the page its scroll position in uneven steps
    // during a swipe, and a spread tied straight to it jumps with them.
    scattered.current = coarse ? damp(scattered.current, target, 10, dt) : target;
    if (Math.abs(scattered.current - target) < 0.002) scattered.current = target;
    const scatter = scattered.current;
    const visible = scatter < 1;
    p.visible = visible;
    motion.portraitAlive = visible;
    if (!visible) return;

    if (!taken.current) {
      taken.current = true;
      document.documentElement.dataset.portraitGl = "on";
    }
    // Assemble over about two seconds, once.
    assemble.current = Math.min(1, assemble.current + dt / 2.1);

    // Relative to the canvas, which is fixed at the top of the screen or
    // (touch, over the hero) scrolls with the page.
    const top = gl.domElement.getBoundingClientRect().top;
    const w = (box.width / size.width) * viewport.width;
    const cx = ((box.left + box.width / 2) / size.width - 0.5) * viewport.width;
    const cy = -((box.top - top + box.height / 2) / size.height - 0.5) * viewport.height;
    p.position.set(cx, cy, 0);
    p.scale.setScalar(w);

    const u = material.uniforms;
    u.uAssemble.value = assemble.current;
    u.uScatter.value = scatter;
    u.uTime.value = motion.time;
    u.uCellPx.value = (box.width / portraitCols) * dpr;
    if (fine) {
      const mx = (motion.cx - (box.left + box.width / 2)) / box.width;
      const my = -(motion.cy - (box.top + box.height / 2)) / box.width;
      u.uMouse.value.set(mx, my);
      const inside = Math.abs(mx) < 0.7 && Math.abs(my) < 0.75;
      u.uMouseOn.value = damp(u.uMouseOn.value, inside ? 1 : 0, 6, dt);
    }
  });

  return <points ref={points} geometry={geometry} material={material} visible={false} frustumCulled={false} />;
}

type IconPart = { geometry: BufferGeometry; material: Material };
type Icon = {
  parts: IconPart[];
  /** Offset from the portrait's centre, in portrait heights; z in world. */
  at: [number, number, number];
  size: number;
  tilt: [number, number, number];
  /** Only on wide screens. */
  wide?: boolean;
};

function easeOutBack(t: number) {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

/**
 * The hero cast: code symbols around the portrait. Each pops in on its own
 * beat, bobs, turns, leans with the cursor (nearer ones more), and spins
 * with drags on the hero. They follow the portrait's box as it scrolls.
 */
function HeroIcons({ tier }: Props) {
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const anchor = useRef<HTMLElement | null>(null);
  const groups = useRef<(Group | null)[]>([]);
  const appear = useRef<number[]>([]);
  const front = useRef(false);
  const shown = useRef(false);

  const icons = useMemo<Icon[]>(() => {
    const rich = tier.name === "high";
    const terminal = terminalGeometry();
    const ember = "#ff4d00";
    // One on each corner of the portrait, mirrored left and right (the top
    // pair in the empty corners above the shoulders): silver chrome, with
    // ember glass for the pointer and the prompt.
    return [
      { parts: [{ geometry: tagGeometry(), material: chrome() }], at: [-0.42, 0.36, 0.4], size: 0.22, tilt: [0.12, 0.38, -0.06] },
      { parts: [{ geometry: bracesGeometry(), material: chrome() }], at: [0.42, 0.36, 0.4], size: 0.2, tilt: [0.12, -0.38, 0.06] },
      {
        parts: [
          { geometry: terminal.body, material: chrome() },
          { geometry: terminal.prompt, material: glass(ember, rich) },
        ],
        at: [0.5, -0.28, 0.4],
        size: 0.21,
        tilt: [-0.12, -0.38, -0.04],
        wide: true,
      },
      { parts: [{ geometry: cursorGeometry(), material: glass(ember, rich) }], at: [-0.5, -0.28, 0.4], size: 0.19, tilt: [-0.12, 0.38, 0.22], wide: true },
    ];
  }, [tier.name]);

  useEffect(
    () => () => {
      icons.forEach((icon) =>
        icon.parts.forEach((part) => {
          part.geometry.dispose();
          part.material.dispose();
        }),
      );
      delete document.documentElement.dataset.objectFront;
    },
    [icons],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const wanted = glState.object.icons;
    if (!anchor.current?.isConnected) anchor.current = document.querySelector<HTMLElement>("[data-object-anchor]");
    const box = anchor.current?.getBoundingClientRect();
    const top = gl.domElement.getBoundingClientRect().top;
    const narrow = window.innerWidth < 768;

    let alive = false;
    icons.forEach((icon, i) => {
      const group = groups.current[i];
      if (!group) return;
      const on = wanted && Boolean(box && box.height > 0) && !(narrow && icon.wide);
      // A staggered entrance: later icons ease in a little slower.
      const a = damp(appear.current[i] ?? 0, on ? 1 : 0, on ? 3.4 - i * 0.35 : 6, dt);
      appear.current[i] = a;
      if (a < 0.004 || !box) {
        group.visible = false;
        return;
      }
      alive = true;
      group.visible = true;

      const h = (box.height / size.height) * viewport.height;
      const cx = ((box.left + box.width / 2) / size.width - 0.5) * viewport.width;
      const cy = -((box.top - top + box.height / 2) / size.height - 0.5) * viewport.height;
      const depth = 0.6 + icon.at[2];
      const t = motion.time + i * 1.7;

      // Keep every symbol inside the viewport on narrow screens.
      const edge = viewport.width / 2 - icon.size * h * 0.55;
      const x = Math.max(-edge, Math.min(edge, cx + icon.at[0] * h));
      group.position.set(
        x + motion.px * depth * 0.06 * h,
        cy + icon.at[1] * h + Math.sin(t * 0.9) * 0.012 * h - motion.py * depth * 0.04 * h,
        icon.at[2],
      );
      // A slow sway and a lean toward the cursor; drags spin them a turn,
      // then they settle facing front again.
      group.rotation.set(
        icon.tilt[0] + Math.sin(t * 0.5) * 0.1 + motion.py * 0.22,
        icon.tilt[1] + Math.sin(t * 0.4) * 0.18 + motion.extra * (i % 2 ? -1 : 1) + motion.px * 0.3,
        icon.tilt[2] + Math.sin(t * 0.3) * 0.05,
      );
      group.scale.setScalar(Math.max(0.0001, icon.size * h * (narrow ? 0.85 : 1) * easeOutBack(Math.min(1, a))));
    });

    motion.iconsAlive = alive || wanted;
    if (alive !== front.current) {
      front.current = alive;
      if (alive) document.documentElement.dataset.objectFront = "on";
      else delete document.documentElement.dataset.objectFront;
    }
    if (alive && !shown.current) {
      shown.current = true;
      glReady.set(true);
    }
  });

  return (
    <>
      {icons.map((icon, i) => (
        <group
          key={i}
          ref={(node) => {
            groups.current[i] = node;
          }}
          visible={false}
        >
          {icon.parts.map((part, j) => (
            <mesh key={j} geometry={part.geometry} material={part.material} />
          ))}
        </group>
      ))}
    </>
  );
}

type Pose = { o: number; x: number; y: number; s: number; m: number; icons?: boolean };

/** Where the sculpture sits in each section (wide screens / narrow). */
const POSES: Record<string, [Pose, Pose]> = {
  hero: [{ o: 0, x: 0.31, y: 0.1, s: 0.8, m: 0, icons: true }, { o: 0, x: 0.18, y: 0.2, s: 0.7, m: 0, icons: true }],
  manifesto: [{ o: 0.85, x: 0.4, y: 0.14, s: 0.62, m: 0 }, { o: 0.6, x: 0.22, y: 0.3, s: 0.6, m: 0 }],
  work: [{ o: 0, x: 0.36, y: 0, s: 0.7, m: 1 }, { o: 0, x: 0.2, y: 0, s: 0.6, m: 1 }],
  about: [{ o: 1, x: 0.36, y: 0.28, s: 0.6, m: 1 }, { o: 0.85, x: 0.22, y: -0.3, s: 0.6, m: 1 }],
  stack: [{ o: 1, x: 0.37, y: -0.16, s: 0.8, m: 2 }, { o: 0.85, x: 0.16, y: -0.3, s: 0.7, m: 2 }],
  contact: [{ o: 1, x: 0.3, y: -0.12, s: 0.95, m: 3 }, { o: 0.9, x: 0.15, y: -0.3, s: 0.75, m: 3 }],
};

/** Section by section, set the pose the sculpture eases toward. */
function useChoreography() {
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 47.99rem)");
    let current = "hero";
    const apply = () => {
      const pose = POSES[current]?.[narrow.matches ? 1 : 0];
      if (!pose) return;
      Object.assign(glState.object, { icons: false }, pose);
      window.dispatchEvent(new Event("object-target"));
    };
    const sections = [
      ["hero", document.querySelector<HTMLElement>("[data-hero]")],
      ...Array.from(document.querySelectorAll<HTMLElement>("[data-object]")).map(
        (el) => [el.dataset.object ?? "", el] as const,
      ),
    ] as const;
    const triggers = sections
      .filter((entry): entry is readonly [string, HTMLElement] => Boolean(entry[1]))
      .map(([name, el]) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 45%",
          onToggle: (self) => {
            if (!self.isActive) return;
            current = name;
            apply();
          },
        }),
      );
    apply();
    narrow.addEventListener("change", apply);
    return () => {
      triggers.forEach((trigger) => trigger.kill());
      narrow.removeEventListener("change", apply);
      Object.assign(glState.object, { o: 0 });
    };
  }, []);
}

/**
 * Compiles every shader before the first frame, off the main thread where
 * the browser can (KHR_parallel_shader_compile), then starts the loop. A
 * synchronous compile on the first frame stalled scrolling on phones. The
 * hero's still holds until the portrait's first frame, so nothing is blank.
 */
function Warmup() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const setFrameloop = useThree((state) => state.setFrameloop);
  useEffect(() => {
    let live = true;
    let cancel = () => {};
    // The first frame uploads every buffer and texture to the GPU: it also
    // waits for a pause in scrolling.
    const start = () => {
      if (live) cancel = whenQuiet(() => setFrameloop("always"), 150);
    };
    gl.compileAsync(scene, camera).then(start, start);
    return () => {
      live = false;
      cancel();
    };
  }, [gl, scene, camera, setFrameloop]);
  return null;
}

/**
 * On touch screens, steps the canvas resolution down (1.5 → 1.25 → 1) if the
 * device cannot hold its frame rate with it, so a slower phone scrolls
 * smoothly instead of dropping frames. Phones that keep up are unchanged.
 */
function AdaptiveDpr() {
  const setDpr = useThree((state) => state.setDpr);
  const gl = useThree((state) => state.gl);
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const sample = useRef({ total: 0, frames: 0, hold: 0 });
  useFrame((_, delta) => {
    if (!coarse) return;
    const s = sample.current;
    // Skip gaps (a sleeping loop, a hidden tab): they are not frame time.
    if (delta > 0.1) return;
    if (s.hold > 0) {
      s.hold -= delta;
      return;
    }
    s.total += delta;
    s.frames += 1;
    if (s.frames < 90) return;
    const average = s.total / s.frames;
    s.total = 0;
    s.frames = 0;
    const dpr = gl.getPixelRatio();
    if (average > 0.021 && dpr > 1) {
      setDpr(Math.max(1, Math.round((dpr - 0.25) * 100) / 100));
      s.hold = 1.5;
    }
  });
  return null;
}

/**
 * Touch screens: while the hero portrait is in view, the 3D layer scrolls with the
 * page (html[data-gl-scroll="page"], absolute at the top, as tall as the
 * hero) so the portrait moves with it on the compositor. Past the hero it
 * goes back to fixed for the sculpture's tour of the sections.
 */
function useScrollWithPage() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) return;
    const root = document.documentElement;
    const measure = () =>
      root.style.setProperty("--gl-page-h", `${hero.offsetTop + hero.offsetHeight}px`);
    measure();
    // Keyed to the portrait, not the whole hero: it leaves the screen
    // before the sculpture fades in for the next section, so the switch
    // back to fixed happens while nothing in the layer is on screen.
    const portrait = hero.querySelector<HTMLElement>("[data-object-anchor]") ?? hero;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) root.dataset.glScroll = "page";
      else delete root.dataset.glScroll;
    });
    observer.observe(portrait);
    const resize = new ResizeObserver(measure);
    resize.observe(hero);
    return () => {
      observer.disconnect();
      resize.disconnect();
      delete root.dataset.glScroll;
      root.style.removeProperty("--gl-page-h");
    };
  }, []);
}

function Choreography() {
  useChoreography();
  useScrollWithPage();
  return null;
}

/**
 * Counts up to `steps`, one step per pause in scrolling. Building the whole
 * scene at once is one long task that stalls a touch scroll; piece by piece
 * it fits in the gaps. Nothing renders until the last step, so the
 * finished scene appears as before.
 */
function useStaged(steps: number) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps) return;
    return whenQuiet(() => setStage((s) => s + 1), 150);
  }, [stage, steps]);
  return stage;
}

export default function ObjectCanvas({ tier, onLost }: CanvasProps) {
  const stage = useStaged(4);
  // Leaving the page disposes the renderer, which also fires
  // "webglcontextlost". That is not a GPU failure: only a loss while this
  // canvas is still mounted turns the 3D layer off.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <div className="object-layer" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 30, near: 0.1, far: 50 }}
        dpr={[1, Math.min(tier.maxDpr, 1.75)]}
        frameloop="never"
        // The canvas is fixed: it never needs re-measuring on scroll.
        resize={{ scroll: false }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event) => {
              event.preventDefault();
              if (mounted.current && gl.domElement.isConnected) onLost();
            },
            { once: true },
          );
        }}
      >
        {/* Built one piece per pause in scrolling (see useStaged). */}
        {stage >= 1 && <Sculpture tier={tier} />}
        {stage >= 2 && <PortraitDots />}
        {stage >= 3 && <HeroIcons tier={tier} />}
        {stage >= 4 && <Warmup />}
        <AdaptiveDpr />
      </Canvas>
      <Choreography />
    </div>
  );
}
