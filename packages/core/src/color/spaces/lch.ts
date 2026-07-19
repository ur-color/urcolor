/**
 * CIE LCH (D50) — the cylindrical form of {@link ./lab.ts}. Coords are
 * `[L(0..100), C, H(deg)]`.
 */

import { alphaSuffix, num, parseAlpha, parseChannelToken, parseFn } from "../components";
import { NOTATIONS } from "../notations";
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

/** Parse `lch()`. */
export function parseLch(input: string): ColorObject | null {
  const c = parseFn(input, "lch");
  if (!c || c.args.length < 3) return null;
  const [l = "", ch = "", h = "", a] = c.args;
  const chan = NOTATIONS.lch!.channels;
  const coords: Coords = [
    parseChannelToken(l, chan[0]),
    parseChannelToken(ch, chan[1]),
    parseChannelToken(h, chan[2]),
  ];
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space: "lch", coords, alpha };
}

/** Serialise an LCH color to `lch(L C H [/ a])`. */
export function serializeLch(color: ColorObject): string {
  const [l, c, h] = color.coords;
  return `lch(${num(l)} ${num(c)} ${num(h)}${alphaSuffix(color.alpha)})`;
}
