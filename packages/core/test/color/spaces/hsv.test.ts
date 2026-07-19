import { describe, expect, it } from "bun:test";
import { Color } from "../../../src/color/color";
import { convert } from "../../../src/color/convert";
import { serialize } from "../../../src/color/serialize";
import type { ColorObject, Coords } from "../../../src/color/types";

const srgb = (coords: Coords): ColorObject => ({ space: "srgb", coords, alpha: 1 });

describe("hsv", () => {
  it("round-trips sRGB through HSV", () => {
    const samples: Coords[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.2, 0.6, 0.9],
      [0.75, 0.25, 0.5],
    ];
    for (const c of samples) {
      const back = convert(convert(srgb(c), "hsv"), "srgb");
      expect(back.coords[0]).toBeCloseTo(c[0], 6);
      expect(back.coords[1]).toBeCloseTo(c[1], 6);
      expect(back.coords[2]).toBeCloseTo(c[2], 6);
    }
  });

  it("converts known colors to the expected HSV coords", () => {
    // Pure red: h=0, s=1, v=1.
    const red = convert(srgb([1, 0, 0]), "hsv");
    expect(red.coords[0]).toBeCloseTo(0, 6);
    expect(red.coords[1]).toBeCloseTo(1, 6);
    expect(red.coords[2]).toBeCloseTo(1, 6);

    // Pure blue: h=240.
    const blue = convert(srgb([0, 0, 1]), "hsv");
    expect(blue.coords[0]).toBeCloseTo(240, 6);
  });

  it("gives achromatic colors zero saturation and hue", () => {
    const grey = convert(srgb([0.5, 0.5, 0.5]), "hsv");
    expect(grey.coords[0]).toBe(0);
    expect(grey.coords[1]).toBe(0);
    expect(grey.coords[2]).toBeCloseTo(0.5, 6);
  });

  it("handles black without dividing by zero", () => {
    const black = convert(srgb([0, 0, 0]), "hsv");
    expect(black.coords[0]).toBe(0);
    expect(black.coords[1]).toBe(0);
    expect(black.coords[2]).toBe(0);
    expect(Number.isNaN(black.coords[1])).toBe(false);
  });

  it("survives the 0/360 hue boundary", () => {
    const a = convert({ space: "hsv", coords: [0, 1, 1], alpha: 1 }, "srgb");
    const b = convert({ space: "hsv", coords: [360, 1, 1], alpha: 1 }, "srgb");
    expect(a.coords[0]).toBeCloseTo(b.coords[0], 6);
    expect(a.coords[1]).toBeCloseTo(b.coords[1], 6);
    expect(a.coords[2]).toBeCloseTo(b.coords[2], 6);
  });

  it("serialises as rgb(), since hsv has no CSS notation", () => {
    const c: ColorObject = { space: "hsv", coords: [0, 1, 1], alpha: 1 };
    expect(serialize(c)).toBe("rgb(255 0 0)");
    expect(new Color("hsv", [0, 1, 1]).toString()).toBe("rgb(255 0 0)");
  });

  it("carries alpha through the conversion", () => {
    const c = convert({ space: "srgb", coords: [1, 0, 0], alpha: 0.5 }, "hsv");
    expect(c.alpha).toBe(0.5);
  });
});
