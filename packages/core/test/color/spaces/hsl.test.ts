import { describe, expect, test } from "bun:test";
import type { Coords } from "../../../src/color/types";
import { hslToSrgb, parseHsl, serializeHsl, srgbToHsl } from "../../../src/color/spaces/hsl";

const close = (a: Coords, b: Coords, d = 5): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

describe("hslToSrgb", () => {
  test("red at hue 0", () => close(hslToSrgb([0, 1, 0.5]), [1, 0, 0]));
  test("green at hue 120", () => close(hslToSrgb([120, 1, 0.5]), [0, 1, 0]));
  test("blue at hue 240", () => close(hslToSrgb([240, 1, 0.5]), [0, 0, 1]));
  test("gray when saturation 0", () => close(hslToSrgb([0, 0, 0.5]), [0.5, 0.5, 0.5]));
});

describe("srgbToHsl", () => {
  test("recovers hue/sat/light for a saturated color", () => {
    close(srgbToHsl([1, 0, 0]), [0, 1, 0.5]);
  });
  test("achromatic has zero saturation", () => {
    const [, s] = srgbToHsl([0.5, 0.5, 0.5]);
    expect(s).toBe(0);
  });
  test("round-trips through hslToSrgb", () => {
    const rgb: Coords = [0.2, 0.7, 0.4];
    close(hslToSrgb(srgbToHsl(rgb)), rgb);
  });
});

describe("parseHsl", () => {
  test("parses percentages and hue in degrees", () => {
    expect(parseHsl("hsl(120 100% 50%)")).toEqual({
      space: "hsl",
      coords: [120, 1, 0.5],
      alpha: 1,
    });
  });
  test("parses legacy comma syntax with hsla alpha", () => {
    expect(parseHsl("hsla(120, 100%, 50%, 0.5)")?.alpha).toBe(0.5);
  });
  test("parses slash alpha and bare hue number", () => {
    expect(parseHsl("hsl(120 100% 50% / 0.25)")?.alpha).toBe(0.25);
  });
  test("returns null for non-hsl", () => {
    expect(parseHsl("rgb(1 2 3)")).toBeNull();
  });
});

describe("serializeHsl", () => {
  test("serializes with percentages", () => {
    expect(serializeHsl({ space: "hsl", coords: [120, 1, 0.5], alpha: 1 })).toBe("hsl(120 100% 50%)");
  });
  test("includes alpha when < 1", () => {
    expect(serializeHsl({ space: "hsl", coords: [120, 1, 0.5], alpha: 0.5 })).toBe("hsl(120 100% 50% / 0.5)");
  });
});
