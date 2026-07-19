/**
 * sRGB — the default web color space. Coordinates are gamma-encoded `r,g,b` in
 * `0..1`. This module owns the sRGB *serialisations* (`#hex`, `rgb()`/`rgba()`);
 * the XYZ conversion (linearisation + primaries matrix) lives in
 * {@link ./xyz.ts} and is attached to the registry there.
 */

import { alphaSuffix, parseAlpha, parseFn } from "../components";
import type { ColorObject, Coords } from "../types";

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const toByte = (n: number): number => Math.round(clamp01(n) * 255);
const hex2 = (n: number): string => n.toString(16).padStart(2, "0");

/** Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`. Returns `null` if not hex. */
export function parseHex(input: string): ColorObject | null {
  const s = input.trim();
  if (s[0] !== "#") return null;
  const h = s.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(h)) return null;

  let r: number;
  let g: number;
  let b: number;
  let a = 1;
  if (h.length === 3 || h.length === 4) {
    // Expand each nibble to a byte (`f` -> `ff`).
    r = Number.parseInt(h.charAt(0).repeat(2), 16);
    g = Number.parseInt(h.charAt(1).repeat(2), 16);
    b = Number.parseInt(h.charAt(2).repeat(2), 16);
    if (h.length === 4) a = Number.parseInt(h.charAt(3).repeat(2), 16) / 255;
  } else if (h.length === 6 || h.length === 8) {
    r = Number.parseInt(h.slice(0, 2), 16);
    g = Number.parseInt(h.slice(2, 4), 16);
    b = Number.parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = Number.parseInt(h.slice(6, 8), 16) / 255;
  } else {
    return null;
  }
  return { space: "srgb", coords: [r / 255, g / 255, b / 255], alpha: a };
}

/** Serialise an sRGB color to `#rrggbb` (or `#rrggbbaa` when `alpha < 1`). */
export function serializeHex(color: ColorObject): string {
  const [r, g, b] = color.coords;
  let out = `#${hex2(toByte(r))}${hex2(toByte(g))}${hex2(toByte(b))}`;
  if (color.alpha < 1) out += hex2(toByte(color.alpha));
  return out;
}

/** Parse one `rgb()`/`rgba()` channel token to `0..1` (`none` -> 0). */
function channel(token: string): number {
  if (token === "none") return 0;
  if (token.endsWith("%")) return Number.parseFloat(token) / 100;
  return Number.parseFloat(token) / 255;
}

/** Parse `rgb()` / `rgba()` in legacy (comma) or modern (space + `/`) syntax. */
export function parseRgb(input: string): ColorObject | null {
  const c = parseFn(input, "rgba?");
  if (!c || c.args.length < 3) return null;
  const [r = "", g = "", b = "", a] = c.args;
  const coords: Coords = [channel(r), channel(g), channel(b)];
  // Modern `/ a`, else legacy 4th positional token.
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space: "srgb", coords, alpha };
}

/** Serialise an sRGB color to modern `rgb(r g b)` / `rgb(r g b / a)`. */
export function serializeRgb(color: ColorObject): string {
  const [r, g, b] = color.coords;
  return `rgb(${toByte(r)} ${toByte(g)} ${toByte(b)}${alphaSuffix(color.alpha)})`;
}
