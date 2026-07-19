import { describe, expect, it } from "bun:test";
import { Color } from "../src/color/color";
import { interpolateStops } from "../src/gradient";

describe("interpolateStops", () => {
  it("returns copy of input if less than 2 colors", () => {
    const c = Color.parse("red")!;
    const result = interpolateStops([c], 5, "hsl");
    expect(result).toHaveLength(1);
  });

  it("returns correct number of steps", () => {
    const a = Color.parse("red")!;
    const b = Color.parse("blue")!;
    const result = interpolateStops([a, b], 10, "hsl");
    expect(result).toHaveLength(10);
  });

  it("first and last stops match input colors approximately", () => {
    const a = Color.parse("hsl(0, 100%, 50%)")!;
    const b = Color.parse("hsl(120, 100%, 50%)")!;
    const result = interpolateStops([a, b], 5, "hsl");
    // First stop should be close to red
    const first = result[0]!;
    expect(first.get("r")).toBeGreaterThan(0.9);
    // Last stop should be close to green
    const last = result[4]!;
    expect(last.get("g")).toBeGreaterThan(0.9);
  });

  it("works with 3+ color stops", () => {
    const colors = [
      Color.parse("red")!,
      Color.parse("green")!,
      Color.parse("blue")!,
    ];
    const result = interpolateStops(colors, 11, "srgb");
    expect(result).toHaveLength(11);
  });

  it("results are in srgb color space", () => {
    const a = Color.parse("hsl(0, 100%, 50%)")!;
    const b = Color.parse("hsl(240, 100%, 50%)")!;
    const result = interpolateStops([a, b], 3, "hsl");
    for (const c of result) {
      expect(c.space).toBe("srgb");
    }
  });
});
