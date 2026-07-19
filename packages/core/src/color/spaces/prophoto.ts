/**
 * `prophoto-rgb` — ProPhoto RGB (ROMM). Piecewise gamma of 1.8 with a small
 * linear toe, and a **D50** native white (Bradford-adapted to the D65 hub).
 */

import { makeRgbSpace, type XyzBridge } from "./rgbSpace";

const ET = 1 / 512;
const sign = (c: number): number => (c < 0 ? -1 : 1);

export const prophoto: XyzBridge = makeRgbSpace({
  d50: true,
  toLinear: (c) => {
    const abs = Math.abs(c);
    return abs <= 16 * ET ? c / 16 : sign(c) * abs ** 1.8;
  },
  toGamma: (c) => {
    const abs = Math.abs(c);
    return abs >= ET ? sign(c) * abs ** (1 / 1.8) : 16 * c;
  },
  toXyzMatrix: [
    [0.7977604896723027, 0.13518583717574031, 0.0313493495815248],
    [0.2880711282292934, 0.7118432178101014, 0.00008565396060525902],
    [0.0, 0.0, 0.8251046025104601],
  ],
  fromXyzMatrix: [
    [1.3457989731028281, -0.25558010007997534, -0.05110628506753401],
    [-0.5446224939028347, 1.5082327413132781, 0.02053603239147973],
    [0.0, 0.0, 1.2119675456389454],
  ],
});
