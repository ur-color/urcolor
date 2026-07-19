/**
 * Minimal 3x3 linear algebra shared by the RGB/XYZ space converters. A matrix
 * is row-major: `[[a,b,c],[d,e,f],[g,h,i]]`.
 */

import type { Coords } from "./types";

export type Mat3 = readonly [Coords, Coords, Coords];

/** Multiply a 3x3 matrix by a column vector. */
export function mul(m: Mat3, v: Coords): Coords {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}
