import { describe, expect, test } from "bun:test";
import { interpolate, mix } from "../../src/color/interpolate";
import { parse } from "../../src/color/parse";
import type { ColorObject } from "../../src/color/types";

describe("interpolate", () => {
  test("t=0 and t=1 return the endpoints (converted to the space)", () => {
    const f = interpolate(parse("red"), parse("blue"), { space: "oklab" });
    expect(f(0).space).toBe("oklab");
    // t=0 equals red converted to oklab; t=1 equals blue.
    expect(f(0).coords[0]).toBeCloseTo(0.6279553606, 4);
    expect(f(1).coords[0]).toBeCloseTo(0.4520137183, 4);
  });

  test("midpoint in oklab is the average of endpoint coords", () => {
    const a = { space: "oklab", coords: [0.4, -0.1, 0.2], alpha: 1 } satisfies ColorObject;
    const b = { space: "oklab", coords: [0.8, 0.1, -0.2], alpha: 1 } satisfies ColorObject;
    const m = interpolate(a, b, { space: "oklab" })(0.5);
    expect(m.coords[0]).toBeCloseTo(0.6, 6);
    expect(m.coords[1]).toBeCloseTo(0, 6);
    expect(m.coords[2]).toBeCloseTo(0, 6);
  });

  test("interpolates alpha (premultiplied)", () => {
    const a = { space: "oklab", coords: [0.5, 0, 0], alpha: 0 } satisfies ColorObject;
    const b = { space: "oklab", coords: [0.5, 0, 0], alpha: 1 } satisfies ColorObject;
    expect(interpolate(a, b, { space: "oklab" })(0.5).alpha).toBeCloseTo(0.5, 6);
  });
});

describe("hue interpolation methods (oklch)", () => {
  const a = { space: "oklch", coords: [0.5, 0.1, 20], alpha: 1 } satisfies ColorObject;
  const b = { space: "oklch", coords: [0.5, 0.1, 320], alpha: 1 } satisfies ColorObject;
  const mid = (hue: "shorter" | "longer" | "increasing" | "decreasing"): number =>
    ((interpolate(a, b, { space: "oklch", hue })(0.5).coords[2] % 360) + 360) % 360;

  test("shorter takes the short arc", () => expect(mid("shorter")).toBeCloseTo(350, 4));
  test("longer takes the long arc", () => expect(mid("longer")).toBeCloseTo(170, 4));
  test("increasing forces ascending hue", () => expect(mid("increasing")).toBeCloseTo(170, 4));
  test("decreasing forces descending hue", () => expect(mid("decreasing")).toBeCloseTo(350, 4));
});

describe("mix", () => {
  test("defaults to a 50% mix in oklab", () => {
    const m = mix(parse("red"), parse("blue"));
    expect(m.space).toBe("oklab");
  });

  test("amount 0 returns the first color", () => {
    const m = mix(parse("red"), parse("blue"), 0, { space: "oklch" });
    expect(m.coords[0]).toBeCloseTo(0.6279553606, 4); // red's oklch L
  });
});
