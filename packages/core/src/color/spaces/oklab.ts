/**
 * Oklab — a perceptual space with better hue linearity than Lab, defined
 * against D65. Coords are `[L(0..1), a, b]`. Conversion is XYZ-D65 -> LMS
 * (cube root) -> Oklab, using Björn Ottosson's matrices.
 */

import { alphaSuffix, num, parseAlpha, parseChannelToken, parseFn } from "../components";
import { type Mat3, mul } from "../matrix";
import { NOTATIONS } from "../notations";
import type { ColorObject, Coords } from "../types";

/** XYZ (D65) -> LMS (cone response). */
const XYZ_TO_LMS: Mat3 = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];

/** LMS -> XYZ (D65). */
const LMS_TO_XYZ: Mat3 = [
  [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
  [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
  [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
];

/** Nonlinear LMS (`l'm's'`) -> Oklab. */
const LMS_TO_OKLAB: Mat3 = [
  [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.42859224204858, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];

/** Oklab -> nonlinear LMS (`l'm's'`). */
const OKLAB_TO_LMS: Mat3 = [
  [1, 0.3963377773761749, 0.2158037573099136],
  [1, -0.1055613458156586, -0.0638541728258133],
  [1, -0.0894841775298119, -1.2914855480194092],
];

/** XYZ (D65) -> Oklab. */
export function oklabFromXyz(xyz: Coords): Coords {
  const lms = mul(XYZ_TO_LMS, xyz);
  return mul(LMS_TO_OKLAB, [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])]);
}

/** Oklab -> XYZ (D65). */
export function oklabToXyz(lab: Coords): Coords {
  const lms = mul(OKLAB_TO_LMS, lab);
  return mul(LMS_TO_XYZ, [lms[0] ** 3, lms[1] ** 3, lms[2] ** 3]);
}

/** Parse `oklab()`. */
export function parseOklab(input: string): ColorObject | null {
  const c = parseFn(input, "oklab");
  if (!c || c.args.length < 3) return null;
  const [l = "", a = "", b = "", alpha] = c.args;
  const ch = NOTATIONS.oklab!.channels;
  const coords: Coords = [
    parseChannelToken(l, ch[0]),
    parseChannelToken(a, ch[1]),
    parseChannelToken(b, ch[2]),
  ];
  return {
    space: "oklab",
    coords,
    alpha: c.alpha ?? (alpha !== undefined ? parseAlpha(alpha) : 1),
  };
}

/** Serialise an Oklab color to `oklab(L a b [/ a])`. */
export function serializeOklab(color: ColorObject): string {
  const [l, a, b] = color.coords;
  return `oklab(${num(l, 5)} ${num(a, 5)} ${num(b, 5)}${alphaSuffix(color.alpha)})`;
}
