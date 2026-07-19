import { describe, expect, test } from "bun:test";
import { parseHex, parseRgb, serializeHex, serializeRgb } from "../../../src/color/spaces/srgb";

describe("parseHex", () => {
  test("parses #rrggbb into srgb 0..1 coords", () => {
    expect(parseHex("#ff0000")).toEqual({
      space: "srgb",
      coords: [1, 0, 0],
      alpha: 1,
    });
  });

  test("parses 3-digit shorthand #rgb", () => {
    expect(parseHex("#0f0")).toEqual({
      space: "srgb",
      coords: [0, 1, 0],
      alpha: 1,
    });
  });

  test("parses 8-digit #rrggbbaa with alpha", () => {
    const c = parseHex("#ff000080");
    expect(c?.coords).toEqual([1, 0, 0]);
    expect(c?.alpha).toBeCloseTo(0x80 / 255, 5);
  });

  test("parses 4-digit #rgba shorthand", () => {
    const c = parseHex("#f00f");
    expect(c?.coords).toEqual([1, 0, 0]);
    expect(c?.alpha).toBe(1);
  });

  test("is case-insensitive and tolerates surrounding space", () => {
    expect(parseHex("  #FF0000  ")?.coords).toEqual([1, 0, 0]);
  });

  test("returns null for non-hex", () => {
    expect(parseHex("rgb(1,2,3)")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
  });
});

describe("serializeHex", () => {
  test("serializes opaque srgb to #rrggbb", () => {
    expect(serializeHex({ space: "srgb", coords: [1, 0, 0], alpha: 1 })).toBe("#ff0000");
  });

  test("serializes alpha to #rrggbbaa", () => {
    expect(serializeHex({ space: "srgb", coords: [1, 0, 0], alpha: 0x80 / 255 })).toBe("#ff000080");
  });

  test("clamps out-of-gamut channels", () => {
    expect(serializeHex({ space: "srgb", coords: [1.5, -0.2, 0], alpha: 1 })).toBe("#ff0000");
  });

  test("rounds to nearest byte", () => {
    expect(serializeHex({ space: "srgb", coords: [0.5, 0.5, 0.5], alpha: 1 })).toBe("#808080");
  });
});

describe("parseRgb", () => {
  test("parses legacy comma syntax", () => {
    expect(parseRgb("rgb(255, 0, 0)")).toEqual({
      space: "srgb",
      coords: [1, 0, 0],
      alpha: 1,
    });
  });

  test("parses modern space syntax with slash alpha", () => {
    const c = parseRgb("rgb(255 0 0 / 0.5)");
    expect(c?.coords).toEqual([1, 0, 0]);
    expect(c?.alpha).toBe(0.5);
  });

  test("parses rgba legacy with alpha", () => {
    expect(parseRgb("rgba(0, 0, 255, 0.25)")?.alpha).toBe(0.25);
  });

  test("parses percentage channels", () => {
    expect(parseRgb("rgb(100% 0% 0%)")?.coords).toEqual([1, 0, 0]);
  });

  test("parses percentage alpha", () => {
    expect(parseRgb("rgb(255 0 0 / 50%)")?.alpha).toBe(0.5);
  });

  test("treats none as zero", () => {
    expect(parseRgb("rgb(none 128 255)")?.coords).toEqual([0, 128 / 255, 1]);
  });

  test("returns null for non-rgb", () => {
    expect(parseRgb("#ff0000")).toBeNull();
    expect(parseRgb("hsl(0 100% 50%)")).toBeNull();
  });
});

describe("serializeRgb", () => {
  test("serializes opaque to legacy rgb()", () => {
    expect(serializeRgb({ space: "srgb", coords: [1, 0, 0], alpha: 1 })).toBe("rgb(255 0 0)");
  });

  test("serializes alpha to rgb(... / a)", () => {
    expect(serializeRgb({ space: "srgb", coords: [1, 0, 0], alpha: 0.5 })).toBe("rgb(255 0 0 / 0.5)");
  });
});
