/**
 * `display-p3` — DCI-P3 primaries with the sRGB transfer function, D65 white.
 */

import { makeRgbSpace, type XyzBridge } from "./rgbSpace";
import { delinearizeSrgb, linearizeSrgb } from "./xyz";

export const p3: XyzBridge = makeRgbSpace({
  toLinear: linearizeSrgb,
  toGamma: delinearizeSrgb,
  toXyzMatrix: [
    [0.4865709486482162, 0.26566769316909306, 0.19821728523436247],
    [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
    [0.0, 0.04511338185890264, 1.043944368900976],
  ],
  fromXyzMatrix: [
    [2.493496911941425, -0.9313836179191239, -0.40271078445071684],
    [-0.8294889695615747, 1.7626640603183463, 0.023624685841943577],
    [0.03584583024378447, -0.07617238926804182, 0.9568845240076872],
  ],
});
