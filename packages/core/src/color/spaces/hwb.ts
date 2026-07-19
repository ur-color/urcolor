/**
 * HWB — hue plus whiteness/blackness. Coords are `[h(deg), w, b]` with `w`/`b`
 * in `0..1`. Built on the HSL hue geometry; converts to the XYZ hub via sRGB.
 */

import { alphaSuffix, num, parseFn, parseHue } from "../components";
import type { ColorObject, Coords } from "../types";
import { hslToSrgb } from "./hsl";
import { srgbFromXyz, srgbToXyz } from "./xyz";

/** HWB `[h,w,b]` -> gamma sRGB `[r,g,b]`. */
export function hwbToSrgb([h, w, b]: Coords): Coords {
  if (w + b >= 1) {
    const gray = w / (w + b);
    return [gray, gray, gray];
  }
  const base = hslToSrgb([h, 1, 0.5]);
  const scale = 1 - w - b;
  return [base[0] * scale + w, base[1] * scale + w, base[2] * scale + w];
}

/** Gamma sRGB `[r,g,b]` -> HWB `[h,w,b]`. */
export function srgbToHwb([r, g, b]: Coords): Coords {
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
  return [h, min, 1 - max];
}

/** HWB coords -> XYZ (D65). */
export function hwbToXyz(coords: Coords): Coords {
  return srgbToXyz(hwbToSrgb(coords));
}

/** XYZ (D65) -> HWB coords. */
export function hwbFromXyz(xyz: Coords): Coords {
  return srgbToHwb(srgbFromXyz(xyz));
}

/** Whiteness/blackness token -> `0..1`. */
const wb = (token: string): number => (token === "none" ? 0 : Number.parseFloat(token) / 100);

/** Parse `hwb()`. */
export function parseHwb(input: string): ColorObject | null {
  const c = parseFn(input, "hwb");
  if (!c || c.args.length < 3) return null;
  const [h = "", w = "", b = ""] = c.args;
  const coords: Coords = [parseHue(h), wb(w), wb(b)];
  return { space: "hwb", coords, alpha: c.alpha ?? 1 };
}

/** Serialise an HWB color to `hwb(h w% b% [/ a])`. */
export function serializeHwb(color: ColorObject): string {
  const [h, w, b] = color.coords;
  return `hwb(${num(h)} ${num(w * 100)}% ${num(b * 100)}%${alphaSuffix(color.alpha)})`;
}
