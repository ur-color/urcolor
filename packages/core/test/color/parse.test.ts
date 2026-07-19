import { describe, expect, test } from "bun:test";
import { parse, tryParse } from "../../src/color/parse";

describe("parse", () => {
  test("parses a named color", () => {
    expect(parse("red")).toEqual({ space: "srgb", coords: [1, 0, 0], alpha: 1 });
  });

  test("parses hex", () => {
    expect(parse("#00ff00").coords).toEqual([0, 1, 0]);
  });

  test("dispatches each functional notation to its space", () => {
    expect(parse("rgb(255 0 0)").space).toBe("srgb");
    expect(parse("hsl(120 100% 50%)").space).toBe("hsl");
    expect(parse("hwb(120 0% 0%)").space).toBe("hwb");
    expect(parse("lab(50 0 0)").space).toBe("lab");
    expect(parse("lch(50 20 30)").space).toBe("lch");
    expect(parse("oklab(0.5 0 0)").space).toBe("oklab");
    expect(parse("oklch(0.5 0.1 30)").space).toBe("oklch");
    expect(parse("color(display-p3 1 0 0)").space).toBe("display-p3");
  });

  test("is whitespace and case tolerant", () => {
    expect(parse("  RED  ").coords).toEqual([1, 0, 0]);
  });

  test("throws SyntaxError on invalid input", () => {
    expect(() => parse("not-a-color")).toThrow(SyntaxError);
  });
});

describe("tryParse", () => {
  test("returns null instead of throwing", () => {
    expect(tryParse("not-a-color")).toBeNull();
  });
  test("returns the color on success", () => {
    expect(tryParse("#000")?.coords).toEqual([0, 0, 0]);
  });
});
