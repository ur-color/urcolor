import { barycentricCoords, channelIndexOf, Color, convert, interpolate, type ColorObject, type Coords, type Point, type SpaceId } from "@urcolor/core";

/**
 * Shared inner loop for the grid samplers.
 *
 * Every sampler used to run the full object API per pixel: build a patch object
 * with a computed key, `Object.keys` it, resolve the channel by string scan,
 * convert, allocate a `Color`, convert again for sRGB, then resolve `r`/`g`/`b`
 * by three more string scans. All of that is loop-invariant except the channel
 * *values*, so it is hoisted into {@link GridWriter} and done once.
 *
 * The maths is untouched — the same `convert()` runs on the same coordinates,
 * so output is byte-for-byte what the old per-pixel path produced.
 */
class GridWriter {
  readonly data: Uint8ClampedArray;
  /** Working coordinates, mutated in place between pixels. */
  readonly coords: Coords;
  /** Reused conversion input; `convert` only ever reads it. */
  readonly #scratch: ColorObject;
  readonly #alpha: boolean;

  constructor(base: Color, space: SpaceId, w: number, h: number, alpha: boolean) {
    this.data = new Uint8ClampedArray(w * h * 4);
    const src = convert(base.toObject(), space);
    this.coords = src.coords;
    this.#scratch = { space, coords: this.coords, alpha: src.alpha };
    this.#alpha = alpha;
  }

  /** Resolve a channel name against the working space, or throw as `Color.with` would. */
  static channel(space: SpaceId, name: string): number {
    const i = channelIndexOf(space, name);
    if (i < 0) throw new RangeError(`No channel "${name}" in ${space}`);
    return i;
  }

  /** Convert the current coordinates to sRGB and write one RGBA pixel at `i`. */
  write(i: number): void {
    const rgb = convert(this.#scratch, "srgb");
    const c = rgb.coords;
    const d = this.data;
    d[i] = Math.round(Math.max(0, Math.min(1, c[0])) * 255);
    d[i + 1] = Math.round(Math.max(0, Math.min(1, c[1])) * 255);
    d[i + 2] = Math.round(Math.max(0, Math.min(1, c[2])) * 255);
    d[i + 3] = this.#alpha ? Math.round(rgb.alpha * 255) : 255;
  }
}

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 v_uv;
uniform vec4 u_tl; // top-left
uniform vec4 u_tr; // top-right
uniform vec4 u_bl; // bottom-left
uniform vec4 u_br; // bottom-right
uniform int u_mirrorX;
uniform int u_mirrorY;

void main() {
  float ux = u_mirrorX == 1 ? 1.0 - v_uv.x : v_uv.x;
  float uy = u_mirrorY == 1 ? v_uv.y : 1.0 - v_uv.y;
  vec4 top = mix(u_tl, u_tr, ux);
  vec4 bot = mix(u_bl, u_br, ux);
  vec4 c = mix(top, bot, uy);
  gl_FragColor = vec4(c.rgb, c.a);
}
`;

interface GradientProgram {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uTL: WebGLUniformLocation;
  uTR: WebGLUniformLocation;
  uBL: WebGLUniformLocation;
  uBR: WebGLUniformLocation;
  uMirrorX: WebGLUniformLocation;
  uMirrorY: WebGLUniformLocation;
}

function initGL(canvas: HTMLCanvasElement): GradientProgram {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL not supported");

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FRAGMENT_SHADER);
  gl.compileShader(fs);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Full-screen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  return {
    gl,
    program,
    uTL: gl.getUniformLocation(program, "u_tl")!,
    uTR: gl.getUniformLocation(program, "u_tr")!,
    uBL: gl.getUniformLocation(program, "u_bl")!,
    uBR: gl.getUniformLocation(program, "u_br")!,
    uMirrorX: gl.getUniformLocation(program, "u_mirrorX")!,
    uMirrorY: gl.getUniformLocation(program, "u_mirrorY")!,
  };
}

function colorToVec4(color: Color, alpha = false): [number, number, number, number] {
  const rgb = color.to("srgb");
  return [rgb.get("r"), rgb.get("g"), rgb.get("b"), alpha ? rgb.alpha : 1];
}

const LINEAR_FRAGMENT_SHADER = `
precision highp float;
varying vec2 v_uv;

const int MAX_STOPS = 16;
uniform vec4 u_colors[MAX_STOPS];
uniform float u_positions[MAX_STOPS];
uniform int u_count;
uniform float u_angle;
uniform int u_mirrorX;
uniform int u_mirrorY;

void main() {
  float ux = u_mirrorX == 1 ? 1.0 - v_uv.x : v_uv.x;
  float uy = u_mirrorY == 1 ? 1.0 - v_uv.y : v_uv.y;
  // Rotate UV around center by angle (in radians)
  vec2 centered = vec2(ux, uy) - 0.5;
  float cosA = cos(u_angle);
  float sinA = sin(u_angle);
  float rotated = centered.x * cosA + centered.y * sinA;
  float t = rotated + 0.5;
  vec4 color = u_colors[0];
  for (int i = 1; i < MAX_STOPS; i++) {
    if (i >= u_count) break;
    if (t >= u_positions[i - 1] && t <= u_positions[i]) {
      float f = (t - u_positions[i - 1]) / (u_positions[i] - u_positions[i - 1]);
      color = mix(u_colors[i - 1], u_colors[i], f);
      break;
    }
    if (t > u_positions[i]) {
      color = u_colors[i];
    }
  }
  gl_FragColor = vec4(color.rgb, color.a);
}
`;

interface LinearGradientProgram {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uColors: WebGLUniformLocation;
  uPositions: WebGLUniformLocation;
  uCount: WebGLUniformLocation;
  uAngle: WebGLUniformLocation;
  uMirrorX: WebGLUniformLocation;
  uMirrorY: WebGLUniformLocation;
}

function initLinearGL(canvas: HTMLCanvasElement): LinearGradientProgram {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL not supported");

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, LINEAR_FRAGMENT_SHADER);
  gl.compileShader(fs);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  return {
    gl,
    program,
    uColors: gl.getUniformLocation(program, "u_colors")!,
    uPositions: gl.getUniformLocation(program, "u_positions")!,
    uCount: gl.getUniformLocation(program, "u_count")!,
    uAngle: gl.getUniformLocation(program, "u_angle")!,
    uMirrorX: gl.getUniformLocation(program, "u_mirrorX")!,
    uMirrorY: gl.getUniformLocation(program, "u_mirrorY")!,
  };
}

const linearCache = new WeakMap<HTMLCanvasElement, LinearGradientProgram>();

/**
 * Draw a smooth linear gradient on a canvas using WebGL.
 *
 * Colors are interpolated in sRGB space on the GPU.
 * All input colors can be in any color space — they are converted to
 * sRGB before being sent to the shader.
 *
 * @param canvas - The target canvas element.
 * @param colors - Array of color stops (2–16 colors).
 * @param angle - Rotation angle in degrees (0 = left-to-right, 90 = top-to-bottom). Values are normalized to 0–360.
 */
export function drawLinearGradient(
  canvas: HTMLCanvasElement,
  colors: Color[],
  angle = 0,
  alpha = false,
  mirrorX = false,
  mirrorY = false,
): void {
  if (colors.length < 2 || colors.length > 16) {
    throw new Error("drawLinearGradient requires 2–16 color stops");
  }

  let prog = linearCache.get(canvas);
  if (!prog) {
    prog = initLinearGL(canvas);
    linearCache.set(canvas, prog);
  }
  const { gl, uColors, uPositions, uCount, uAngle, uMirrorX, uMirrorY } = prog;

  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, w, h);

  const MAX_STOPS = 16;
  const colorData = new Float32Array(MAX_STOPS * 4);
  const posData = new Float32Array(MAX_STOPS);

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (!color) continue;
    const vec = colorToVec4(color, alpha);
    colorData[i * 4] = vec[0];
    colorData[i * 4 + 1] = vec[1];
    colorData[i * 4 + 2] = vec[2];
    colorData[i * 4 + 3] = vec[3];
    posData[i] = i / (colors.length - 1);
  }

  gl.uniform4fv(uColors, colorData);
  gl.uniform1fv(uPositions, posData);
  gl.uniform1i(uCount, colors.length);
  // Normalize angle to 0–360, convert to radians
  const normalizedAngle = ((angle % 360) + 360) % 360;
  gl.uniform1f(uAngle, (normalizedAngle * Math.PI) / 180);
  gl.uniform1i(uMirrorX, mirrorX ? 1 : 0);
  gl.uniform1i(uMirrorY, mirrorY ? 1 : 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/**
 * Interpolate between an array of colors in a given color space,
 * producing `steps` intermediate sRGB Color values.
 */
export function interpolateStops(colors: Color[], steps: number, space: SpaceId): Color[] {
  if (colors.length < 2) return [...colors];
  // One interpolator per segment, not one per step: building it converts both
  // endpoints, and there are only `colors.length - 1` distinct endpoint pairs.
  const segments = colors.slice(0, -1).map((a, i) =>
    interpolate(a.toObject(), colors[i + 1]!.toObject(), { space }));
  const result: Color[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segment = t * (colors.length - 1);
    const idx = Math.min(Math.floor(segment), colors.length - 2);
    const o = convert(segments[idx]!(segment - idx), "srgb");
    result.push(new Color(o.space, o.coords, o.alpha));
  }
  return result;
}

/**
 * Sample a bilinear grid in a target color space, outputting RGBA pixels.
 * The four corner colors are interpolated in `space`, then converted to sRGB.
 */
export function sampleBilinearGrid(
  tl: Color,
  tr: Color,
  bl: Color,
  br: Color,
  w: number,
  h: number,
  space: SpaceId,
  alpha = false,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  // The top and bottom edges depend only on x, so each column's pair of edge
  // colors is computed once for the whole grid rather than once per pixel —
  // w evaluations instead of w × h, and two fewer interpolator builds per pixel.
  const topEdge = interpolate(tl.toObject(), tr.toObject(), { space });
  const botEdge = interpolate(bl.toObject(), br.toObject(), { space });
  const tops: ColorObject[] = [];
  const bots: ColorObject[] = [];
  for (let x = 0; x < w; x++) {
    const vx = x / (w - 1);
    tops.push(topEdge(vx));
    bots.push(botEdge(vx));
  }
  for (let y = 0; y < h; y++) {
    const vy = y / (h - 1);
    for (let x = 0; x < w; x++) {
      // Bilinear: mix top-left/top-right, bottom-left/bottom-right, then mix results
      const rgb = convert(interpolate(tops[x]!, bots[x]!, { space })(vy), "srgb");
      const idx = (y * w + x) * 4;
      const c = rgb.coords;
      data[idx] = Math.round(Math.max(0, Math.min(1, c[0])) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, c[1])) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, c[2])) * 255);
      data[idx + 3] = alpha ? Math.round(rgb.alpha * 255) : 255;
    }
  }
  return data;
}

/**
 * Sample a 2D grid by directly computing color values for each (x, y) position.
 * Unlike sampleBilinearGrid which interpolates 4 corners, this evaluates the
 * actual color at each grid point — essential for cyclic channels like hue.
 */
export function sampleChannelGrid(
  baseColor: Color,
  colorSpace: SpaceId,
  xChannel: string,
  yChannel: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  w: number,
  h: number,
  alpha = false,
): Uint8ClampedArray {
  const grid = new GridWriter(baseColor, colorSpace, w, h, alpha);
  const xi = GridWriter.channel(colorSpace, xChannel);
  const yi = GridWriter.channel(colorSpace, yChannel);
  const coords = grid.coords;
  for (let y = 0; y < h; y++) {
    const vy = y / (h - 1);
    const yVal = yMin + vy * (yMax - yMin);
    for (let x = 0; x < w; x++) {
      const vx = x / (w - 1);
      // Written x-then-y, matching the old `{ [xChannel]: …, [yChannel]: … }`
      // patch: when both name the same channel, y is what survives.
      coords[xi] = xMin + vx * (xMax - xMin);
      coords[yi] = yVal;
      grid.write((y * w + x) * 4);
    }
  }
  return grid.data;
}

export function sampleTriangleGrid(
  baseColor: Color,
  colorSpace: SpaceId,
  xChannel: string,
  yChannel: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  v0: Point,
  v1: Point,
  v2: Point,
  w: number,
  h: number,
  alpha = false,
  zChannel?: string,
  zMin?: number,
  zMax?: number,
): Uint8ClampedArray {
  const threeChannel = zChannel != null && zMin != null && zMax != null;
  const grid = new GridWriter(baseColor, colorSpace, w, h, alpha);
  const xi = GridWriter.channel(colorSpace, xChannel);
  const yi = GridWriter.channel(colorSpace, yChannel);
  const zi = threeChannel ? GridWriter.channel(colorSpace, zChannel) : -1;
  const coords = grid.coords;
  for (let py = 0; py < h; py++) {
    const ny = py / (h - 1);
    for (let px = 0; px < w; px++) {
      const nx = px / (w - 1);
      const { u, v, w: bw } = barycentricCoords(nx, ny, v0, v1, v2);
      const cu = Math.max(0, u);
      const cv = Math.max(0, v);
      const cw = Math.max(0, bw);
      const sum = cu + cv + cw;
      const nu2 = cu / sum;
      const nv = cv / sum;
      const nw = cw / sum;

      if (threeChannel) {
        // 3-channel mode: v0→(xMax,yMin,zMin), v1→(xMin,yMax,zMin), v2→(xMin,yMin,zMax)
        coords[xi] = nu2 * xMax + (1 - nu2) * xMin;
        coords[yi] = nv * yMax + (1 - nv) * yMin;
        coords[zi] = nw * zMax! + (1 - nw) * zMin!;
      } else {
        // 2-channel mode: v0→(xMax,yMax), v1→(xMin,yMax), v2→(xMin,yMin)
        coords[xi] = nu2 * xMax + nv * xMin + nw * xMin;
        coords[yi] = nu2 * yMax + nv * yMax + nw * yMin;
      }

      grid.write((py * w + px) * 4);
    }
  }
  return grid.data;
}

export function samplePolarGrid(
  baseColor: Color,
  colorSpace: SpaceId,
  angleChannel: string,
  radiusChannel: string,
  angleMin: number,
  angleMax: number,
  radiusMin: number,
  radiusMax: number,
  w: number,
  h: number,
  startAngle = 0,
  alpha = false,
): Uint8ClampedArray {
  const grid = new GridWriter(baseColor, colorSpace, w, h, alpha);
  const ai = GridWriter.channel(colorSpace, angleChannel);
  const ri = GridWriter.channel(colorSpace, radiusChannel);
  const coords = grid.coords;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const startRad = (startAngle * Math.PI) / 180;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      let angle = Math.atan2(dx, -dy) - startRad;
      if (angle < 0) angle += 2 * Math.PI;
      const angleFrac = angle / (2 * Math.PI);
      coords[ai] = angleMin + angleFrac * (angleMax - angleMin);
      coords[ri] = radiusMin + r * (radiusMax - radiusMin);
      grid.write((y * w + x) * 4);
    }
  }
  return grid.data;
}

export function sampleConicRing(
  baseColor: Color,
  colorSpace: SpaceId,
  channel: string,
  channelMin: number,
  channelMax: number,
  w: number,
  h: number,
  startAngle = 0,
  alpha = false,
): Uint8ClampedArray {
  const grid = new GridWriter(baseColor, colorSpace, w, h, alpha);
  const ci = GridWriter.channel(colorSpace, channel);
  const coords = grid.coords;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const startRad = (startAngle * Math.PI) / 180;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      let angle = Math.atan2(dx, -dy) - startRad;
      if (angle < 0) angle += 2 * Math.PI;
      const frac = angle / (2 * Math.PI);
      coords[ci] = channelMin + frac * (channelMax - channelMin);
      grid.write((y * w + x) * 4);
    }
  }
  return grid.data;
}

const cache = new WeakMap<HTMLCanvasElement, GradientProgram>();

/**
 * Draw a smooth bilinear gradient on a canvas using WebGL.
 *
 * The four corner colors are interpolated in sRGB space on the GPU.
 * All input colors can be in any color space — they are converted to
 * sRGB before being sent to the shader.
 *
 * The canvas is resized to match its CSS layout size × devicePixelRatio.
 *
 * @param canvas - The target canvas element.
 * @param topLeft - Color for the top-left corner.
 * @param topRight - Color for the top-right corner.
 * @param bottomLeft - Color for the bottom-left corner.
 * @param bottomRight - Color for the bottom-right corner.
 */
export function drawGradient(
  canvas: HTMLCanvasElement,
  topLeft: Color,
  topRight: Color,
  bottomLeft: Color,
  bottomRight: Color,
  alpha = false,
  mirrorX = false,
  mirrorY = false,
): void {
  let prog = cache.get(canvas);
  if (!prog) {
    prog = initGL(canvas);
    cache.set(canvas, prog);
  }
  const { gl, uTL, uTR, uBL, uBR, uMirrorX, uMirrorY } = prog;

  // Match canvas resolution to CSS size
  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, w, h);

  gl.uniform4fv(uTL, colorToVec4(topLeft, alpha));
  gl.uniform4fv(uTR, colorToVec4(topRight, alpha));
  gl.uniform4fv(uBL, colorToVec4(bottomLeft, alpha));
  gl.uniform4fv(uBR, colorToVec4(bottomRight, alpha));
  gl.uniform1i(uMirrorX, mirrorX ? 1 : 0);
  gl.uniform1i(uMirrorY, mirrorY ? 1 : 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
