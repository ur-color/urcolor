import { describe, expect, test } from "bun:test";
import { serialize } from "../../src/color/serialize";
import type { ColorObject } from "../../src/color/types";

const red: ColorObject = { space: "srgb", coords: [1, 0, 0], alpha: 1 };

describe("serialize", () => {
  test("defaults to the color's own space notation", () => {
    expect(serialize(red)).toBe("rgb(255 0 0)");
    expect(serialize({ space: "oklch", coords: [0.5, 0.1, 30], alpha: 1 })).toBe("oklch(0.5 0.1 30)");
  });

  test("serializes to an explicit format, converting first", () => {
    expect(serialize(red, "hex")).toBe("#ff0000");
    expect(serialize(red, "hsl")).toBe("hsl(0 100% 50%)");
  });

  test("serializes predefined-RGB spaces via color()", () => {
    expect(serialize({ space: "display-p3", coords: [1, 0, 0], alpha: 1 })).toBe("color(display-p3 1 0 0)");
  });

  test("hex format works from any space", () => {
    expect(serialize({ space: "hsl", coords: [0, 1, 0.5], alpha: 1 }, "hex")).toBe("#ff0000");
  });
});
