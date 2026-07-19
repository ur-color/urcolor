import { describe, expect, it } from "bun:test";
import { Color } from "../../src/color/color";

describe("Color.parse", () => {
  it("returns a Color for valid input", () => {
    const c = Color.parse("#ff0000");
    expect(c).not.toBeNull();
    expect(c?.space).toBe("srgb");
    expect(c?.get("r")).toBeCloseTo(1, 6);
  });

  it("returns null for unparseable input", () => {
    expect(Color.parse("not-a-color")).toBeNull();
    expect(Color.parse("")).toBeNull();
    expect(Color.parse("#gggggg")).toBeNull();
  });

  it("does not throw where from() would", () => {
    expect(() => Color.parse("garbage")).not.toThrow();
    expect(() => Color.from("garbage")).toThrow();
  });
});

describe("Color#with", () => {
  it("sets channels in the current space", () => {
    const c = Color.from("hsl(210 80% 50%)").with({ l: 0.25 });
    expect(c.space).toBe("hsl");
    expect(c.get("h")).toBeCloseTo(210, 6);
    expect(c.get("l")).toBeCloseTo(0.25, 6);
  });

  it("converts first when given a target space", () => {
    const c = Color.from("hsl(210 80% 50%)").with({ space: "hsv", v: 0.4 });
    expect(c.space).toBe("hsv");
    expect(c.get("v")).toBeCloseTo(0.4, 6);
    // Hue survives the hsl -> hsv conversion.
    expect(c.get("h")).toBeCloseTo(210, 4);
  });

  it("converts with no channel overrides", () => {
    const c = Color.from("#ff0000").with({ space: "oklch" });
    expect(c.space).toBe("oklch");
    expect(c.get("h")).toBeCloseTo(Color.from("#ff0000").to("oklch").get("h"), 6);
  });

  it("sets alpha alongside a space change", () => {
    const c = Color.from("#ff0000").with({ space: "hsl", alpha: 0.5 });
    expect(c.space).toBe("hsl");
    expect(c.alpha).toBe(0.5);
  });

  it("validates channels against the target space", () => {
    // `v` exists in hsv but not hsl.
    expect(() => Color.from("#ff0000").with({ space: "hsl", v: 0.5 })).toThrow(RangeError);
    expect(() => Color.from("#ff0000").with({ space: "hsv", v: 0.5 })).not.toThrow();
  });

  it("leaves the receiver unchanged", () => {
    const a = Color.from("hsl(210 80% 50%)");
    a.with({ space: "hsv", v: 0.4 });
    expect(a.space).toBe("hsl");
    expect(a.get("l")).toBeCloseTo(0.5, 6);
  });

  it("keeps alpha: 0 (falsy but valid)", () => {
    const c = Color.from("hsl(210 80% 50%)").with({ alpha: 0 });
    expect(c.alpha).toBe(0);
  });

  it("skips an explicit undefined channel value, leaving it unchanged", () => {
    const c = Color.from("hsl(210 80% 50%)").with({ l: undefined });
    expect(c.get("l")).toBeCloseTo(0.5, 6);
  });

  it("is a no-op for an empty patch", () => {
    const a = Color.from("hsl(210 80% 50%)");
    const b = a.with({});
    expect(b.equals(a)).toBe(true);
  });

  it("throws TypeError when a non-number reaches a channel slot", () => {
    // The `ColorPatch` type admits `SpaceId` strings so `space` can coexist
    // with the index signature; this pins the runtime guard that rejects
    // that string when it lands on a channel instead of `space`/`alpha`.
    expect(() => Color.from("hsl(210 80% 50%)").with({ h: "hsv" })).toThrow(TypeError);
  });
});
