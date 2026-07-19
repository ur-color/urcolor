import { describe, expect, test } from "bun:test";
import type { Coords } from "../../../src/color/types";
import { adaptD50toD65, adaptD65toD50, linearizeSrgb, srgbFromXyz, srgbToXyz } from "../../../src/color/spaces/xyz";

const closeCoords = (a: Coords, b: Coords, digits = 5): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, digits);
};

describe("srgb gamma", () => {
  test("linearizes the sRGB toe (linear segment) and knee", () => {
    expect(linearizeSrgb(0)).toBe(0);
    expect(linearizeSrgb(1)).toBeCloseTo(1, 10);
    // Mid-gray 0.5 gamma -> ~0.214 linear.
    expect(linearizeSrgb(0.5)).toBeCloseTo(0.21404114, 6);
  });
});

describe("srgbToXyz", () => {
  test("maps sRGB white to the D65 whitepoint", () => {
    closeCoords(srgbToXyz([1, 1, 1]), [0.9504559, 1.0, 1.0890578]);
  });

  test("maps sRGB red to its XYZ-D65 tristimulus", () => {
    closeCoords(srgbToXyz([1, 0, 0]), [0.4123908, 0.212639, 0.0193308]);
  });

  test("maps black to the origin", () => {
    closeCoords(srgbToXyz([0, 0, 0]), [0, 0, 0]);
  });
});

describe("srgb <-> xyz round-trip", () => {
  test("recovers the original coords", () => {
    const c: Coords = [0.2, 0.6, 0.9];
    closeCoords(srgbFromXyz(srgbToXyz(c)), c);
  });
});

describe("bradford adaptation", () => {
  test("D65 whitepoint adapts to the D50 whitepoint", () => {
    // XYZ of the D65 white, adapted to D50, is the D50 white.
    closeCoords(adaptD65toD50([0.9504559, 1.0, 1.0890578]), [0.9642957, 1.0, 0.8251046]);
  });

  test("adaptation round-trips", () => {
    const xyz: Coords = [0.3, 0.4, 0.2];
    closeCoords(adaptD50toD65(adaptD65toD50(xyz)), xyz);
  });
});
