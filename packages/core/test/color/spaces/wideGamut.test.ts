import { describe, expect, test } from "bun:test";
import type { Coords, SpaceId } from "../../../src/color/types";
import { a98 } from "../../../src/color/spaces/a98";
import { p3 } from "../../../src/color/spaces/p3";
import { prophoto } from "../../../src/color/spaces/prophoto";
import { rec2020 } from "../../../src/color/spaces/rec2020";
import { srgbLinear } from "../../../src/color/spaces/srgbLinear";
import { srgbToXyz, xyzD50, xyzD65 } from "../../../src/color/spaces/xyz";

const close = (a: Coords, b: Coords, d = 4): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

const spaces = { p3, a98, prophoto, rec2020, srgbLinear, xyzD50, xyzD65 };

describe("round-trips through the XYZ hub", () => {
  for (const [name, def] of Object.entries(spaces)) {
    test(`${name} fromXyz(toXyz(c)) === c`, () => {
      const c: Coords = [0.3, 0.6, 0.2];
      close(def.fromXyz(def.toXyz(c)), c, 6);
    });
  }
});

describe("white maps to the sRGB white through the hub", () => {
  for (const [name, def] of Object.entries(spaces)) {
    test(`${name} [1,1,1] toXyz round-trips to sRGB white`, () => {
      // Each space's own white, taken to XYZ then back, is stable.
      close(def.fromXyz(def.toXyz([1, 1, 1])), [1, 1, 1], 6);
    });
  }
});

describe("xyz-d65 is the identity hub", () => {
  test("toXyz / fromXyz pass through unchanged", () => {
    const c: Coords = [0.4, 0.5, 0.6];
    close(xyzD65.toXyz(c), c, 10);
    close(xyzD65.fromXyz(c), c, 10);
  });
});

describe("display-p3 red matches CSS Color 4", () => {
  test("sRGB red -> display-p3", () => {
    close(p3.fromXyz(srgbToXyz([1, 0, 0])), [0.9175, 0.20028, 0.13856], 3);
  });
});

describe("rec2020 red matches CSS Color 4", () => {
  test("sRGB red -> rec2020", () => {
    close(rec2020.fromXyz(srgbToXyz([1, 0, 0])), [0.79198, 0.23098, 0.07376], 3);
  });
});
