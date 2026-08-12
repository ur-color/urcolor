/**
 * The NCS to sRGB approximation, forward and inverse.
 *
 * NCS Colour AB holds the Natural Colour System as proprietary and publishes
 * no open notation-to-sRGB mapping, so this is an approximation and says so.
 * Anyone matching physical paint needs an official fan deck.
 *
 * NCS describes a colour by blackness `s`, chromaticness `c` and whiteness
 * `w = 100 - s - c`. The model works in **Oklch**, where those three quantities
 * behave close to linearly, rather than in HSV:
 *
 * ```
 * L = L0 - kb*(s/100) - kc*(c/100)
 * C = Cc*(c/100) + Ccb*(c/100)*(s/100) + Ccc*(c/100)^2
 * h = H + hb*(s/100) + hc*(c/100)
 * ```
 *
 * Every coefficient is a function of position on the hue circle, interpolated
 * between {@link KNOT_COUNT} knots. The hue terms `hb` and `hc` exist because a
 * real colour's hue drifts as it darkens and saturates; without them the fit
 * cannot get below about ΔE00 2.4.
 *
 * Three forms were measured against 2,031 published chromatic samples before
 * settling here:
 *
 * | form | mean ΔE00 | over 5 |
 * | --- | --- | --- |
 * | HSV scaling, 4 knots | 4.97 | 845 |
 * | HSV scaling, 16 knots | 3.52 | 409 |
 * | Linear mixture in Oklab | 4.84 | 739 |
 * | **Oklch, 16 knots** | **1.65** | **24** |
 *
 * The linear-mixture form is the one NCS's own definition suggests, a colour
 * being `c%` pure hue plus `w%` white plus `s%` black. It fits worst. NCS's
 * percentages are judgements of perceptual resemblance, not mixing weights.
 */

import { convert, type ColorObject } from "@urcolor/core";
import { ELEMENTARY, type NcsColor, type NcsHue } from "./notation";

/**
 * Knots around the hue circle. Sixteen is where accuracy stops improving
 * materially: 24 knots reaches ΔE00 1.63 against 16's 1.65, which does not pay
 * for 72 more constants.
 */
export const KNOT_COUNT = 16;

/** One full turn of the `t` parameter below. */
const TURN = 400;

const SPAN = TURN / KNOT_COUNT;

/** Per-knot coefficients. See the module docblock for the equations. */
export interface Knot {
  /** Oklch L at blackness 0, chromaticness 0. */
  L0: number;
  /** L lost per unit blackness. */
  kb: number;
  /** L lost per unit chromaticness. */
  kc: number;
  /** Oklch C gained per unit chromaticness. */
  Cc: number;
  /** C correction for chromaticness interacting with blackness. */
  Ccb: number;
  /** C curvature in chromaticness. */
  Ccc: number;
  /** Oklch hue angle, unwrapped. */
  H: number;
  /** Hue drift per unit blackness. */
  hb: number;
  /** Hue drift per unit chromaticness. */
  hc: number;
}

/**
 * Fitted against 2,031 published chromatic samples by `scripts/fit.ts`.
 *
 * Regenerate rather than hand-edit. `test/model.test.ts` pins the resulting
 * error distribution, so an ad-hoc tweak here surfaces as a failing budget.
 */
export const KNOTS: readonly Knot[] = [
  { L0: 1.0000, kb: 0.8000, kc: 0.1531, Cc: 0.4581, Ccb: -0.2088, Ccc: -0.3050, H: 93.702, hb: -20.250, hc: 2.875 },
  { L0: 1.0000, kb: 0.7781, kc: 0.2281, Cc: 0.4413, Ccb: -0.1612, Ccc: -0.2912, H: 80.079, hb: -20.750, hc: -14.750 },
  { L0: 0.9797, kb: 0.7375, kc: 0.2969, Cc: 0.4170, Ccb: -0.1194, Ccc: -0.2456, H: 59.876, hb: -14.000, hc: -14.250 },
  { L0: 1.0031, kb: 0.7828, kc: 0.4000, Cc: 0.3473, Ccb: -0.0606, Ccc: -0.1312, H: 40.781, hb: -7.000, hc: -9.625 },
  { L0: 1.0094, kb: 0.7938, kc: 0.4766, Cc: 0.2744, Ccb: 0.0263, Ccc: -0.0306, H: 20.824, hb: -4.875, hc: -1.625 },
  { L0: 1.0141, kb: 0.8297, kc: 0.4734, Cc: 0.2155, Ccb: 0.1188, Ccc: 0.0581, H: -0.826, hb: -1.625, hc: -0.500 },
  { L0: 1.0094, kb: 0.7984, kc: 0.4812, Cc: 0.1492, Ccb: 0.1306, Ccc: 0.0925, H: 318.027, hb: -0.375, hc: 9.500 },
  { L0: 1.0125, kb: 0.8219, kc: 0.4969, Cc: 0.1321, Ccb: 0.1594, Ccc: 0.0925, H: 257.954, hb: 13.000, hc: 4.750 },
  { L0: 0.9984, kb: 0.7859, kc: 0.4453, Cc: 0.2070, Ccb: 0.0375, Ccc: -0.0094, H: 218.437, hb: 20.875, hc: 17.375 },
  { L0: 0.9953, kb: 0.7891, kc: 0.3906, Cc: 0.2688, Ccb: -0.0719, Ccc: -0.0981, H: 199.509, hb: 13.500, hc: 10.750 },
  { L0: 1.0000, kb: 0.7734, kc: 0.4016, Cc: 0.2651, Ccb: -0.0288, Ccc: -0.1244, H: 190.606, hb: 5.875, hc: 4.750 },
  { L0: 1.0156, kb: 0.8219, kc: 0.4031, Cc: 0.2874, Ccb: -0.0344, Ccc: -0.1375, H: 180.211, hb: 3.500, hc: 1.500 },
  { L0: 1.0109, kb: 0.8016, kc: 0.4031, Cc: 0.2731, Ccb: -0.0106, Ccc: -0.0731, H: 157.029, hb: 8.625, hc: 6.125 },
  { L0: 1.0047, kb: 0.8125, kc: 0.3344, Cc: 0.3063, Ccb: -0.0994, Ccc: -0.0825, H: 132.812, hb: 12.375, hc: 5.875 },
  { L0: 1.0000, kb: 0.7938, kc: 0.2453, Cc: 0.3660, Ccb: -0.1662, Ccc: -0.1694, H: 115.167, hb: -1.500, hc: 5.000 },
  { L0: 1.0000, kb: 0.8125, kc: 0.1641, Cc: 0.4359, Ccb: -0.2394, Ccc: -0.2438, H: 106.678, hb: -9.875, hc: 3.875 },
];

/**
 * Position on the NCS hue circle as one number: `Y` 0, `R` 100, `B` 200, `G`
 * 300, wrapping at 400. A hue notation's percent is literally its offset, so
 * `Y90R` is 90.
 */
export function hueParameter(hue: NcsHue): number {
  return ELEMENTARY.indexOf(hue.from) * 100 + (hue.to === null ? 0 : hue.percent);
}

/** The inverse of {@link hueParameter}, rolling 100 onto the next hue. */
export function hueFromParameter(t: number): NcsHue {
  const wrapped = ((t % TURN) + TURN) % TURN;
  const index = Math.floor(wrapped / 100) % ELEMENTARY.length;
  const percent = Math.round(wrapped - index * 100);

  const from = ELEMENTARY[index]!;
  if (percent <= 0) return { from, to: null, percent: 0 };

  // 100% of the way to the next hue *is* the next hue; NCS has no `Y100R`.
  if (percent >= 100) {
    return { from: ELEMENTARY[(index + 1) % ELEMENTARY.length]!, to: null, percent: 0 };
  }

  return { from, to: ELEMENTARY[(index + 1) % ELEMENTARY.length]!, percent };
}

const wrapT = (t: number) => ((t % TURN) + TURN) % TURN;

/** Shortest signed arc from `a` to `b` in degrees, so the 359/1 seam behaves. */
function hueDelta(a: number, b: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Coefficients at an arbitrary circle position, linear between knots. */
export function knotAt(t: number): Knot {
  const w = wrapT(t);
  const i = Math.floor(w / SPAN) % KNOT_COUNT;
  const f = (w - i * SPAN) / SPAN;

  const a = KNOTS[i]!;
  const b = KNOTS[(i + 1) % KNOT_COUNT]!;
  const mix = (x: number, y: number) => x + (y - x) * f;

  return {
    L0: mix(a.L0, b.L0),
    kb: mix(a.kb, b.kb),
    kc: mix(a.kc, b.kc),
    Cc: mix(a.Cc, b.Cc),
    Ccb: mix(a.Ccb, b.Ccb),
    Ccc: mix(a.Ccc, b.Ccc),
    // Hue interpolates along the shortest arc rather than numerically, so a
    // knot pair straddling 0 degrees does not sweep the long way round.
    H: a.H + hueDelta(a.H, b.H) * f,
    hb: mix(a.hb, b.hb),
    hc: mix(a.hc, b.hc),
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Oklch lightness of the neutral axis, as a cubic in blackness.
 *
 * Blackness is emphatically *not* `1 - L`. The published neutral axis runs
 * from L 0.965 at blackness 3 to L 0.215 at blackness 90, close to linear in
 * CIE L\* through the middle (`S 2000-N` is exactly L\* 80, `S 5000-N` exactly
 * 56, `S 6000-N` exactly 48) but falling away sharply at the dark end. Fitted
 * by least squares against the 19 published neutrals: max residual 0.0135,
 * mean 0.0059.
 */
const NEUTRAL_L = [1.002958, -1.120662, 1.287333, -1.109832] as const;

/** Oklch lightness for a blackness in 0–1. */
export function neutralLightness(blackness: number): number {
  const b = clamp(blackness, 0, 1);
  const [a0, a1, a2, a3] = NEUTRAL_L;
  return clamp(a0 + a1 * b + a2 * b * b + a3 * b * b * b, 0, 1);
}

/** The inverse of {@link neutralLightness}, by bisection on a monotonic curve. */
function neutralBlackness(lightness: number): number {
  let lo = 0;
  let hi = 1;
  // The curve descends monotonically over 0–1, so 40 halvings put the answer
  // far below the one-percent resolution the notation can express anyway.
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (neutralLightness(mid) > lightness) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** NCS to a `ColorObject` in core's `oklch` space. */
export function toOklch(ncs: NcsColor): ColorObject {
  const b = ncs.blackness / 100;
  const c = ncs.chromaticness / 100;

  if (ncs.hue === null) {
    // The neutral axis carries no hue and no chroma. Published neutrals have a
    // slight warm tint, which is a paper-white simulation rather than a
    // property of the notation; reproducing it would cast every grey.
    return { space: "oklch", coords: [neutralLightness(b), 0, 0], alpha: 1 };
  }

  const k = knotAt(hueParameter(ncs.hue));
  const L = clamp(k.L0 - k.kb * b - k.kc * c, 0, 1);
  const C = Math.max(0, k.Cc * c + k.Ccb * c * b + k.Ccc * c * c);
  const h = k.H + k.hb * b + k.hc * c;

  return { space: "oklch", coords: [L, C, ((h % 360) + 360) % 360], alpha: 1 };
}

/**
 * Below this Oklch chroma a colour is treated as neutral. Set just above the
 * chroma of the published `-N` references, whose slight warm tint would
 * otherwise serialise as a very low-chromaticness hue.
 */
const NEUTRAL_CHROMA = 0.012;

/**
 * Blackness and chromaticness each occupy two digits of the notation, so 99 is
 * the largest either can be written as. A colour whose inverse solves above
 * that is clamped rather than rendered as an unparseable three-digit field.
 */
const MAX_FIELD = 99;

/** Circle position whose base hue `H` equals a target angle. */
function parameterForAngle(angle: number): number {
  const target = ((angle % 360) + 360) % 360;

  let bestT = 0;
  let bestDistance = Infinity;

  // `H` is not guaranteed monotonic once fitted, so each arc is checked and
  // the closest crossing wins. Sixteen arcs is cheap and cannot mis-branch the
  // way a monotonicity assumption would.
  for (let i = 0; i < KNOT_COUNT; i++) {
    const a = KNOTS[i]!.H;
    const b = KNOTS[(i + 1) % KNOT_COUNT]!.H;
    const d = hueDelta(a, b);

    // Fraction along this arc that lands on the target, if any.
    const f = d === 0 ? 0 : hueDelta(a, target) / d;
    const clamped = clamp(f, 0, 1);
    const reached = a + d * clamped;
    const distance = Math.abs(hueDelta(reached, target));

    if (distance < bestDistance) {
      bestDistance = distance;
      bestT = i * SPAN + clamped * SPAN;
    }
  }

  return bestT;
}

/**
 * A `ColorObject` back to NCS, by solving the same equations.
 *
 * Analytic rather than a nearest-neighbour search over samples. Hue depends on
 * blackness and chromaticness, which depend in turn on the hue's coefficients,
 * so the solve is a short fixed-point: three passes are enough for the circle
 * position to settle to well under one unit.
 *
 * Out-of-range results are **clamped**: blackness and chromaticness are pulled
 * into 0–100 and `s + c <= 100` is enforced, so every result re-parses. A
 * colour far outside what NCS can express still receives a confident-looking
 * notation; round-trip it to detect that.
 */
export function fromOklch(color: ColorObject): NcsColor {
  const [L, C, h] = convert(color, "oklch").coords as [number, number, number];

  if (C <= NEUTRAL_CHROMA) {
    return {
      blackness: clamp(Math.round(100 * neutralBlackness(L)), 0, MAX_FIELD),
      chromaticness: 0,
      hue: null,
    };
  }

  let t = parameterForAngle(h);
  let blackness = 0;
  let chromaticness = 0;

  for (let pass = 0; pass < 3; pass++) {
    const k = knotAt(t);

    // Substituting b from the L equation into the C equation leaves a
    // quadratic in c:  A*c^2 + B*c - C = 0.
    const A = k.Ccc - (k.kb === 0 ? 0 : (k.Ccb * k.kc) / k.kb);
    const B = k.Cc + (k.kb === 0 ? 0 : (k.Ccb * (k.L0 - L)) / k.kb);

    let c: number;
    if (Math.abs(A) < 1e-9) {
      c = B === 0 ? 0 : C / B;
    } else {
      const disc = B * B + 4 * A * C;
      if (disc < 0) {
        // No real chromaticness reproduces this chroma at this hue, which
        // happens past the turning point of the curve. Use the linear term.
        c = B === 0 ? 0 : C / B;
      } else {
        // `Ccc` is negative for most hues, so `C(c)` is a downward parabola
        // that peaks around chromaticness 75 and falls away after it. Past the
        // peak the forward map is genuinely not injective: two chromaticness
        // values produce the same lightness *and* the same chroma, so no
        // inverse can tell them apart. The lower root is taken, which keeps
        // `toNcs` on the ascending branch and errs toward the less extreme
        // reading. See the accuracy note in the README.
        const root = Math.sqrt(disc);
        const candidates = [(-B + root) / (2 * A), (-B - root) / (2 * A)]
          .filter(x => x >= 0)
          .sort((x, y) => x - y);
        c = candidates[0] ?? (B === 0 ? 0 : Math.max(0, C / B));
      }
    }
    c = clamp(c, 0, 1);

    const b = clamp(k.kb === 0 ? 0 : (k.L0 - L - k.kc * c) / k.kb, 0, 1);

    chromaticness = c;
    blackness = b;

    // Re-solve the circle position now that the hue drift terms can be applied.
    t = parameterForAngle(h - k.hb * b - k.hc * c);
  }

  const blackPercent = clamp(Math.round(blackness * 100), 0, MAX_FIELD);
  const chromaPercent = clamp(Math.round(chromaticness * 100), 0, Math.min(MAX_FIELD, 100 - blackPercent));

  return {
    blackness: blackPercent,
    chromaticness: chromaPercent,
    hue: hueFromParameter(t),
  };
}
