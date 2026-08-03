/**
 * Shared fixtures and library handles for the benchmark suites.
 *
 * Every suite compares `@urcolor/core` against the color libraries people
 * actually reach for. Where a library cannot express an operation at all it is
 * simply omitted from that group — a missing bar means "not supported", never
 * "too slow to measure".
 *
 * ## Why everything is a pool
 *
 * Benching `f(CONSTANT)` in a hot loop is a trap: once the JIT inlines a small
 * pure function it hoists the call straight out of the loop and the row reports
 * sub-nanosecond times for work that never ran. That is not a hypothetical —
 * an earlier draft of this suite had `tinycolor2.toRgbString()` "running" in
 * 0.17 ps.
 *
 * So every operand is a pool of eight, and each `next*()` call advances a
 * cursor. The extra masked increment costs ~1 ns, every row pays it equally,
 * and nothing is loop-invariant any more.
 */

import { TinyColor, readability as ctrlReadability } from "@ctrl/tinycolor";
import chroma from "chroma-js";
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import labPlugin from "colord/plugins/lab";
import lchPlugin from "colord/plugins/lch";
import mixPlugin from "colord/plugins/mix";
import ColorJS from "colorjs.io";
import * as culori from "culori";
import tinycolor2 from "tinycolor2";
import { Color } from "../src/color/color";
import { contrast } from "../src/color/contrast";
import { convert } from "../src/color/convert";
import { deltaE } from "../src/color/deltaE";
import { interpolate, mix } from "../src/color/interpolate";
import { darken, lighten, rotateHue, saturate } from "../src/color/manipulate";
import { parse, tryParse } from "../src/color/parse";
import { serialize } from "../src/color/serialize";
import type { ColorObject } from "../src/color/types";

extend([mixPlugin, a11yPlugin, labPlugin, lchPlugin]);

export {
  chroma,
  colord,
  ColorJS,
  ctrlReadability,
  culori,
  TinyColor,
  tinycolor2,
};

export {
  Color,
  contrast,
  convert,
  darken,
  deltaE,
  interpolate,
  lighten,
  mix,
  parse,
  rotateHue,
  saturate,
  serialize,
  tryParse,
};
export type { ColorObject };

// --- Pool plumbing ----------------------------------------------------------

/** Pool size. A power of two so the cursor can wrap with a mask. */
const N = 8;
const MASK = N - 1;

/**
 * Build a `next()` accessor over a pool of eight values derived from the eight
 * fixture colors. Each accessor owns its cursor, so libraries never have to
 * agree on an index.
 */
function pool<T>(build: (hex: string, i: number) => T): () => T {
  const items: T[] = [];
  for (let i = 0; i < N; i++) items.push(build(HEX_A[i]!, i));
  let cursor = 0;
  return () => items[(cursor = (cursor + 1) & MASK)]!;
}

// --- Input fixtures ---------------------------------------------------------

/** Eight mid-tone colors, spread around the hue circle. */
const HEX_A = [
  "#3b82f6", "#ef4444", "#22c55e", "#eab308",
  "#a855f7", "#ec4899", "#14b8a6", "#f97316",
] as const;

/** The second operand for the two-color suites — rotated against `HEX_A`. */
const HEX_B = [
  "#ef4444", "#22c55e", "#eab308", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#3b82f6",
] as const;

/** A representative literal per notation, for the docs and for single examples. */
export const INPUT = {
  hex: HEX_A[0],
  hex8: "#3b82f680",
  rgb: "rgb(59 130 246)",
  rgbLegacy: "rgba(59, 130, 246, 0.5)",
  hsl: "hsl(217 91% 60%)",
  named: "rebeccapurple",
  oklch: "oklch(0.62 0.19 260)",
  lab: "lab(54.6 8.6 -66.4)",
  p3: "color(display-p3 0.3 0.5 0.95)",
} as const;

export const OTHER = { hex: HEX_B[0], oklch: "oklch(0.64 0.21 25)" } as const;

/** The ten-swatch batch used by the pipeline suite's theme pass. */
export const SWATCHES = [
  "#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
] as const;

// --- String pools, one per notation ----------------------------------------
// Each color is re-rendered into the notation under test, so the parser sees
// eight genuinely different strings rather than one it can memoize.

const asColor = (hex: string): Color => Color.parse(hex)!;
const notation = (format: Parameters<Color["toString"]>[0]) =>
  pool(hex => asColor(hex).toString(format));

export const nextHex = pool(hex => hex);
export const nextHex8 = pool(hex => `${hex}80`);
export const nextRgb = notation("srgb");
export const nextHsl = notation("hsl");
export const nextOklch = notation("oklch");
export const nextLab = notation("lab");
export const nextP3 = notation("display-p3");
export const nextRgbLegacy = pool((hex) => {
  const [r, g, b] = asColor(hex).coords;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.5)`;
});
export const nextNamed = pool((_, i) =>
  ["rebeccapurple", "tomato", "seagreen", "goldenrod",
    "orchid", "hotpink", "teal", "coral"][i]!);
export const nextInvalid = pool((_, i) => `not-a-color-${i}`);

// --- urcolor ----------------------------------------------------------------

export const nextA = pool(asColor);
export const nextB = pool((_, i) => asColor(HEX_B[i]!));
export const nextAObj = pool((hex): ColorObject => asColor(hex).toObject());
export const nextBObj = pool((_, i): ColorObject => asColor(HEX_B[i]!).toObject());
export const nextAOklch = pool(hex => asColor(hex).to("oklch"));

/** Single stable operands, for the gradient samplers that take a whole surface. */
export const A = asColor(HEX_A[0]);
export const B = asColor(HEX_B[0]);

// --- culori -----------------------------------------------------------------

export const toOklch = culori.converter("oklch");
export const toOklab = culori.converter("oklab");
export const toLab = culori.converter("lab");
export const toHsl = culori.converter("hsl");
export const toRgb = culori.converter("rgb");
export const toP3 = culori.converter("p3");
export const toRec2020 = culori.converter("rec2020");
export const toXyz65 = culori.converter("xyz65");
export const culoriDeltaE2000 = culori.differenceCiede2000();
export const culoriDeltaE76 = culori.differenceEuclidean("lab");
export const culoriDeltaEOk = culori.differenceEuclidean("oklab");

export const nextCuloriA = pool(hex => culori.parse(hex)!);
export const nextCuloriB = pool((_, i) => culori.parse(HEX_B[i]!)!);
export const nextCuloriAOklch = pool(hex => toOklch(hex)!);

/** Stable culori operands for the gradient suite's whole-surface loops. */
export const culoriA = culori.parse(HEX_A[0])!;
export const culoriB = culori.parse(HEX_B[0])!;

// --- chroma-js --------------------------------------------------------------

export const nextChromaA = pool(hex => chroma(hex));
export const nextChromaB = pool((_, i) => chroma(HEX_B[i]!));
/**
 * Oklch coordinate triples for chroma-js.
 *
 * Deliberately *not* a pool of chroma `Color` objects. chroma-js converts to
 * sRGB in its constructor (`_rgb = clip_rgb(...)`), so a pre-built
 * `chroma.oklch(...)` is already an sRGB color and `.rgb()` on it measures a
 * cached array read, not a conversion. Handing the suite raw coordinates keeps
 * the conversion inside the timed region, where the other libraries' is.
 */
export const nextChromaOklchCoords = pool((hex): [number, number, number] => {
  const [l, c, h] = chroma(hex).oklch();
  return [l as number, c as number, h as number];
});

export const chromaA = chroma(HEX_A[0]);
export const chromaB = chroma(HEX_B[0]);

// --- colorjs.io -------------------------------------------------------------

export const nextColorjsA = pool(hex => new ColorJS(hex));
export const nextColorjsB = pool((_, i) => new ColorJS(HEX_B[i]!));
export const nextColorjsAOklch = pool(hex => new ColorJS(hex).to("oklch"));

export const colorjsA = new ColorJS(HEX_A[0]);
export const colorjsB = new ColorJS(HEX_B[0]);

// --- colord / tinycolor2 / @ctrl/tinycolor ---------------------------------

export const nextColordA = pool(hex => colord(hex));
export const nextTinycolor2A = pool(hex => tinycolor2(hex));
export const nextCtrlA = pool(hex => new TinyColor(hex));

export const colordA = colord(HEX_A[0]);
export const ctrlA = new TinyColor(HEX_A[0]);
