/**
 * Contrast metrics. `wcag21` is the WCAG 2.x contrast ratio (`1..21`, symmetric).
 * `apca` is the APCA 0.1.9 lightness contrast (`Lc`, signed, order-sensitive:
 * the first color is the *text*, the second the *background*).
 */

import { convert } from "./convert";
import { linearizeSrgb } from "./spaces/xyz";
import type { ColorObject } from "./types";

export type ContrastAlgorithm = "wcag21" | "apca";

export interface ContrastOptions {
  algorithm?: ContrastAlgorithm;
}

/** WCAG relative luminance of a color (from linear sRGB). */
function relativeLuminance(color: ColorObject): number {
  const [r, g, b] = convert(color, "srgb").coords;
  return 0.2126 * linearizeSrgb(r) + 0.7152 * linearizeSrgb(g) + 0.0722 * linearizeSrgb(b);
}

/** WCAG 2.x contrast ratio in `[1, 21]`. */
function wcag21(a: ColorObject, b: ColorObject): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// APCA 0.1.9 constants.
const APCA = {
  mainTRC: 2.4,
  Rco: 0.2126729,
  Gco: 0.7151522,
  Bco: 0.072175,
  Sthresh: 0.022,
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: APCA spec constant, not SQRT2.
  Sexp: 1.414,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  scale: 1.14,
  loClip: 0.1,
  deltaYmin: 0.0005,
  loBoWoffset: 0.027,
} as const;

/** APCA screen luminance (`Ys`) of a color. */
function apcaY(color: ColorObject): number {
  const [r, g, b] = convert(color, "srgb").coords;
  let y = APCA.Rco * r ** APCA.mainTRC + APCA.Gco * g ** APCA.mainTRC + APCA.Bco * b ** APCA.mainTRC;
  if (y < APCA.Sthresh) y += (APCA.Sthresh - y) ** APCA.Sexp;
  return y;
}

/** APCA `Lc` contrast of `text` on `background` (signed). */
function apca(text: ColorObject, background: ColorObject): number {
  const yTxt = apcaY(text);
  const yBg = apcaY(background);
  if (Math.abs(yBg - yTxt) < APCA.deltaYmin) return 0;

  let sapc: number;
  let offset: number;
  if (yBg > yTxt) {
    // Normal polarity: dark text on light background.
    sapc = (yBg ** APCA.normBG - yTxt ** APCA.normTXT) * APCA.scale;
    offset = APCA.loBoWoffset;
    return sapc < APCA.loClip ? 0 : (sapc - offset) * 100;
  }
  // Reverse polarity: light text on dark background.
  sapc = (yBg ** APCA.revBG - yTxt ** APCA.revTXT) * APCA.scale;
  offset = APCA.loBoWoffset;
  return sapc > -APCA.loClip ? 0 : (sapc + offset) * 100;
}

/** Contrast between two colors. Defaults to the WCAG 2.1 ratio. */
export function contrast(a: ColorObject, b: ColorObject, options: ContrastOptions = {}): number {
  return (options.algorithm ?? "wcag21") === "apca" ? apca(a, b) : wcag21(a, b);
}
