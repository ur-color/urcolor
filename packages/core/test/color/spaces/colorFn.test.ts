import { describe, expect, test } from "bun:test";
import { parseColorFn, serializeColorFn } from "../../../src/color/spaces/colorFn";

describe("parseColorFn", () => {
  test("parses a predefined RGB space", () => {
    expect(parseColorFn("color(display-p3 1 0 0)")).toEqual({
      space: "display-p3",
      coords: [1, 0, 0],
      alpha: 1,
    });
  });

  test("maps the xyz alias to xyz-d65", () => {
    expect(parseColorFn("color(xyz 0.4 0.5 0.6)")?.space).toBe("xyz-d65");
  });

  test("parses xyz-d50", () => {
    expect(parseColorFn("color(xyz-d50 0.4 0.5 0.6)")?.space).toBe("xyz-d50");
  });

  test("parses percentage channels", () => {
    expect(parseColorFn("color(srgb 100% 0% 50%)")?.coords).toEqual([1, 0, 0.5]);
  });

  test("parses slash alpha", () => {
    expect(parseColorFn("color(srgb 1 0 0 / 0.5)")?.alpha).toBe(0.5);
  });

  test("treats none as zero", () => {
    expect(parseColorFn("color(srgb none 1 1)")?.coords).toEqual([0, 1, 1]);
  });

  test("returns null for a non-color() string or unknown space", () => {
    expect(parseColorFn("rgb(1 2 3)")).toBeNull();
    expect(parseColorFn("color(bogus 1 0 0)")).toBeNull();
  });
});

describe("serializeColorFn", () => {
  test("serializes a predefined RGB space", () => {
    expect(serializeColorFn({ space: "display-p3", coords: [1, 0, 0], alpha: 1 })).toBe("color(display-p3 1 0 0)");
  });

  test("serializes xyz-d65 and includes alpha", () => {
    expect(serializeColorFn({ space: "xyz-d65", coords: [0.4, 0.5, 0.6], alpha: 0.5 })).toBe(
      "color(xyz-d65 0.4 0.5 0.6 / 0.5)",
    );
  });
});
