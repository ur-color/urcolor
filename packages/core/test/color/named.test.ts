import { describe, expect, test } from "bun:test";
import { parseNamed } from "../../src/color/named";

describe("parseNamed", () => {
  test("parses a basic keyword", () => {
    expect(parseNamed("red")).toEqual({
      space: "srgb",
      coords: [1, 0, 0],
      alpha: 1,
    });
  });

  test("is case-insensitive and trims", () => {
    expect(parseNamed("  ReBeccaPurple ")?.coords).toEqual([0x66 / 255, 0x33 / 255, 0x99 / 255]);
  });

  test("parses transparent as fully transparent black", () => {
    expect(parseNamed("transparent")).toEqual({
      space: "srgb",
      coords: [0, 0, 0],
      alpha: 0,
    });
  });

  test("maps the CSS gray/grey aliases identically", () => {
    expect(parseNamed("gray")).toEqual(parseNamed("grey"));
  });

  test("returns null for unknown keyword", () => {
    expect(parseNamed("notacolor")).toBeNull();
  });
});
