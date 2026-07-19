/**
 * Gamut checking and the CSS Color 4 gamut-mapping algorithm: reduce Oklch
 * chroma with a binary search, accepting the first candidate whose clipped
 * version is within the JND (`deltaEOK < 0.02`) of the unclipped one.
 * See https://www.w3.org/TR/css-color-4/#css-gamut-mapping.
 */

import { convert } from "./convert";
import { deltaEOK } from "./deltaE";
import type { OklchColor } from "./tagged";
import type { ColorObject, Coords, SpaceId } from "./types";

/** Bounded RGB destinations whose channels must lie in `0..1`. */
const RGB_GAMUTS = new Set<SpaceId>(["srgb", "srgb-linear", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020"]);

const EPSILON = 1e-6;
const JND = 0.02;

/** Whether `color` fits within `dest`'s gamut (unbounded spaces are always in). */
export function inGamut(color: ColorObject, dest: SpaceId = "srgb"): boolean {
  if (!RGB_GAMUTS.has(dest)) return true;
  const { coords } = color.space === dest ? color : convert(color, dest);
  return coords.every(c => c >= -EPSILON && c <= 1 + EPSILON);
}

/** Clamp each channel of an RGB-gamut color into `0..1`. */
function clip(color: ColorObject, dest: SpaceId): ColorObject {
  const c = convert(color, dest);
  const coords = c.coords.map(v => (v < 0 ? 0 : v > 1 ? 1 : v)) as Coords;
  return { space: dest, coords, alpha: c.alpha };
}

/**
 * Map `color` into `dest`'s gamut, returning an Oklch color. In-gamut colors
 * are returned as their Oklch equivalent unchanged.
 */
export function gamutMap(color: ColorObject, dest: SpaceId = "srgb"): OklchColor {
  const oklch = convert(color, "oklch");
  if (!RGB_GAMUTS.has(dest) || inGamut(oklch, dest)) return oklch;

  const [l, , h] = oklch.coords;
  // Extremes collapse to the gamut's black/white.
  if (l >= 1) return convert({ space: dest, coords: [1, 1, 1], alpha: color.alpha }, "oklch");
  if (l <= 0) return convert({ space: dest, coords: [0, 0, 0], alpha: color.alpha }, "oklch");

  let lo = 0;
  let hi = oklch.coords[1];
  let clipped = clip(oklch, dest);
  while (hi - lo > 2e-4) {
    const c = (lo + hi) / 2;
    const candidate: ColorObject = { space: "oklch", coords: [l, c, h], alpha: color.alpha };
    if (inGamut(candidate, dest)) {
      lo = c;
      continue;
    }
    clipped = clip(candidate, dest);
    if (deltaEOK(clipped, candidate) < JND) return convert(clipped, "oklch");
    hi = c;
  }
  return convert(clipped, "oklch");
}
