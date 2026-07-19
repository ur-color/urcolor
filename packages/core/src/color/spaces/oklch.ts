/**
 * Oklch — the cylindrical form of {@link ./oklab.ts}. Coords are
 * `[L(0..1), C, H(deg)]`. This is the recommended space for perceptual color
 * scales and CSS Color 4 gamut mapping.
 */

import { alphaSuffix, num, parseAlpha, parseChannelToken, parseFn } from "../components";
import { NOTATIONS } from "../notations";
import { fromPolar, toPolar } from "../polar";
import type { ColorObject, Coords } from "../types";
import { oklabFromXyz, oklabToXyz } from "./oklab";

/** Oklab -> Oklch. */
export const oklabToOklch = toPolar;
/** Oklch -> Oklab. */
export const oklchToOklab = fromPolar;

/** Oklch coords -> XYZ (D65). */
export function oklchToXyz(coords: Coords): Coords {
  return oklabToXyz(oklchToOklab(coords));
}

/** XYZ (D65) -> Oklch coords. */
export function oklchFromXyz(xyz: Coords): Coords {
  return oklabToOklch(oklabFromXyz(xyz));
}

/** Parse `oklch()`. */
export function parseOklch(input: string): ColorObject | null {
  const c = parseFn(input, "oklch");
  if (!c || c.args.length < 3) return null;
  const [l = "", ch = "", h = "", a] = c.args;
  const chan = NOTATIONS.oklch!.channels;
  const coords: Coords = [
    parseChannelToken(l, chan[0]),
    parseChannelToken(ch, chan[1]),
    parseChannelToken(h, chan[2]),
  ];
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space: "oklch", coords, alpha };
}

/** Serialise an Oklch color to `oklch(L C H [/ a])`. */
export function serializeOklch(color: ColorObject): string {
  const [l, c, h] = color.coords;
  return `oklch(${num(l, 5)} ${num(c, 5)} ${num(h)}${alphaSuffix(color.alpha)})`;
}
