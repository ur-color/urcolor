import { describe, expect, it } from "bun:test";
import { Color } from "../src/color/color";
import {
  interpolateStops,
  sampleBilinearGrid,
  sampleChannelGrid,
  sampleConicRing,
  samplePolarGrid,
  sampleTriangleGrid,
} from "../src/gradient";

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

// Helper: read the RGBA bytes at (x, y) out of a sampled grid.
function pixelAt(data: Uint8ClampedArray, w: number, x: number, y: number): [number, number, number, number] {
  const i = (y * w + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
}

describe("sampleChannelGrid", () => {
  it("returns a Uint8ClampedArray of exactly w * h * 4 bytes", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    for (const [w, h] of [[4, 4], [5, 3], [1, 1], [7, 2]] as const) {
      const data = sampleChannelGrid(base, "hsl", "h", "s", 0, 360, 0, 1, w, h);
      expect(data).toBeInstanceOf(Uint8ClampedArray);
      expect(data.length).toBe(w * h * 4);
    }
  });

  it("computes known corner values for an hsl h/s grid", () => {
    // base l=0.5, x -> h (0..360), y -> s (0..1).
    // (h=0, s=0) and (h=360, s=0) are both gray regardless of hue.
    // (h=0, s=1) and (h=360, s=1) are both pure red since hue wraps at 360.
    // A transposed x/y mapping would turn these corners into gray instead.
    const base = Color.fromHsl(0, 1, 0.5);
    const w = 4;
    const h = 4;
    const data = sampleChannelGrid(base, "hsl", "h", "s", 0, 360, 0, 1, w, h);
    expect(data.length).toBe(w * h * 4);
    expect(pixelAt(data, w, 0, 0)).toEqual([128, 128, 128, 255]);
    expect(pixelAt(data, w, w - 1, 0)).toEqual([128, 128, 128, 255]);
    expect(pixelAt(data, w, 0, h - 1)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(data, w, w - 1, h - 1)).toEqual([255, 0, 0, 255]);
  });

  it("forces the alpha byte to 255 when alpha=false", () => {
    const base = Color.fromHsl(0, 1, 0.5, 0.5);
    const data = sampleChannelGrid(base, "hsl", "h", "s", 0, 360, 0, 1, 2, 2, false);
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i]).toBe(255);
    }
  });

  it("tracks the color's alpha when alpha=true", () => {
    const base = Color.fromHsl(0, 1, 0.5, 0.5);
    const data = sampleChannelGrid(base, "hsl", "h", "s", 0, 360, 0, 1, 2, 2, true);
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i]).toBe(128); // round(0.5 * 255)
    }
  });

  it("throws a RangeError for a channel name that doesn't exist in the target space", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    expect(() => sampleChannelGrid(base, "hsl", "nope", "s", 0, 360, 0, 1, 2, 2)).toThrow(RangeError);
  });
});

describe("sampleBilinearGrid", () => {
  it("returns a Uint8ClampedArray of exactly w * h * 4 bytes", () => {
    const tl = Color.parse("red")!;
    const tr = Color.parse("lime")!;
    const bl = Color.parse("blue")!;
    const br = Color.parse("white")!;
    for (const [w, h] of [[3, 3], [6, 2], [1, 1]] as const) {
      const data = sampleBilinearGrid(tl, tr, bl, br, w, h, "srgb");
      expect(data.length).toBe(w * h * 4);
    }
  });

  it("places the corner colors at the corresponding grid corners", () => {
    const tl = Color.parse("red")!;
    const tr = Color.parse("lime")!;
    const bl = Color.parse("blue")!;
    const br = Color.parse("white")!;
    const w = 3;
    const h = 3;
    const data = sampleBilinearGrid(tl, tr, bl, br, w, h, "srgb");
    expect(pixelAt(data, w, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(data, w, w - 1, 0)).toEqual([0, 255, 0, 255]);
    expect(pixelAt(data, w, 0, h - 1)).toEqual([0, 0, 255, 255]);
    expect(pixelAt(data, w, w - 1, h - 1)).toEqual([255, 255, 255, 255]);
  });

  it("respects the alpha parameter for corner colors", () => {
    const tl = Color.parse("rgb(255 0 0 / 0.5)")!;
    const tr = Color.parse("lime")!;
    const bl = Color.parse("blue")!;
    const br = Color.parse("white")!;
    const withAlpha = sampleBilinearGrid(tl, tr, bl, br, 2, 2, "srgb", true);
    expect(pixelAt(withAlpha, 2, 0, 0)).toEqual([255, 0, 0, 128]);
    const withoutAlpha = sampleBilinearGrid(tl, tr, bl, br, 2, 2, "srgb", false);
    expect(pixelAt(withoutAlpha, 2, 0, 0)).toEqual([255, 0, 0, 255]);
  });
});

describe("sampleTriangleGrid", () => {
  const v0 = { x: 0, y: 0 };
  const v1 = { x: 1, y: 0 };
  const v2 = { x: 0, y: 1 };

  it("returns a Uint8ClampedArray of exactly w * h * 4 bytes (2-channel and 3-channel modes)", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    for (const [w, h] of [[5, 5], [4, 6]] as const) {
      const twoChannel = sampleTriangleGrid(base, "hsl", "h", "s", 0, 360, 0, 1, v0, v1, v2, w, h);
      expect(twoChannel.length).toBe(w * h * 4);
      const threeChannel = sampleTriangleGrid(
        base, "hsl", "h", "s", 0, 360, 0, 1, v0, v1, v2, w, h, false, "l", 0, 1,
      );
      expect(threeChannel.length).toBe(w * h * 4);
    }
  });

  it("computes known values at the triangle's own vertices (2-channel mode)", () => {
    // v0 -> (xMax, yMax), v1 -> (xMin, yMax), v2 -> (xMin, yMin), per the
    // 2-channel branch's own documented mapping. Using a non-360 xMax avoids
    // hue wraparound aliasing v0 and v1 to the same color.
    const base = Color.fromHsl(0, 1, 0.5);
    const w = 4;
    const h = 4;
    const data = sampleTriangleGrid(base, "hsl", "h", "s", 0, 270, 0.2, 1, v0, v1, v2, w, h);
    expect(pixelAt(data, w, 0, 0)).toEqual([128, 0, 255, 255]); // v0: hsl(270, 1, .5)
    expect(pixelAt(data, w, w - 1, 0)).toEqual([255, 0, 0, 255]); // v1: hsl(0, 1, .5)
    expect(pixelAt(data, w, 0, h - 1)).toEqual([153, 102, 102, 255]); // v2: hsl(0, 0.2, .5)
  });

  it("forces alpha to 255 when alpha=false and tracks it when alpha=true", () => {
    const base = Color.fromHsl(0, 1, 0.5, 0.5);
    const withAlpha = sampleTriangleGrid(base, "hsl", "h", "s", 0, 270, 0.2, 1, v0, v1, v2, 2, 2, true);
    for (let i = 3; i < withAlpha.length; i += 4) {
      expect(withAlpha[i]).toBe(128);
    }
    const withoutAlpha = sampleTriangleGrid(base, "hsl", "h", "s", 0, 270, 0.2, 1, v0, v1, v2, 2, 2, false);
    for (let i = 3; i < withoutAlpha.length; i += 4) {
      expect(withoutAlpha[i]).toBe(255);
    }
  });

  it("throws a RangeError for a channel name that doesn't exist in the target space", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    expect(() =>
      sampleTriangleGrid(base, "hsl", "nope", "s", 0, 360, 0, 1, v0, v1, v2, 2, 2),
    ).toThrow(RangeError);
  });
});

describe("samplePolarGrid", () => {
  it("returns a Uint8ClampedArray of exactly w * h * 4 bytes", () => {
    const base = Color.fromHsl(0, 0, 0.5);
    for (const [w, h] of [[5, 5], [7, 3], [4, 4]] as const) {
      const data = samplePolarGrid(base, "hsl", "h", "s", 0, 360, 0, 1, w, h);
      expect(data.length).toBe(w * h * 4);
    }
  });

  it("computes known values at the cardinal points of the ring", () => {
    // angle -> h (0..360), radius -> s (0..1), base l=0.5, startAngle=0.
    // Top of the ring is angle 0 (h=0, full radius -> red); bottom is
    // angle 180 (h=180 -> cyan); left is 270 (h=270 -> violet);
    // right is 90 (h=90 -> chartreuse). Cross-checked against Color directly.
    const base = Color.fromHsl(0, 0, 0.5);
    const w = 5;
    const h = 5;
    const data = samplePolarGrid(base, "hsl", "h", "s", 0, 360, 0, 1, w, h);
    expect(pixelAt(data, w, 2, 0)).toEqual([255, 0, 0, 255]); // top
    expect(pixelAt(data, w, 2, h - 1)).toEqual([0, 255, 255, 255]); // bottom
    expect(pixelAt(data, w, 0, 2)).toEqual([128, 0, 255, 255]); // left
    expect(pixelAt(data, w, w - 1, 2)).toEqual([128, 255, 0, 255]); // right
  });

  it("forces alpha to 255 when alpha=false and tracks it when alpha=true", () => {
    const base = Color.fromHsl(0, 1, 0.5, 0.5);
    const withAlpha = samplePolarGrid(base, "hsl", "h", "s", 0, 360, 0, 1, 2, 2, 0, true);
    for (let i = 3; i < withAlpha.length; i += 4) {
      expect(withAlpha[i]).toBe(128);
    }
    const withoutAlpha = samplePolarGrid(base, "hsl", "h", "s", 0, 360, 0, 1, 2, 2, 0, false);
    for (let i = 3; i < withoutAlpha.length; i += 4) {
      expect(withoutAlpha[i]).toBe(255);
    }
  });

  it("throws a RangeError for a channel name that doesn't exist in the target space", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    expect(() =>
      samplePolarGrid(base, "hsl", "nope", "s", 0, 360, 0, 1, 2, 2),
    ).toThrow(RangeError);
  });
});

describe("sampleConicRing", () => {
  it("returns a Uint8ClampedArray of exactly w * h * 4 bytes", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    for (const [w, h] of [[5, 5], [8, 2], [3, 3]] as const) {
      const data = sampleConicRing(base, "hsl", "h", 0, 360, w, h);
      expect(data.length).toBe(w * h * 4);
    }
  });

  it("computes known values at the top and bottom of the ring", () => {
    // channel -> h (0..360), base s=1, l=0.5, startAngle=0.
    // Top of the ring is angle 0 (h=0 -> red); bottom is angle 180 (h=180 -> cyan).
    const base = Color.fromHsl(0, 1, 0.5);
    const w = 5;
    const h = 5;
    const data = sampleConicRing(base, "hsl", "h", 0, 360, w, h);
    expect(pixelAt(data, w, 2, 0)).toEqual([255, 0, 0, 255]); // top
    expect(pixelAt(data, w, 2, h - 1)).toEqual([0, 255, 255, 255]); // bottom
  });

  it("forces alpha to 255 when alpha=false and tracks it when alpha=true", () => {
    const base = Color.fromHsl(0, 1, 0.5, 0.5);
    const withAlpha = sampleConicRing(base, "hsl", "h", 0, 360, 2, 2, 0, true);
    for (let i = 3; i < withAlpha.length; i += 4) {
      expect(withAlpha[i]).toBe(128);
    }
    const withoutAlpha = sampleConicRing(base, "hsl", "h", 0, 360, 2, 2, 0, false);
    for (let i = 3; i < withoutAlpha.length; i += 4) {
      expect(withoutAlpha[i]).toBe(255);
    }
  });

  it("throws a RangeError for a channel name that doesn't exist in the target space", () => {
    const base = Color.fromHsl(0, 1, 0.5);
    expect(() => sampleConicRing(base, "hsl", "nope", 0, 360, 2, 2)).toThrow(RangeError);
  });
});
