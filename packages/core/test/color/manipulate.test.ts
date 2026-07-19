import { describe, expect, test } from "bun:test";
import { convert } from "../../src/color/convert";
import { alpha, complement, darken, desaturate, lighten, negate, rotateHue, saturate } from "../../src/color/manipulate";
import { parse } from "../../src/color/parse";
import { serialize } from "../../src/color/serialize";

const okL = (c: ReturnType<typeof parse>): number => convert(c, "oklch").coords[0];
const okC = (c: ReturnType<typeof parse>): number => convert(c, "oklch").coords[1];
const okH = (c: ReturnType<typeof parse>): number => convert(c, "oklch").coords[2];

describe("lighten / darken", () => {
  test("lighten raises Oklch lightness and preserves space", () => {
    const c = parse("#808080");
    const out = lighten(c, 0.1);
    expect(out.space).toBe("srgb");
    expect(okL(out)).toBeCloseTo(okL(c) + 0.1, 5);
  });
  test("darken lowers lightness", () => {
    const c = parse("#808080");
    expect(okL(darken(c, 0.1))).toBeCloseTo(okL(c) - 0.1, 5);
  });
});

describe("saturate / desaturate", () => {
  test("saturate raises chroma", () => {
    const c = parse("#3366cc");
    expect(okC(saturate(c, 0.2))).toBeGreaterThan(okC(c));
  });
  test("desaturate lowers chroma", () => {
    const c = parse("#3366cc");
    expect(okC(desaturate(c, 0.2))).toBeLessThan(okC(c));
  });
});

describe("rotateHue / complement", () => {
  test("rotateHue shifts hue by the given degrees", () => {
    const c = parse("#3366cc");
    expect(okH(rotateHue(c, 30))).toBeCloseTo((okH(c) + 30) % 360, 3);
  });
  test("complement shifts hue by 180", () => {
    const c = parse("#3366cc");
    expect(okH(complement(c))).toBeCloseTo((okH(c) + 180) % 360, 3);
  });
});

describe("negate / alpha", () => {
  test("negate inverts sRGB channels", () => {
    expect(serialize(negate(parse("red")), "hex")).toBe("#00ffff");
  });
  test("alpha sets the alpha channel", () => {
    expect(alpha(parse("red"), 0.5).alpha).toBe(0.5);
  });
});
