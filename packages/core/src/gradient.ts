import "internationalized-color/css";
import { Color } from "internationalized-color";
import { barycentricCoords, type Point } from "./geometry";

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
  const rgb = color.to("rgb");
  if (!rgb) throw new Error(`Cannot convert ${color.mode} to rgb`);
  return [
    rgb.get("r", 0),
    rgb.get("g", 0),
    rgb.get("b", 0),
    alpha ? (rgb.alpha ?? 1) : 1,
  ];
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
export function interpolateStops(colors: Color[], steps: number, space: string): Color[] {
  if (colors.length < 2) return [...colors];
  const result: Color[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segment = t * (colors.length - 1);
    const idx = Math.min(Math.floor(segment), colors.length - 2);
    const localT = segment - idx;
    const a = colors[idx]!;
    const b = colors[idx + 1]!;
    const mixed = a.mix(b, localT, space);
    if (mixed) {
      const rgb = mixed.to("rgb");
      result.push(rgb ?? mixed);
    }
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
  space: string,
  alpha = false,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const vy = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const vx = x / (w - 1);
      // Bilinear: mix top-left/top-right, bottom-left/bottom-right, then mix results
      const topMix = tl.mix(tr, vx, space);
      const botMix = bl.mix(br, vx, space);
      if (!topMix || !botMix) continue;
      const final = topMix.mix(botMix, vy, space);
      if (!final) continue;
      const rgb = final.to("rgb");
      if (!rgb) continue;
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
      data[idx + 3] = alpha ? Math.round((rgb.alpha ?? 1) * 255) : 255;
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
  colorSpace: string,
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
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const vy = y / (h - 1);
    const yVal = yMin + vy * (yMax - yMin);
    for (let x = 0; x < w; x++) {
      const vx = x / (w - 1);
      const xVal = xMin + vx * (xMax - xMin);
      const c = baseColor.set({
        mode: colorSpace,
        [xChannel]: xVal,
        [yChannel]: yVal,
      });
      if (!c) continue;
      const rgb = c.to("rgb");
      if (!rgb) continue;
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
      data[idx + 3] = alpha ? Math.round((rgb.alpha ?? 1) * 255) : 255;
    }
  }
  return data;
}

export function sampleTriangleGrid(
  baseColor: Color,
  colorSpace: string,
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
  const data = new Uint8ClampedArray(w * h * 4);
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

      let xVal: number, yVal: number;
      const updates: Record<string, number> = {};

      if (threeChannel) {
        // 3-channel mode: v0→(xMax,yMin,zMin), v1→(xMin,yMax,zMin), v2→(xMin,yMin,zMax)
        xVal = nu2 * xMax + (1 - nu2) * xMin;
        yVal = nv * yMax + (1 - nv) * yMin;
        const zVal = nw * zMax! + (1 - nw) * zMin!;
        updates[xChannel] = xVal;
        updates[yChannel] = yVal;
        updates[zChannel!] = zVal;
      } else {
        // 2-channel mode: v0→(xMax,yMax), v1→(xMin,yMax), v2→(xMin,yMin)
        xVal = nu2 * xMax + nv * xMin + nw * xMin;
        yVal = nu2 * yMax + nv * yMax + nw * yMin;
        updates[xChannel] = xVal;
        updates[yChannel] = yVal;
      }

      const c = baseColor.set({ mode: colorSpace, ...updates });
      if (!c) continue;
      const rgb = c.to("rgb");
      if (!rgb) continue;
      const idx = (py * w + px) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
      data[idx + 3] = alpha ? Math.round((rgb.alpha ?? 1) * 255) : 255;
    }
  }
  return data;
}

export function samplePolarGrid(
  baseColor: Color,
  colorSpace: string,
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
  const data = new Uint8ClampedArray(w * h * 4);
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
      const angleVal = angleMin + angleFrac * (angleMax - angleMin);
      const radiusVal = radiusMin + r * (radiusMax - radiusMin);
      const c = baseColor.set({
        mode: colorSpace,
        [angleChannel]: angleVal,
        [radiusChannel]: radiusVal,
      });
      if (!c) continue;
      const rgb = c.to("rgb");
      if (!rgb) continue;
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
      data[idx + 3] = alpha ? Math.round((rgb.alpha ?? 1) * 255) : 255;
    }
  }
  return data;
}

export function sampleConicRing(
  baseColor: Color,
  colorSpace: string,
  channel: string,
  channelMin: number,
  channelMax: number,
  w: number,
  h: number,
  startAngle = 0,
  alpha = false,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
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
      const val = channelMin + frac * (channelMax - channelMin);
      const c = baseColor.set({ mode: colorSpace, [channel]: val });
      if (!c) continue;
      const rgb = c.to("rgb");
      if (!rgb) continue;
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
      data[idx + 3] = alpha ? Math.round((rgb.alpha ?? 1) * 255) : 255;
    }
  }
  return data;
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
