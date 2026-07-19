/**
 * The XYZ hub. Every space in the library converts to/from **CIE XYZ, D65**;
 * this module holds the sRGB<->XYZ transfer functions and matrices, plus the
 * Bradford chromatic-adaptation matrices between D65 and D50 (used by Lab/LCH
 * and ProPhoto). Matrix values follow the CSS Color 4 sample code / the
 * `colour-science` reference.
 */

import { type Mat3, mul } from "../matrix";
import type { Coords } from "../types";

/** sRGB gamma decode: gamma-encoded `0..1` channel -> linear-light. */
export function linearizeSrgb(c: number): number {
  const abs = Math.abs(c);
  const sign = c < 0 ? -1 : 1;
  return abs <= 0.04045 ? c / 12.92 : sign * ((abs + 0.055) / 1.055) ** 2.4;
}

/** sRGB gamma encode: linear-light channel -> gamma-encoded `0..1`. */
export function delinearizeSrgb(c: number): number {
  const abs = Math.abs(c);
  const sign = c < 0 ? -1 : 1;
  return abs <= 0.0031308 ? 12.92 * c : sign * (1.055 * abs ** (1 / 2.4) - 0.055);
}

/** Linear sRGB -> XYZ (D65). Also reused by the `srgb-linear` space. */
export const LIN_SRGB_TO_XYZ: Mat3 = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];

/** XYZ (D65) -> linear sRGB. */
export const XYZ_TO_LIN_SRGB: Mat3 = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];

/** Bradford D65 -> D50 chromatic adaptation. */
const BRADFORD_D65_TO_D50: Mat3 = [
  [1.0479298208405488, 0.022946793341019088, -0.05019222954313557],
  [0.029627815688159344, 0.990434484573249, -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895, 0.7518742899580008],
];

/** Bradford D50 -> D65 chromatic adaptation. */
const BRADFORD_D50_TO_D65: Mat3 = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];

/** Gamma-encoded sRGB `r,g,b` -> XYZ (D65). */
export function srgbToXyz(rgb: Coords): Coords {
  return mul(LIN_SRGB_TO_XYZ, [linearizeSrgb(rgb[0]), linearizeSrgb(rgb[1]), linearizeSrgb(rgb[2])]);
}

/** XYZ (D65) -> gamma-encoded sRGB `r,g,b`. */
export function srgbFromXyz(xyz: Coords): Coords {
  const lin = mul(XYZ_TO_LIN_SRGB, xyz);
  return [delinearizeSrgb(lin[0]), delinearizeSrgb(lin[1]), delinearizeSrgb(lin[2])];
}

/** Adapt an XYZ tristimulus from the D65 white to the D50 white (Bradford). */
export function adaptD65toD50(xyz: Coords): Coords {
  return mul(BRADFORD_D65_TO_D50, xyz);
}

/** Adapt an XYZ tristimulus from the D50 white to the D65 white (Bradford). */
export function adaptD50toD65(xyz: Coords): Coords {
  return mul(BRADFORD_D50_TO_D65, xyz);
}

/** The XYZ-D65 hub itself — the identity bridge. */
export const xyzD65 = {
  toXyz: (c: Coords): Coords => [c[0], c[1], c[2]],
  fromXyz: (xyz: Coords): Coords => [xyz[0], xyz[1], xyz[2]],
};

/** XYZ-D50, bridged to the D65 hub by Bradford adaptation. */
export const xyzD50 = {
  toXyz: adaptD50toD65,
  fromXyz: adaptD65toD50,
};
