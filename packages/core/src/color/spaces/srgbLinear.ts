/**
 * `srgb-linear` — sRGB primaries with a linear (identity) transfer function.
 * Same matrices as sRGB, no gamma.
 */

import { identityTransfer, makeRgbSpace, type XyzBridge } from "./rgbSpace";
import { LIN_SRGB_TO_XYZ, XYZ_TO_LIN_SRGB } from "./xyz";

export const srgbLinear: XyzBridge = makeRgbSpace({
  toLinear: identityTransfer,
  toGamma: identityTransfer,
  toXyzMatrix: LIN_SRGB_TO_XYZ,
  fromXyzMatrix: XYZ_TO_LIN_SRGB,
});
