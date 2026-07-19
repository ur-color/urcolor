/**
 * CIE Lab (D50) — the CSS `lab()` space. Coords are `[L(0..100), a, b]`.
 * Lab is defined against the D50 white, so conversions bridge the XYZ-D65 hub
 * with Bradford adaptation.
 */

import { alphaSuffix, num, parseAlpha, parseFn } from "../components";
import type { ColorObject, Coords } from "../types";
import { adaptD50toD65, adaptD65toD50 } from "./xyz";

// CIE standard constants and the D50 reference white (XYZ).
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;
const D50: Coords = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

const f = (t: number): number => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const fInv = (t: number): number => {
  const t3 = t ** 3;
  return t3 > EPSILON ? t3 : (116 * t - 16) / KAPPA;
};

/** XYZ (D65) -> Lab (D50). */
export function labFromXyz(xyz: Coords): Coords {
  const [x, y, z] = adaptD65toD50(xyz);
  const fx = f(x / D50[0]);
  const fy = f(y / D50[1]);
  const fz = f(z / D50[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Lab (D50) -> XYZ (D65). */
export function labToXyz([l, a, b]: Coords): Coords {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const xyzD50: Coords = [fInv(fx) * D50[0], fInv(fy) * D50[1], fInv(fz) * D50[2]];
  return adaptD50toD65(xyzD50);
}

/** Lightness token -> `0..100` (`50%` and bare `50` both mean 50). */
const lightness = (token: string): number => (token === "none" ? 0 : Number.parseFloat(token));

/** a/b token -> number (`%` maps 100% -> 125, per CSS Color 4). */
const ab = (token: string): number => {
  if (token === "none") return 0;
  if (token.endsWith("%")) return (Number.parseFloat(token) / 100) * 125;
  return Number.parseFloat(token);
};

/** Parse `lab()`. */
export function parseLab(input: string): ColorObject | null {
  const c = parseFn(input, "lab");
  if (!c || c.args.length < 3) return null;
  const [l = "", a = "", b = "", alpha] = c.args;
  const coords: Coords = [lightness(l), ab(a), ab(b)];
  return {
    space: "lab",
    coords,
    alpha: c.alpha ?? (alpha !== undefined ? parseAlpha(alpha) : 1),
  };
}

/** Serialise a Lab color to `lab(L a b [/ a])`. */
export function serializeLab(color: ColorObject): string {
  const [l, a, b] = color.coords;
  return `lab(${num(l)} ${num(a)} ${num(b)}${alphaSuffix(color.alpha)})`;
}
