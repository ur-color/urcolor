import { describe, expect, test } from "bun:test";
import { convert } from "../../src/color/convert";
import type { ColorObject, Coords } from "../../src/color/types";

const close = (a: Coords, b: Coords, d = 4): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

const red: ColorObject = { space: "srgb", coords: [1, 0, 0], alpha: 1 };

describe("convert", () => {
  test("returns an equal (copied) object for same-space", () => {
    const out = convert(red, "srgb");
    expect(out).toEqual(red as typeof out);
    expect(out).not.toBe(red);
  });

  test("srgb red -> oklch matches the reference", () => {
    close(convert(red, "oklch").coords, [0.6279553606, 0.2576, 29.234], 2);
  });

  test("preserves alpha across conversion", () => {
    const c: ColorObject = { space: "srgb", coords: [1, 0, 0], alpha: 0.5 };
    expect(convert(c, "hsl").alpha).toBe(0.5);
  });

  test("round-trips srgb -> lab -> srgb", () => {
    const back = convert(convert(red, "lab"), "srgb");
    // 5 digits: the shipped Bradford D50<->D65 matrices aren't exact inverses.
    close(back.coords, [1, 0, 0], 5);
  });

  test("converts between two non-srgb spaces (p3 -> rec2020)", () => {
    const p3red: ColorObject = { space: "display-p3", coords: [1, 0, 0], alpha: 1 };
    const out = convert(p3red, "rec2020");
    expect(out.space).toBe("rec2020");
    // Round-trip back within epsilon.
    close(convert(out, "display-p3").coords, [1, 0, 0], 6);
  });
});
