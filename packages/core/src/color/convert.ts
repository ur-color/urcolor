/**
 * Generic space conversion via the XYZ-D65 hub. Every conversion is at most two
 * hops: source `toXyz`, then target `fromXyz`. Alpha is carried through
 * unchanged.
 */

import { copyCoords, spaceDef } from "./registry";
import type { ColorIn } from "./tagged";
import type { ColorObject, SpaceId } from "./types";

/** Convert a color to `target`, returning a new {@link ColorObject} tagged as `ColorIn<S>`. */
export function convert<S extends SpaceId>(color: ColorObject, target: S): ColorIn<S> {
  if (color.space === target) {
    return { space: target, coords: copyCoords(color.coords), alpha: color.alpha };
  }
  const from = spaceDef(color.space);
  const to = spaceDef(target);
  // Fast path: both in the sRGB family -> bridge through gamma sRGB directly.
  if (from.toSrgb && to.fromSrgb) {
    return { space: target, coords: to.fromSrgb(from.toSrgb(color.coords)), alpha: color.alpha };
  }
  return { space: target, coords: to.fromXyz(from.toXyz(color.coords)), alpha: color.alpha };
}
