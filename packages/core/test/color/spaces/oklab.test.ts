import { describe, expect, test } from "bun:test";
import type { Coords } from "../../../src/color/types";
import { oklabFromXyz, oklabToXyz, parseOklab, serializeOklab } from "../../../src/color/spaces/oklab";
import { srgbToXyz } from "../../../src/color/spaces/xyz";

const close = (a: Coords, b: Coords, d = 4): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

describe("oklabFromXyz", () => {
  test("sRGB white is L=1, a=b=0", () => {
    close(oklabFromXyz(srgbToXyz([1, 1, 1])), [1, 0, 0], 3);
  });
  test("sRGB red matches the reference", () => {
    close(oklabFromXyz(srgbToXyz([1, 0, 0])), [0.6279553606, 0.2248630611, 0.1258462985]);
  });
});

describe("oklab <-> xyz round-trip", () => {
  test("recovers XYZ", () => {
    const xyz = srgbToXyz([0.3, 0.6, 0.2]);
    close(oklabToXyz(oklabFromXyz(xyz)), xyz, 6);
  });
});

describe("parseOklab", () => {
  test("parses L as number", () => {
    expect(parseOklab("oklab(0.628 0.225 0.126)")?.coords[0]).toBeCloseTo(0.628, 5);
  });
  test("parses L as percentage (100% = 1)", () => {
    expect(parseOklab("oklab(62.8% 0.225 0.126)")?.coords[0]).toBeCloseTo(0.628, 5);
  });
  test("parses slash alpha", () => {
    expect(parseOklab("oklab(0.5 0 0 / 0.5)")?.alpha).toBe(0.5);
  });
});

describe("serializeOklab", () => {
  test("serializes to oklab()", () => {
    expect(serializeOklab({ space: "oklab", coords: [0.628, 0.225, 0.126], alpha: 1 })).toBe(
      "oklab(0.628 0.225 0.126)",
    );
  });
});
