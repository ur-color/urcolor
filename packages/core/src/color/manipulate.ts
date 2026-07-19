/**
 * Immutable manipulation helpers. Lightness/chroma/hue adjustments happen in
 * Oklch (perceptually even) then convert back to the input's space; `negate`
 * inverts sRGB channels; `alpha` sets opacity. All return a new
 * {@link ColorObject}.
 */

import { convert } from "./convert";
import type { ColorObject } from "./types";

/** Apply `fn` to a color's Oklch coords, returning a color in its own space. */
function inOklch(color: ColorObject, fn: (l: number, c: number, h: number) => [number, number, number]): ColorObject {
  const [l, c, h] = convert(color, "oklch").coords;
  const adjusted: ColorObject = { space: "oklch", coords: fn(l, c, h), alpha: color.alpha };
  return convert(adjusted, color.space);
}

/** Increase Oklch lightness by `amount` (default 0.1), clamped to `0..1`. */
export function lighten(color: ColorObject, amount = 0.1): ColorObject {
  return inOklch(color, (l, c, h) => [Math.min(1, Math.max(0, l + amount)), c, h]);
}

/** Decrease Oklch lightness by `amount`. */
export function darken(color: ColorObject, amount = 0.1): ColorObject {
  return lighten(color, -amount);
}

/** Scale Oklch chroma by `1 + amount` (default 0.1). */
export function saturate(color: ColorObject, amount = 0.1): ColorObject {
  return inOklch(color, (l, c, h) => [l, Math.max(0, c * (1 + amount)), h]);
}

/** Scale Oklch chroma by `1 - amount`. */
export function desaturate(color: ColorObject, amount = 0.1): ColorObject {
  return saturate(color, -amount);
}

/** Rotate the Oklch hue by `degrees`. */
export function rotateHue(color: ColorObject, degrees: number): ColorObject {
  return inOklch(color, (l, c, h) => [l, c, (((h + degrees) % 360) + 360) % 360]);
}

/** The complementary color (hue rotated 180 degrees). */
export function complement(color: ColorObject): ColorObject {
  return rotateHue(color, 180);
}

/** Invert the sRGB channels, returning an sRGB color (alpha unchanged). */
export function negate(color: ColorObject): ColorObject {
  const [r, g, b] = convert(color, "srgb").coords;
  return { space: "srgb", coords: [1 - r, 1 - g, 1 - b], alpha: color.alpha };
}

/** Return a copy with alpha set to `value` (clamped to `0..1`). */
export function alpha(color: ColorObject, value: number): ColorObject {
  return {
    space: color.space,
    coords: [color.coords[0], color.coords[1], color.coords[2]],
    alpha: Math.min(1, Math.max(0, value)),
  };
}
