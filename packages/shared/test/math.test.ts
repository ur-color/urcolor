import { describe, it, expect } from "bun:test";
import {
  clamp, getDecimalCount, roundValue, snapToStep, linearScale,
  convertValueToPercentage, getThumbInBoundsOffset, getClosestThumbIndex,
  hasMinStepsBetweenValues, getLabel,
} from "../src/math";

describe("clamp", () => {
  it("bounds a value on both sides", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
  it("is unbounded when limits are omitted", () => {
    expect(clamp(1e9)).toBe(1e9);
  });
});

describe("getDecimalCount", () => {
  it("counts fractional digits", () => {
    expect(getDecimalCount(1)).toBe(0);
    expect(getDecimalCount(0.01)).toBe(2);
  });
});

describe("roundValue", () => {
  it("rounds to a decimal count", () => {
    expect(roundValue(1.2345, 2)).toBe(1.23);
    expect(roundValue(1.2345, 0)).toBe(1);
  });
});

describe("snapToStep", () => {
  it("snaps to the nearest step and clamps", () => {
    expect(snapToStep(7, 0, 10, 5)).toBe(5);
    expect(snapToStep(8, 0, 10, 5)).toBe(10);
    expect(snapToStep(-5, 0, 10, 5)).toBe(0);
  });
  it("preserves the step's decimal precision", () => {
    expect(snapToStep(0.26, 0, 1, 0.1)).toBe(0.3);
  });
});

describe("linearScale", () => {
  it("maps between ranges", () => {
    expect(linearScale([0, 10], [0, 100])(5)).toBe(50);
  });
  it("returns the output floor for a degenerate range", () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0);
  });
});

describe("convertValueToPercentage", () => {
  it("maps a value into 0-100", () => {
    expect(convertValueToPercentage(5, 0, 10)).toBe(50);
    expect(convertValueToPercentage(-5, 0, 10)).toBe(0);
  });
});

describe("getThumbInBoundsOffset", () => {
  it("offsets a thumb at the track start by half its width", () => {
    expect(getThumbInBoundsOffset(20, 0, 1)).toBe(10);
  });
  it("offsets a thumb at the track end negatively", () => {
    expect(getThumbInBoundsOffset(20, 100, 1)).toBe(-10);
  });
});

describe("getClosestThumbIndex", () => {
  it("returns -1 for no thumbs and 0 for one", () => {
    expect(getClosestThumbIndex([], [0, 0], 0, 1, 0, 1)).toBe(-1);
    expect(getClosestThumbIndex([[9, 9]], [0, 0], 0, 1, 0, 1)).toBe(0);
  });
  it("picks the nearest thumb in normalized space", () => {
    expect(getClosestThumbIndex([[0, 0], [10, 10]], [9, 9], 0, 10, 0, 10)).toBe(1);
  });
});

describe("hasMinStepsBetweenValues", () => {
  it("is always true when the minimum is zero", () => {
    expect(hasMinStepsBetweenValues([1, 1], 0)).toBe(true);
  });
  it("rejects values that are too close", () => {
    expect(hasMinStepsBetweenValues([1, 2], 5)).toBe(false);
    expect(hasMinStepsBetweenValues([1, 10], 5)).toBe(true);
  });
});

describe("getLabel", () => {
  it("names the endpoints of a two-thumb slider", () => {
    expect(getLabel(0, 2)).toBe("Minimum");
    expect(getLabel(1, 2)).toBe("Maximum");
  });
  it("numbers thumbs beyond two and omits a label for one", () => {
    expect(getLabel(0, 3)).toBe("Value 1 of 3");
    expect(getLabel(0, 1)).toBeUndefined();
  });
});
