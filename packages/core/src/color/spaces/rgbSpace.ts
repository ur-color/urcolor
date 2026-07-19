/**
 * A factory for the predefined RGB working spaces used by `color()`
 * (display-p3, a98-rgb, prophoto-rgb, rec2020, srgb-linear). Each is fully
 * described by a transfer function pair and a linear-RGB<->XYZ matrix pair;
 * spaces whose native white is D50 (ProPhoto) additionally Bradford-adapt to
 * the D65 hub. Keeping the shared plumbing here means each space module is just
 * its constants.
 */

import { type Mat3, mul } from "../matrix";
import type { Coords } from "../types";
import { adaptD50toD65, adaptD65toD50 } from "./xyz";

/** The `toXyz`/`fromXyz` pair the registry needs from a color space. */
export interface XyzBridge {
  toXyz(coords: Coords): Coords;
  fromXyz(xyz: Coords): Coords;
}

export interface RgbSpaceConfig {
  /** Encoded channel -> linear light. */
  toLinear(c: number): number;
  /** Linear light -> encoded channel. */
  toGamma(c: number): number;
  /** Linear RGB -> XYZ in the space's native white. */
  toXyzMatrix: Mat3;
  /** XYZ (native white) -> linear RGB. */
  fromXyzMatrix: Mat3;
  /** True when the native white is D50 (adapt to/from the D65 hub). */
  d50?: boolean;
}

/** Build the XYZ-D65 bridge for a predefined RGB space. */
export function makeRgbSpace(cfg: RgbSpaceConfig): XyzBridge {
  const { toLinear, toGamma, toXyzMatrix, fromXyzMatrix, d50 } = cfg;
  return {
    toXyz(coords) {
      const lin = mul(toXyzMatrix, [toLinear(coords[0]), toLinear(coords[1]), toLinear(coords[2])]);
      return d50 ? adaptD50toD65(lin) : lin;
    },
    fromXyz(xyz) {
      const native = d50 ? adaptD65toD50(xyz) : xyz;
      const lin = mul(fromXyzMatrix, native);
      return [toGamma(lin[0]), toGamma(lin[1]), toGamma(lin[2])];
    },
  };
}

/** A linear (no-op transfer) helper for `srgb-linear`. */
export const identityTransfer = (c: number): number => c;
