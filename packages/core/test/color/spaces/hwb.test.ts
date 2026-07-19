import { describe, expect, test } from "bun:test";
import type { Coords } from "../../../src/color/types";
import { hwbToSrgb, parseHwb, serializeHwb, srgbToHwb } from "../../../src/color/spaces/hwb";

const close = (a: Coords, b: Coords, d = 5): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

describe("hwbToSrgb", () => {
  test("pure hue with no white/black", () => close(hwbToSrgb([0, 0, 0]), [1, 0, 0]));
  test("full whiteness is white", () => close(hwbToSrgb([0, 1, 0]), [1, 1, 1]));
  test("full blackness is black", () => close(hwbToSrgb([0, 0, 1]), [0, 0, 0]));
  test("equal white and black normalises to gray", () => close(hwbToSrgb([0, 0.5, 0.5]), [0.5, 0.5, 0.5]));
});

describe("srgbToHwb", () => {
  test("round-trips through hwbToSrgb", () => {
    const rgb: Coords = [0.2, 0.7, 0.4];
    close(hwbToSrgb(srgbToHwb(rgb)), rgb);
  });
});

describe("parseHwb", () => {
  test("parses modern syntax", () => {
    expect(parseHwb("hwb(120 20% 30%)")).toEqual({
      space: "hwb",
      coords: [120, 0.2, 0.3],
      alpha: 1,
    });
  });
  test("parses slash alpha", () => {
    expect(parseHwb("hwb(120 20% 30% / 0.5)")?.alpha).toBe(0.5);
  });
  test("returns null for non-hwb", () => {
    expect(parseHwb("hsl(1 2% 3%)")).toBeNull();
  });
});

describe("serializeHwb", () => {
  test("serializes with percentages", () => {
    expect(serializeHwb({ space: "hwb", coords: [120, 0.2, 0.3], alpha: 1 })).toBe("hwb(120 20% 30%)");
  });
});
