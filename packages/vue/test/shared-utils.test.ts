import { describe, expect, it } from "bun:test";
import { clamp, convertValueToPercentage, cyclicWrap, snapToStep } from "../src/shared/utils";

describe("shared/utils", () => {
  it("clamps into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("snaps to the nearest step and clamps", () => {
    expect(snapToStep(0.34, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(7, 0, 5, 1)).toBe(5);
  });

  it("converts a value to a percentage of its range", () => {
    expect(convertValueToPercentage(50, 0, 100)).toBe(50);
    expect(convertValueToPercentage(180, 0, 360)).toBe(50);
  });

  describe("cyclicWrap", () => {
    it("wraps past the maximum back to the minimum", () => {
      expect(cyclicWrap(370, 0, 360)).toBe(10);
    });

    it("wraps below the minimum back to the maximum", () => {
      expect(cyclicWrap(-10, 0, 360)).toBe(350);
    });

    it("leaves in-range values untouched", () => {
      expect(cyclicWrap(180, 0, 360)).toBe(180);
    });

    it("returns min when the range is degenerate", () => {
      expect(cyclicWrap(5, 3, 3)).toBe(3);
    });
  });
});
