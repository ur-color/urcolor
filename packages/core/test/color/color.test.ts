import { describe, expect, test } from "bun:test";
import { Color } from "../../src/color/color";

describe("construction", () => {
  test("new Color stores space/coords/alpha", () => {
    const c = new Color("srgb", [1, 0, 0]);
    expect(c.space).toBe("srgb");
    expect(c.coords).toEqual([1, 0, 0]);
    expect(c.alpha).toBe(1);
  });

  test("instances are immutable (frozen)", () => {
    const c = new Color("srgb", [1, 0, 0]);
    expect(Object.isFrozen(c)).toBe(true);
    expect(() => {
      // @ts-expect-error runtime immutability check
      c.alpha = 0.5;
    }).toThrow();
  });

  test("coords getter returns a copy, not the internal tuple", () => {
    const c = new Color("srgb", [1, 0, 0]);
    const got = c.coords;
    got[0] = 0;
    expect(c.coords[0]).toBe(1);
  });

  test("Color.from parses a string", () => {
    expect(Color.from("red").coords).toEqual([1, 0, 0]);
  });

  test("Color.from accepts an object and another Color", () => {
    const obj = Color.from({ space: "srgb", coords: [0, 1, 0], alpha: 1 });
    expect(obj.space).toBe("srgb");
    expect(Color.from(obj)).toBe(obj); // Color passes through
  });

  test("Color.from accepts a packed 0xRRGGBB integer", () => {
    expect(Color.from(0xff0000).coords).toEqual([1, 0, 0]);
    expect(Color.from(0x00ff00).toString("hex")).toBe("#00ff00");
    expect(Color.from(0x336699).toString("hex")).toBe("#336699");
  });

  test("Color.from accepts a CSS named color keyword", () => {
    expect(Color.from("tomato").toString("hex")).toBe("#ff6347");
    expect(Color.from("TOMATO").equals(Color.from("tomato"))).toBe(true);
  });

  test("specialized factories use native units", () => {
    expect(Color.fromRgb(255, 0, 0).coords).toEqual([1, 0, 0]);
    expect(Color.fromHex("#00ff00").coords).toEqual([0, 1, 0]);
    expect(Color.fromOklch(0.5, 0.1, 30).space).toBe("oklch");
  });
});

describe("conversion", () => {
  test("to() returns a new Color in the target space", () => {
    const c = Color.from("red").to("oklch");
    expect(c.space).toBe("oklch");
    expect(c.coords[0]).toBeCloseTo(0.6279553606, 4);
  });

  test("toObject returns a plain ColorObject", () => {
    expect(Color.from("red").toObject()).toEqual({
      space: "srgb",
      coords: [1, 0, 0],
      alpha: 1,
    });
  });

  test("inGamut / toGamut", () => {
    const wide = Color.from("oklch(0.7 0.4 30)");
    expect(wide.inGamut("srgb")).toBe(false);
    expect(wide.toGamut("srgb").inGamut("srgb")).toBe(true);
  });
});

describe("updater methods", () => {
  test("with() modifies channels in the current space", () => {
    const c = Color.fromOklch(0.5, 0.1, 30).with({ l: 0.8 });
    expect(c.coords[0]).toBe(0.8);
    expect(c.coords[1]).toBe(0.1);
  });

  test("with() can set alpha", () => {
    expect(Color.from("red").with({ alpha: 0.5 }).alpha).toBe(0.5);
  });

  test("withAlpha()", () => {
    expect(Color.from("red").withAlpha(0.25).alpha).toBe(0.25);
  });

  test("get() reads a named channel", () => {
    expect(Color.fromOklch(0.5, 0.1, 30).get("h")).toBe(30);
  });
});

describe("relations", () => {
  test("equals() compares within epsilon", () => {
    expect(Color.from("red").equals(Color.from("#ff0000"))).toBe(true);
    expect(Color.from("red").equals(Color.from("blue"))).toBe(false);
  });

  test("mix() blends toward another color", () => {
    const m = Color.from("red").mix(Color.from("blue"), 0.5, { space: "oklch" });
    expect(m.space).toBe("oklch");
  });

  test("deltaE() and contrast()", () => {
    expect(Color.from("red").deltaE(Color.from("red"))).toBeCloseTo(0, 6);
    expect(Color.from("black").contrast(Color.from("white"))).toBeCloseTo(21, 2);
  });
});

describe("manipulation methods", () => {
  test("lighten/darken/saturate/rotateHue/negate/complement return Colors", () => {
    const c = Color.from("#3366cc");
    expect(c.lighten(0.1)).toBeInstanceOf(Color);
    expect(c.negate().to("srgb").coords[0]).toBeCloseTo(1 - 0.2, 1);
    expect(c.complement()).toBeInstanceOf(Color);
  });
});

describe("serialization", () => {
  test("toString defaults to the color's own notation", () => {
    expect(Color.from("red").toString()).toBe("rgb(255 0 0)");
  });
  test("toString takes an explicit format", () => {
    expect(Color.from("red").toString("hex")).toBe("#ff0000");
    expect(Color.from("red").toString("oklch")).toContain("oklch(");
  });
  test("toJSON round-trips through Color.from", () => {
    const c = Color.from("oklch(0.5 0.1 30)");
    expect(Color.from(c.toJSON()).equals(c)).toBe(true);
  });
  test("valueOf throws to prevent coercion", () => {
    expect(() => Number(Color.from("red"))).toThrow(TypeError);
  });
});
