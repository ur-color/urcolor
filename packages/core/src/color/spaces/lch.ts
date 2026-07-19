/**
 * CIE LCH (D50) — the cylindrical form of {@link ./lab.ts}. Coords are
 * `[L(0..100), C, H(deg)]`.
 */

import { alphaSuffix, num, parseAlpha, parseFn, parseHue } from "../components";
import { fromPolar, toPolar } from "../polar";
import type { ColorObject, Coords } from "../types";
import { labFromXyz, labToXyz } from "./lab";

/** Lab -> LCH. */
export const labToLch = toPolar;
/** LCH -> Lab. */
export const lchToLab = fromPolar;

/** LCH coords -> XYZ (D65). */
export function lchToXyz(coords: Coords): Coords {
  return labToXyz(lchToLab(coords));
}

/** XYZ (D65) -> LCH coords. */
export function lchFromXyz(xyz: Coords): Coords {
  return labToLch(labFromXyz(xyz));
}

const lightness = (token: string): number => (token === "none" ? 0 : Number.parseFloat(token));

/** Chroma token -> number (`%` maps 100% -> 150, per CSS Color 4). */
const chroma = (token: string): number => {
  if (token === "none") return 0;
  if (token.endsWith("%")) return (Number.parseFloat(token) / 100) * 150;
  return Number.parseFloat(token);
};

/** Parse `lch()`. */
export function parseLch(input: string): ColorObject | null {
  const c = parseFn(input, "lch");
  if (!c || c.args.length < 3) return null;
  const [l = "", ch = "", h = "", a] = c.args;
  const coords: Coords = [lightness(l), chroma(ch), parseHue(h)];
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space: "lch", coords, alpha };
}

/** Serialise an LCH color to `lch(L C H [/ a])`. */
export function serializeLch(color: ColorObject): string {
  const [l, c, h] = color.coords;
  return `lch(${num(l)} ${num(c)} ${num(h)}${alphaSuffix(color.alpha)})`;
}
