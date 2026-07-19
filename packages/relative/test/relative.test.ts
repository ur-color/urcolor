import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Color, tryParse } from "@urcolor/core";
import { registerRelativeColor } from "../src/index";

let dispose: () => void;
beforeAll(() => { dispose = registerRelativeColor(); });
afterAll(() => { dispose(); });

/** Assert two colors match, comparing in the first one's space. */
const same = (a: string, b: string): void => {
  const x = tryParse(a);
  const y = tryParse(b);
  expect(x).not.toBeNull();
  expect(y).not.toBeNull();
  const yc = Color.from(y!).to(x!.space);
  expect(x!.coords[0]).toBeCloseTo(yc.coords[0], 4);
  expect(x!.coords[1]).toBeCloseTo(yc.coords[1], 4);
  expect(x!.coords[2]).toBeCloseTo(yc.coords[2], 4);
  expect(x!.alpha).toBeCloseTo(yc.alpha, 4);
};

describe("identity — every notation reproduces its origin", () => {
  it("rgb", () => same("rgb(from red r g b)", "red"));
  it("hsl", () => same("hsl(from red h s l)", "red"));
  it("hwb", () => same("hwb(from red h w b)", "red"));
  it("lab", () => same("lab(from red l a b)", "red"));
  it("lch", () => same("lch(from red l c h)", "red"));
  it("oklab", () => same("oklab(from red l a b)", "red"));
  it("oklch", () => same("oklch(from red l c h)", "red"));
  it("color", () => same("color(from red srgb r g b)", "red"));
});

describe("channel substitution and arithmetic", () => {
  it("substitutes a literal for a channel", () => {
    same("rgb(from red 0 g b)", "rgb(0 0 0)");
  });

  it("rotates hue with calc", () => {
    same("hsl(from red calc(h + 180) s l)", "hsl(180 100% 50%)");
  });

  it("scales lightness in oklch", () => {
    const c = tryParse("oklch(from red calc(l * 0.5) c h)");
    const base = tryParse("oklch(from red l c h)");
    expect(c!.coords[0]).toBeCloseTo(base!.coords[0] * 0.5, 6);
    expect(c!.coords[1]).toBeCloseTo(base!.coords[1], 6);
  });

  it("reads the origin in the target space, not sRGB", () => {
    // red's oklch lightness is ~0.628, nothing like its sRGB r of 1.
    const c = tryParse("oklch(from #ff0000 l c h)");
    expect(c!.coords[0]).toBeGreaterThan(0.5);
    expect(c!.coords[0]).toBeLessThan(0.75);
  });

  it("accepts percent-typed channels", () => {
    same("hsl(from red h 50% l)", "hsl(0 50% 50%)");
  });

  it("supports clamp and min/max", () => {
    same("hsl(from red h clamp(0%, 200%, 60%) l)", "hsl(0 60% 50%)");
  });
});

describe("alpha", () => {
  it("passes alpha through", () => {
    const c = tryParse("rgb(from rgb(255 0 0 / 40%) r g b / alpha)");
    expect(c!.alpha).toBeCloseTo(0.4, 4);
  });

  it("computes on alpha", () => {
    const c = tryParse("rgb(from rgb(255 0 0 / 40%) r g b / calc(alpha * 0.5))");
    expect(c!.alpha).toBeCloseTo(0.2, 4);
  });

  it("defaults alpha to the origin's when omitted", () => {
    const c = tryParse("rgb(from rgb(255 0 0 / 40%) r g b)");
    expect(c!.alpha).toBeCloseTo(0.4, 4);
  });

  it("handles an origin with its own alpha and nested parens", () => {
    const c = tryParse("rgb(from rgb(1 2 3 / 40%) r g b / 50%)");
    expect(c!.alpha).toBeCloseTo(0.5, 4);
    expect(c!.coords[0]).toBeCloseTo(1 / 255, 6);
  });

  it("accepts an alpha slash with no surrounding whitespace", () => {
    // `l/0.5` must not reach the math evaluator as one expression: `l` is in
    // scope, so it would silently evaluate to 100/0.5 instead of failing.
    const c = tryParse("hsl(from red h s l/0.5)");
    expect(c).not.toBeNull();
    expect(c!.alpha).toBeCloseTo(0.5, 4);
    const red = Color.from(tryParse("red")!).to("hsl");
    expect(c!.coords[0]).toBeCloseTo(red.coords[0], 4);
    expect(c!.coords[1]).toBeCloseTo(red.coords[1], 4);
    expect(c!.coords[2]).toBeCloseTo(red.coords[2], 4);
  });
});

describe("failure modes all return null", () => {
  it("unparseable origin", () => expect(tryParse("rgb(from nonsense r g b)")).toBeNull());
  it("var() origin", () => expect(tryParse("rgb(from var(--x) r g b)")).toBeNull());
  it("currentcolor origin", () => expect(tryParse("rgb(from currentcolor r g b)")).toBeNull());
  it("unknown channel keyword", () => expect(tryParse("rgb(from red r g q)")).toBeNull());
  it("channel from another notation", () => expect(tryParse("rgb(from red r g l)")).toBeNull());
  it("too few channels", () => expect(tryParse("rgb(from red r g)")).toBeNull());
  it("type mismatch", () => expect(tryParse("hsl(from red h calc(s + 10) l)")).toBeNull());
  it("division by zero", () => expect(tryParse("rgb(from red calc(r / 0) g b)")).toBeNull());
  it("unknown color() space", () => expect(tryParse("color(from red nope r g b)")).toBeNull());
});

describe("absolute parsing is unaffected", () => {
  it("still parses ordinary notations", () => {
    expect(tryParse("rgb(255 0 0)")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("#ff0000")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("oklch(50% 0.1 180)")).not.toBeNull();
  });
});

describe("registration lifecycle", () => {
  // These manipulate the outer registration, so they restore it afterwards.
  it("stops parsing relative syntax once every registration is disposed", () => {
    dispose();
    expect(tryParse("rgb(from red r g b)")).toBeNull();
    dispose = registerRelativeColor();
    expect(tryParse("rgb(from red r g b)")).not.toBeNull();
  });

  it("treats a second dispose as a no-op and leaves other registrations alone", () => {
    const extra = registerRelativeColor();
    extra();
    expect(() => extra()).not.toThrow();
    // The outer registration survives the extra one's double dispose.
    expect(tryParse("rgb(from red r g b)")).not.toBeNull();
  });
});
