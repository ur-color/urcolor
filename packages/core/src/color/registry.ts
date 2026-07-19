/**
 * The space registry: maps every {@link SpaceId} to its XYZ-D65 bridge and
 * channel metadata. This is the one module that pulls in *all* spaces, so it —
 * and anything importing it ({@link ./convert.ts}, the {@link ./color.ts}
 * class) — is the "full" bundle. Individual space converters never import this
 * file, keeping direct-function usage tree-shakeable.
 */

import { a98 } from "./spaces/a98";
import { hslFromXyz, hslToSrgb, hslToXyz, srgbToHsl } from "./spaces/hsl";
import { hsvFromXyz, hsvToSrgb, hsvToXyz, srgbToHsv } from "./spaces/hsv";
import { hwbFromXyz, hwbToSrgb, hwbToXyz, srgbToHwb } from "./spaces/hwb";
import { labFromXyz, labToXyz } from "./spaces/lab";
import { lchFromXyz, lchToXyz } from "./spaces/lch";
import { oklabFromXyz, oklabToXyz } from "./spaces/oklab";
import { oklchFromXyz, oklchToXyz } from "./spaces/oklch";
import { p3 } from "./spaces/p3";
import { prophoto } from "./spaces/prophoto";
import { rec2020 } from "./spaces/rec2020";
import { srgbLinear } from "./spaces/srgbLinear";
import { delinearizeSrgb, linearizeSrgb, srgbFromXyz, srgbToXyz, xyzD50, xyzD65 } from "./spaces/xyz";
import type { Coords, SpaceDef, SpaceId } from "./types";

const rgb = ["r", "g", "b"] as const;
const xyz = ["x", "y", "z"] as const;
const identity = (c: Coords): Coords => [c[0], c[1], c[2]];

export const SPACES: Readonly<Record<SpaceId, SpaceDef>> = {
  srgb: {
    channels: rgb,
    toXyz: srgbToXyz,
    fromXyz: srgbFromXyz,
    toSrgb: identity,
    fromSrgb: identity,
  },
  "srgb-linear": {
    channels: rgb,
    toXyz: srgbLinear.toXyz,
    fromXyz: srgbLinear.fromXyz,
    toSrgb: (c) => [delinearizeSrgb(c[0]), delinearizeSrgb(c[1]), delinearizeSrgb(c[2])],
    fromSrgb: (c) => [linearizeSrgb(c[0]), linearizeSrgb(c[1]), linearizeSrgb(c[2])],
  },
  hsl: {
    channels: ["h", "s", "l"],
    hueIndex: 0,
    toXyz: hslToXyz,
    fromXyz: hslFromXyz,
    toSrgb: hslToSrgb,
    fromSrgb: srgbToHsl,
  },
  hsv: {
    channels: ["h", "s", "v"],
    hueIndex: 0,
    toXyz: hsvToXyz,
    fromXyz: hsvFromXyz,
    toSrgb: hsvToSrgb,
    fromSrgb: srgbToHsv,
  },
  hwb: {
    channels: ["h", "w", "b"],
    hueIndex: 0,
    toXyz: hwbToXyz,
    fromXyz: hwbFromXyz,
    toSrgb: hwbToSrgb,
    fromSrgb: srgbToHwb,
  },
  lab: { channels: ["l", "a", "b"], toXyz: labToXyz, fromXyz: labFromXyz },
  lch: { channels: ["l", "c", "h"], hueIndex: 2, toXyz: lchToXyz, fromXyz: lchFromXyz },
  oklab: { channels: ["l", "a", "b"], toXyz: oklabToXyz, fromXyz: oklabFromXyz },
  oklch: {
    channels: ["l", "c", "h"],
    hueIndex: 2,
    toXyz: oklchToXyz,
    fromXyz: oklchFromXyz,
  },
  "display-p3": { channels: rgb, toXyz: p3.toXyz, fromXyz: p3.fromXyz },
  "a98-rgb": { channels: rgb, toXyz: a98.toXyz, fromXyz: a98.fromXyz },
  "prophoto-rgb": {
    channels: rgb,
    toXyz: prophoto.toXyz,
    fromXyz: prophoto.fromXyz,
  },
  rec2020: { channels: rgb, toXyz: rec2020.toXyz, fromXyz: rec2020.fromXyz },
  "xyz-d65": { channels: xyz, toXyz: xyzD65.toXyz, fromXyz: xyzD65.fromXyz },
  "xyz-d50": { channels: xyz, toXyz: xyzD50.toXyz, fromXyz: xyzD50.fromXyz },
};

/** Look up a space definition; throws on an unknown id. */
export function spaceDef(space: SpaceId): SpaceDef {
  const def = SPACES[space];
  if (!def) throw new RangeError(`Unknown color space: ${space}`);
  return def;
}

/** Index of the hue channel for `space`, or `-1` if it has none. */
export function hueIndexOf(space: SpaceId): number {
  return SPACES[space].hueIndex ?? -1;
}

/** Copy a coords tuple. */
export function copyCoords(c: Coords): Coords {
  return [c[0], c[1], c[2]];
}
