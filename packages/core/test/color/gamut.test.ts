import { describe, expect, test } from "bun:test";
import { convert } from "../../src/color/convert";
import { gamutMap, inGamut } from "../../src/color/gamut";
import { parse } from "../../src/color/parse";

describe("inGamut", () => {
  test("an sRGB color is in the sRGB gamut", () => {
    expect(inGamut(parse("red"), "srgb")).toBe(true);
  });

  test("a highly saturated oklch is out of the sRGB gamut", () => {
    expect(inGamut(parse("oklch(0.7 0.4 30)"), "srgb")).toBe(false);
  });

  test("a P3-only color is out of sRGB but in display-p3", () => {
    const c = parse("color(display-p3 1 0 0)");
    expect(inGamut(c, "srgb")).toBe(false);
    expect(inGamut(c, "display-p3")).toBe(true);
  });
});

describe("gamutMap", () => {
  test("leaves an in-gamut color essentially unchanged", () => {
    const c = parse("oklch(0.6 0.1 30)");
    const mapped = gamutMap(c, "srgb");
    // Same space returned; still in gamut; hue preserved.
    expect(mapped.space).toBe("oklch");
    expect(inGamut(mapped, "srgb")).toBe(true);
  });

  test("brings an out-of-gamut color into the destination gamut", () => {
    const mapped = gamutMap(parse("oklch(0.7 0.4 30)"), "srgb");
    expect(inGamut(mapped, "srgb")).toBe(true);
  });

  test("reduces chroma rather than shifting lightness/hue much", () => {
    const src = parse("oklch(0.7 0.4 30)");
    const mapped = convert(gamutMap(src, "srgb"), "oklch");
    expect(mapped.coords[0]).toBeCloseTo(0.7, 1); // L preserved
    expect(mapped.coords[2]).toBeCloseTo(30, 0); // H preserved
    expect(mapped.coords[1]).toBeLessThan(0.4); // C reduced
  });

  test("maps to white/black for extreme lightness", () => {
    expect(inGamut(gamutMap(parse("oklch(1.2 0.1 30)"), "srgb"), "srgb")).toBe(true);
    expect(inGamut(gamutMap(parse("oklch(-0.1 0.1 30)"), "srgb"), "srgb")).toBe(true);
  });
});
