/**
 * HSV — hue, saturation, value. Coords are `[h(deg), s, v]` with `s`/`v` in
 * `0..1`. This is *not* a CSS Color 4 space: it has no CSS notation, so it has
 * no parser and cannot be named as a serialisation format. It exists as a
 * working space for colour pickers. Converts to the XYZ hub via sRGB.
 */

import type { Coords } from "../types";
import { hslToSrgb } from "./hsl";
import { srgbFromXyz, srgbToXyz } from "./xyz";

/** HSV `[h,s,v]` -> gamma sRGB `[r,g,b]`. */
export function hsvToSrgb([h, s, v]: Coords): Coords {
  // Reuse the HSL hue geometry for the fully-saturated base hue, then scale
  // toward `v` and lift by the achromatic floor `v * (1 - s)`.
  const base = hslToSrgb([h, 1, 0.5]);
  const min = v * (1 - s);
  const range = v - min;
  return [base[0] * range + min, base[1] * range + min, base[2] * range + min];
}

/** Gamma sRGB `[r,g,b]` -> HSV `[h,s,v]`. */
export function srgbToHsv([r, g, b]: Coords): Coords {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  // Black has no saturation; guard the division.
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

/** HSV coords -> XYZ (D65). */
export function hsvToXyz(coords: Coords): Coords {
  return srgbToXyz(hsvToSrgb(coords));
}

/** XYZ (D65) -> HSV coords. */
export function hsvFromXyz(xyz: Coords): Coords {
  return srgbToHsv(srgbFromXyz(xyz));
}
