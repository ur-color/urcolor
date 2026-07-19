import { describe, expect, test } from "bun:test";
import type { Coords } from "../../../src/color/types";
import { labFromXyz, labToXyz, parseLab, serializeLab } from "../../../src/color/spaces/lab";
import { srgbToXyz } from "../../../src/color/spaces/xyz";

const close = (a: Coords, b: Coords, d = 3): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

describe("labFromXyz", () => {
  test("sRGB white is L=100, a=b=0", () => {
    close(labFromXyz(srgbToXyz([1, 1, 1])), [100, 0, 0]);
  });
  test("sRGB red matches the CSS Color 4 reference (D50)", () => {
    close(labFromXyz(srgbToXyz([1, 0, 0])), [54.2905, 80.805, 69.891], 1);
  });
  test("black is the origin", () => {
    close(labFromXyz(srgbToXyz([0, 0, 0])), [0, 0, 0]);
  });
});

describe("lab <-> xyz round-trip", () => {
  test("recovers XYZ", () => {
    const xyz = srgbToXyz([0.3, 0.6, 0.2]);
    close(labToXyz(labFromXyz(xyz)), xyz, 6);
  });
});

describe("parseLab", () => {
  test("parses percentages and numbers", () => {
    const c = parseLab("lab(54.29 80.81 69.89)");
    expect(c?.space).toBe("lab");
    close((c as { coords: Coords }).coords, [54.29, 80.81, 69.89]);
  });
  test("L as percentage scales to 0..100", () => {
    expect(parseLab("lab(50% 0 0)")?.coords[0]).toBe(50);
  });
  test("parses slash alpha", () => {
    expect(parseLab("lab(50 0 0 / 0.5)")?.alpha).toBe(0.5);
  });
});

describe("serializeLab", () => {
  test("serializes to lab()", () => {
    expect(serializeLab({ space: "lab", coords: [54.29, 80.81, 69.89], alpha: 1 })).toBe("lab(54.29 80.81 69.89)");
  });
});
