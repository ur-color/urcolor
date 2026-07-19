/**
 * Color interpolation and mixing (CSS `color-mix()` semantics). Colors are
 * interpolated in a chosen space with premultiplied alpha; the hue channel of
 * polar spaces follows a selectable arc.
 */

import { convert } from "./convert";
import { hueIndexOf } from "./registry";
import type { ColorObject, Coords, SpaceId } from "./types";

/** How to interpolate the hue channel of a polar space. */
export type HueMethod = "shorter" | "longer" | "increasing" | "decreasing";

export interface InterpolateOptions {
  /** Working space for the interpolation (default `oklab`). */
  space?: SpaceId | undefined;
  /** Hue arc for polar spaces (default `shorter`). */
  hue?: HueMethod | undefined;
}

/** Adjust `h2` relative to `h1` per the chosen hue method (both in degrees). */
function fixHue(h1: number, h2: number, method: HueMethod): number {
  const d = (((h2 - h1) % 360) + 360) % 360; // 0..360
  switch (method) {
    case "increasing":
      return h1 + d;
    case "decreasing":
      return h1 + d - 360;
    case "longer":
      return d < 180 && d !== 0 ? h1 + d - 360 : h1 + d;
    default: // shorter
      return d > 180 ? h1 + d - 360 : h1 + d;
  }
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Build an interpolator between `a` and `b`. The returned function maps
 * `t` in `[0,1]` to a color in the working space.
 */
export function interpolate(
  a: ColorObject,
  b: ColorObject,
  options: InterpolateOptions = {},
): (t: number) => ColorObject {
  const space = options.space ?? "oklab";
  const ca = convert(a, space);
  const cb = convert(b, space);
  const hueIdx = hueIndexOf(space);
  const ac = ca.coords;
  const bc = cb.coords;
  const h1 = hueIdx >= 0 ? (ac[hueIdx] as number) : 0;
  const h2 = hueIdx >= 0 ? fixHue(h1, bc[hueIdx] as number, options.hue ?? "shorter") : 0;

  return (t: number): ColorObject => {
    const alpha = lerp(ca.alpha, cb.alpha, t);
    const coords = [0, 0, 0] as Coords;
    for (let i = 0; i < 3; i++) {
      if (i === hueIdx) {
        coords[i] = lerp(h1, h2, t);
      } else {
        // Premultiplied-alpha interpolation for color channels.
        const pa = (ac[i] as number) * ca.alpha;
        const pb = (bc[i] as number) * cb.alpha;
        const p = lerp(pa, pb, t);
        coords[i] = alpha === 0 ? 0 : p / alpha;
      }
    }
    return { space, coords, alpha };
  };
}

export interface MixOptions extends InterpolateOptions {}

/** Mix two colors by `amount` (0 = all `a`, 1 = all `b`; default 0.5). */
export function mix(a: ColorObject, b: ColorObject, amount = 0.5, options: MixOptions = {}): ColorObject {
  return interpolate(a, b, options)(amount);
}
