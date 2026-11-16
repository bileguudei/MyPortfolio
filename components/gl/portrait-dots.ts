import {
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  ShaderMaterial,
  Vector2,
} from "three";
import grid from "@/content/portrait-dots.json";

/**
 * The hero portrait as particles. One point per dot of the still
 * (public/portrait/dots.webp, same grid, same sizes), so the particles can
 * take over from the image without a jump.
 *
 * Local space: the portrait is 1 unit wide, centred, y up. Each point has a
 * target (its place in the picture), a scatter offset, a size and a seed.
 *   uAssemble 0 → 1   dots fly in from their offsets and settle (staggered)
 *   uScatter  0 → 1   the page scrolls away: dots drift apart and fade
 *   uMouse            the cursor pushes dots aside and lights them ember
 */

function rand(seed: number) {
  const s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Dots per row: a dot's cell is the portrait's width / this, in pixels. */
export const portraitCols = grid.cols;

export function portraitGeometry() {
  const sizes = Uint8Array.from(atob(grid.sizes), (c) => c.charCodeAt(0));
  const { cols, rows } = grid;
  const height = rows / cols;
  const count = sizes.reduce((n, v) => n + (v ? 1 : 0), 0);

  const position = new Float32Array(count * 3);
  const from = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);

  let k = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const v = sizes[y * cols + x];
      if (!v) continue;
      const i = y * cols + x;
      position[k * 3] = (x + 0.5) / cols - 0.5;
      position[k * 3 + 1] = height / 2 - (y + 0.5) / cols;
      position[k * 3 + 2] = 0;
      // Scatter: outward from the centre, with a random swirl and depth.
      const a = rand(i + 0.1) * Math.PI * 2;
      const r = 0.35 + rand(i + 0.7) * 0.9;
      from[k * 3] = Math.cos(a) * r + position[k * 3] * 0.6;
      from[k * 3 + 1] = Math.sin(a) * r * 0.8 + position[k * 3 + 1] * 0.6;
      from[k * 3 + 2] = (rand(i + 0.3) - 0.5) * 1.6;
      size[k] = v / 255;
      seed[k] = rand(i + 0.9);
      k += 1;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("aFrom", new BufferAttribute(from, 3));
  geometry.setAttribute("aSize", new BufferAttribute(size, 1));
  geometry.setAttribute("aSeed", new BufferAttribute(seed, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

const vertex = /* glsl */ `
  attribute vec3 aFrom;
  attribute float aSize;
  attribute float aSeed;
  uniform float uAssemble;
  uniform float uScatter;
  uniform float uTime;
  uniform float uCellPx;
  uniform vec2 uMouse;
  uniform float uMouseOn;
  varying float vAlpha;
  varying float vHot;

  void main() {
    // Staggered arrival: low seeds land first.
    float p = clamp(uAssemble * 1.55 - aSeed * 0.55, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - p, 3.0);
    vec3 pos = position + aFrom * (1.0 - e);

    // Scrolling away: drift out along the same paths, a little upward.
    float s = uScatter * uScatter;
    pos += aFrom * s * 1.4 + vec3(0.0, s * 0.25, 0.0);

    // Breathing, so the settled picture is never quite still.
    pos.z += sin(uTime * 1.3 + aSeed * 40.0) * 0.006;

    // The cursor pushes dots aside within a small radius.
    vec2 d = pos.xy - uMouse;
    float near = uMouseOn * smoothstep(0.16, 0.0, length(d));
    pos.xy += normalize(d + 1e-5) * near * 0.045;

    vHot = max(near, (1.0 - e) * 0.85);
    vAlpha = smoothstep(0.0, 0.35, e) * (1.0 - s);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, aSize * uCellPx * 0.92 * (1.0 + near * 0.35) * (1.0 - s * 0.5));
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uBone;
  uniform vec3 uEmber;
  varying float vAlpha;
  varying float vHot;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.4, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(uBone, uEmber, vHot), a);
  }
`;

export function portraitMaterial() {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uAssemble: { value: 0 },
      uScatter: { value: 0 },
      uTime: { value: 0 },
      uCellPx: { value: 4 },
      uMouse: { value: new Vector2(9, 9) },
      uMouseOn: { value: 0 },
      uBone: { value: new Color("#edeae4") },
      uEmber: { value: new Color("#ff4d00") },
    },
  });
}
