/**
 * The work slider's renderer: one full-screen quad in raw WebGL that draws
 * a project's film and, between two projects, a displacement transition
 * (the outgoing film is pushed and scaled away while the next one settles
 * in). The displacement is procedural noise, so there is no texture to load.
 */

const VERTEX = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2 uRes;
uniform vec2 uSizeFrom;
uniform vec2 uSizeTo;
uniform float uProgress;
uniform float uZoom;
uniform float uStrength;
uniform float uScale;
uniform vec3 uInk;
uniform float uDim;
uniform float uFocus;

varying vec2 vUv;

// Cover-fit a texture of size tex into the viewport.
vec2 cover(vec2 uv, vec2 tex, float zoom) {
  float view = uRes.x / uRes.y;
  float ratio = tex.x / tex.y;
  vec2 k = view > ratio ? vec2(1.0, ratio / view) : vec2(view / ratio, 1.0);
  return (uv - 0.5) * k / zoom + 0.5;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec3 sampleMirror(sampler2D tex, vec2 uv) {
  // Mirrored repeat keeps the pushed film from smearing its edge pixels.
  vec2 m = abs(mod(uv + 1.0, 2.0) - 1.0);
  return texture2D(tex, m).rgb;
}

void main() {
  vec2 uv = vUv;
  vec3 color;

  if (uProgress < 0.0005) {
    color = texture2D(uFrom, cover(uv, uSizeFrom, uZoom)).rgb;
  } else {
    float p = uProgress;
    float d = fbm(uv * 3.0);
    d = mix(d, d * (sin(uv.y * 10.0 + p * 6.2832) * 0.5 + 0.5), 0.3);

    float s = 1.0 + p * (1.0 - p) * uScale;
    vec2 a = (cover(uv, uSizeFrom, uZoom) - 0.5) / s + 0.5 + p * d * uStrength * vec2(1.0, 0.5);
    vec2 b = (cover(uv, uSizeTo, uZoom) - 0.5) * s + 0.5 - (1.0 - p) * d * uStrength * vec2(1.0, 0.5);

    color = mix(sampleMirror(uFrom, a), sampleMirror(uTo, b), smoothstep(0.0, 1.0, p));
  }

  // Ink veil so the title reads over any film: darker at the edges, and
  // deeper in a soft band across the middle where the title sits.
  vec2 c = (uv - 0.5) * vec2(1.2, 1.0);
  float edge = smoothstep(0.35, 0.95, length(c));
  float band = 1.0 - smoothstep(0.0, 0.42, length((uv - 0.5) * vec2(0.9, 2.2)));
  color = mix(color, uInk, clamp(uDim + edge * 0.25 + band * uFocus, 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
}`;

export type Media = {
  /** Poster first, then the film once it has frames. */
  image: HTMLImageElement;
  video: HTMLVideoElement;
  texture: WebGLTexture;
  width: number;
  height: number;
  ready: boolean;
};

type Uniforms = Record<string, WebGLUniformLocation | null>;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  }
  return shader;
}

export class SlideRenderer {
  readonly gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private u: Uniforms = {};
  private blank: WebGLTexture;
  private maxDpr: number;
  width = 0;
  height = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    { maxDpr = 2 }: { maxDpr?: number } = {},
  ) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    this.maxDpr = maxDpr;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "program");
    }
    gl.useProgram(program);
    this.program = program;
    for (const name of [
      "uFrom",
      "uTo",
      "uRes",
      "uSizeFrom",
      "uSizeTo",
      "uProgress",
      "uZoom",
      "uStrength",
      "uScale",
      "uInk",
      "uDim",
      "uFocus",
    ]) {
      this.u[name] = gl.getUniformLocation(program, name);
    }

    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.blank = this.texture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([10, 10, 10]));

    gl.uniform1i(this.u.uFrom, 0);
    gl.uniform1i(this.u.uTo, 1);
    gl.uniform3f(this.u.uInk, 10 / 255, 10 / 255, 10 / 255);
    gl.uniform1f(this.u.uStrength, 0.4);
    gl.uniform1f(this.u.uScale, 0.28);
  }

  texture() {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  /** Upload the film's current frame, or the poster until it has one. */
  upload(media: Media) {
    const gl = this.gl;
    const source =
      media.video.readyState >= 2 && media.video.videoWidth > 0 ? media.video : media.image;
    if (source === media.image && !media.image.complete) return;
    if (source === media.image && media.ready) return;
    gl.bindTexture(gl.TEXTURE_2D, media.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    media.ready = true;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const { clientWidth, clientHeight } = this.canvas;
    const w = Math.max(1, Math.round(clientWidth * dpr));
    const h = Math.max(1, Math.round(clientHeight * dpr));
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = clientWidth;
    this.height = clientHeight;
    this.gl.viewport(0, 0, w, h);
  }

  render(from: Media, to: Media, progress: number, zoom: number, dim: number, focus: number) {
    const gl = this.gl;
    const u = this.u;
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, from.ready ? from.texture : this.blank);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, to.ready ? to.texture : this.blank);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uSizeFrom, from.width, from.height);
    gl.uniform2f(u.uSizeTo, to.width, to.height);
    gl.uniform1f(u.uProgress, progress);
    gl.uniform1f(u.uZoom, zoom);
    gl.uniform1f(u.uDim, dim);
    gl.uniform1f(u.uFocus, focus);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose(media: Media[]) {
    const gl = this.gl;
    media.forEach((m) => gl.deleteTexture(m.texture));
    gl.deleteTexture(this.blank);
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
    // No loseContext(): the canvas element outlives a remount (Strict Mode
    // runs effects twice) and a lost context cannot be taken back.
  }
}
