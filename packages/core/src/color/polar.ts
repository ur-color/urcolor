/**
 * Rectangular <-> polar conversion shared by Lab/LCH and Oklab/Oklch. The
 * rectangular form is `[L, a, b]`; the polar form is `[L, C, H(deg)]` where
 * `C = hypot(a, b)` and `H = atan2(b, a)`.
 */

import type { Coords } from "./types";

/** `[L, a, b]` -> `[L, C, H(deg)]`. Achromatic colors get `H = 0`. */
export function toPolar([l, a, b]: Coords): Coords {
  const c = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Collapse hue to 0 when there is no chroma (avoids -0 / NaN noise).
  return [l, c, c < 1e-8 ? 0 : h];
}

/** `[L, C, H(deg)]` -> `[L, a, b]`. */
export function fromPolar([l, c, h]: Coords): Coords {
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}
