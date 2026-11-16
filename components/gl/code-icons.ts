import {
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  MeshPhysicalMaterial,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Code symbols modelled in code, no font or model files: </>, { }, a
 * pointer and a terminal prompt >_. Every geometry is
 * centred and about one unit tall, so the scene scales them uniformly.
 */

const EXTRUDE = {
  depth: 0.2,
  bevelEnabled: true,
  bevelThickness: 0.06,
  bevelSize: 0.05,
  bevelSegments: 5,
  curveSegments: 20,
};

/** A pill shape (a stroke with round ends), centred, along x. */
function capsule(length: number, radius: number) {
  const half = length / 2;
  const shape = new Shape();
  shape.moveTo(-half, -radius);
  shape.lineTo(half, -radius);
  shape.absarc(half, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-half, radius);
  shape.absarc(-half, 0, radius, Math.PI / 2, (Math.PI * 3) / 2, false);
  return shape;
}

/** One stroke from a to b, extruded. */
function stroke(a: [number, number], b: [number, number], radius = 0.1) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const geometry = new ExtrudeGeometry(capsule(Math.hypot(dx, dy), radius), EXTRUDE);
  geometry.rotateZ(Math.atan2(dy, dx));
  geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0);
  return geometry;
}

function finish(geometry: BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new Vector3();
  const centre = new Vector3();
  box.getSize(size);
  box.getCenter(centre);
  geometry.translate(-centre.x, -centre.y, -centre.z);
  const s = 1 / Math.max(size.x, size.y);
  geometry.scale(s, s, s);
  // Normals from the parts are kept: recomputing on merged, non-indexed
  // geometry would flatten the tubes and studs.
  return geometry;
}

function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(
    parts.map((part) => (part.index ? part.toNonIndexed() : part)),
    false,
  );
  parts.forEach((part) => part.dispose());
  return merged;
}

/** </> */
export function tagGeometry() {
  const chevron = (dir: 1 | -1, x: number) => [
    stroke([x - 0.22 * dir, 0], [x + 0.22 * dir, 0.38]),
    stroke([x - 0.22 * dir, 0], [x + 0.22 * dir, -0.38]),
  ];
  return finish(merge([...chevron(1, -0.62), stroke([-0.14, -0.48], [0.14, 0.48]), ...chevron(-1, 0.62)]));
}

/** { } as two chrome tubes. */
export function bracesGeometry() {
  const brace = (dir: 1 | -1, x: number) => {
    const points = [
      [0.16, 0.62],
      [0.02, 0.56],
      [-0.02, 0.32],
      [-0.03, 0.12],
      [-0.17, 0],
      [-0.03, -0.12],
      [-0.02, -0.32],
      [0.02, -0.56],
      [0.16, -0.62],
    ].map(([px, py]) => new Vector3(x + px * dir, py, 0));
    const curve = new CatmullRomCurve3(points, false, "centripetal");
    const tube = new TubeGeometry(curve, 96, 0.075, 16, false);
    const capA = new SphereGeometry(0.075, 16, 12).translate(points[0].x, points[0].y, 0);
    const capB = new SphereGeometry(0.075, 16, 12).translate(points[8].x, points[8].y, 0);
    return [tube, capA, capB];
  };
  return finish(merge([...brace(1, -0.36), ...brace(-1, 0.36)]));
}

/** The arrow pointer, as an outline frame. */
export function cursorGeometry() {
  const outline = [
    [0, 0],
    [0, -1.0],
    [0.26, -0.77],
    [0.45, -1.16],
    [0.62, -1.08],
    [0.43, -0.7],
    [0.77, -0.7],
  ].map(([x, y]) => new Vector2(x, y));
  const shape = new Shape(outline);
  const cx = 0.3;
  const cy = -0.62;
  const inner = outline.map((p) => new Vector2(cx + (p.x - cx) * 0.52, cy + (p.y - cy) * 0.52));
  shape.holes.push(new Shape(inner.reverse()));
  return finish(new ExtrudeGeometry(shape, { ...EXTRUDE, depth: 0.16, bevelSegments: 6 }));
}

/** >_ : the prompt, sitting on a terminal slab (two meshes). */
export function terminalGeometry() {
  const w = 1.3;
  const h = 0.95;
  const r = 0.16;
  const slab = new Shape();
  slab.moveTo(-w / 2 + r, -h / 2);
  slab.lineTo(w / 2 - r, -h / 2);
  slab.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  slab.lineTo(w / 2, h / 2 - r);
  slab.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  slab.lineTo(-w / 2 + r, h / 2);
  slab.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  slab.lineTo(-w / 2, -h / 2 + r);
  slab.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const body = new ExtrudeGeometry(slab, { ...EXTRUDE, depth: 0.12 });

  const z = 0.12 + 0.06;
  const prompt = merge([
    stroke([-0.4, 0.18], [-0.16, 0], 0.06),
    stroke([-0.4, -0.18], [-0.16, 0], 0.06),
    stroke([0.0, -0.2], [0.34, -0.2], 0.06),
  ]);
  prompt.translate(0, 0, z);

  // Same normalisation for both parts so they stay registered.
  const s = 1 / w;
  body.translate(0, 0, -0.06);
  prompt.translate(0, 0, -0.06);
  body.scale(s, s, s);
  prompt.scale(s, s, s);
  return { body, prompt };
}

/** Clear tinted glass, with only a faint rainbow at the edges. */
export function glass(tint: string, rich: boolean) {
  if (!rich) return holo(tint);
  return new MeshPhysicalMaterial({
    // A touch of the tint in the surface too, so the glass reads as coloured
    // against a black page (there is nothing behind it to refract).
    color: new Color("#ffffff").lerp(new Color(tint), 0.35),
    transmission: 1,
    thickness: 0.9,
    roughness: 0.05,
    ior: 1.5,
    dispersion: 1.2,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [150, 600],
    attenuationColor: tint,
    attenuationDistance: 0.22,
    emissive: tint,
    emissiveIntensity: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.8,
  });
}

/** Tinted mirror metal: the cheaper stand-in for glass on lighter tiers. */
export function holo(tint: string) {
  return new MeshPhysicalMaterial({
    color: tint,
    metalness: 1,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 2,
  });
}

/** Polished silver, cool-toned to sit with the blue glass. */
export function chrome() {
  return new MeshPhysicalMaterial({
    color: "#eef2fb",
    metalness: 1,
    roughness: 0.18,
    iridescence: 0.2,
    iridescenceIOR: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 2.6,
  });
}
