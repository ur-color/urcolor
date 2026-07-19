/**
 * `rec2020` — ITU-R BT.2020 wide gamut, D65 white, with its α/β piecewise
 * transfer function.
 */

import { makeRgbSpace, type XyzBridge } from "./rgbSpace";

const ALPHA = 1.09929682680944;
const BETA = 0.018053968510807;
const sign = (c: number): number => (c < 0 ? -1 : 1);

export const rec2020: XyzBridge = makeRgbSpace({
  toLinear: (c) => {
    const abs = Math.abs(c);
    return abs < BETA * 4.5 ? c / 4.5 : sign(c) * ((abs + ALPHA - 1) / ALPHA) ** (1 / 0.45);
  },
  toGamma: (c) => {
    const abs = Math.abs(c);
    return abs < BETA ? 4.5 * c : sign(c) * (ALPHA * abs ** 0.45 - (ALPHA - 1));
  },
  toXyzMatrix: [
    [0.6369580483012914, 0.14461690358620832, 0.16888097516417205],
    [0.2627002120112671, 0.6779980715188708, 0.05930171646986196],
    [0.0, 0.028072693049087428, 1.060985057710791],
  ],
  fromXyzMatrix: [
    [1.716651187971268, -0.355670783776392, -0.25336628137366],
    [-0.666684351832489, 1.616481236634939, 0.0157685458139111],
    [0.017639857445311, -0.042770613257809, 0.942103121235474],
  ],
});
