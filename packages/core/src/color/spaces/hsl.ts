/**
 * HSL — a cylindrical re-encoding of gamma sRGB. Coords are `[h(deg), s, l]`
 * with `s`/`l` in `0..1`. Converts to the XYZ hub via sRGB.
 */

import { alphaSuffix, num, parseAlpha, parseFn, parseHue } from "../components";
import type { ColorObject, Coords } from "../types";
import { srgbFromXyz, srgbToXyz } from "./xyz";

/** HSL `[h,s,l]` -> gamma sRGB `[r,g,b]`. */
export function hslToSrgb([h, s, l]: Coords): Coords {
  const hue = ((h % 360) + 360) % 360;
  const f = (n: number): number => {
    const k = (n + hue / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/** Gamma sRGB `[r,g,b]` -> HSL `[h,s,l]`. */
export function srgbToHsl([r, g, b]: Coords): Coords {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

/** HSL coords -> XYZ (D65). */
export function hslToXyz(coords: Coords): Coords {
  return srgbToXyz(hslToSrgb(coords));
}

/** XYZ (D65) -> HSL coords. */
export function hslFromXyz(xyz: Coords): Coords {
  return srgbToHsl(srgbFromXyz(xyz));
}

/** Saturation/lightness token -> `0..1` (both `%` and bare numbers use 100 = 1). */
const sl = (token: string): number => (token === "none" ? 0 : Number.parseFloat(token) / 100);

/** Parse `hsl()` / `hsla()` in legacy or modern syntax. */
export function parseHsl(input: string): ColorObject | null {
  const c = parseFn(input, "hsla?");
  if (!c || c.args.length < 3) return null;
  const [h = "", s = "", l = "", a] = c.args;
  const coords: Coords = [parseHue(h), sl(s), sl(l)];
  // Modern `/ a`, else legacy 4th positional token.
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space: "hsl", coords, alpha };
}

/** Serialise an HSL color to modern `hsl(h s% l% [/ a])`. */
export function serializeHsl(color: ColorObject): string {
  const [h, s, l] = color.coords;
  return `hsl(${num(h)} ${num(s * 100)}% ${num(l * 100)}%${alphaSuffix(color.alpha)})`;
}
