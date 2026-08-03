/**
 * Equivalence guards for the hoisted grid samplers.
 *
 * The samplers used to evaluate `baseColor.with({ space, [ch]: v }).to("srgb")`
 * once per pixel. That work is now hoisted — channel indices resolved once, one
 * scratch coordinate tuple reused — which must not change a single output byte.
 * These tests re-derive the expected pixels through the untouched public API,
 * so they fail if the fast path and the object API ever diverge.
 */

import { describe, expect, it } from "bun:test";
import { Color, type SpaceId } from "@urcolor/core";
import {
  interpolateStops,
  sampleBilinearGrid,
  sampleChannelGrid,
  sampleConicRing,
  samplePolarGrid,
  sampleTriangleGrid,
} from "../src/gradient";

const BASE = Color.parse("#3b82f6")!;

/** The reference pixel: exactly what the old per-pixel path computed. */
function expected(base: Color, space: SpaceId, patch: Record<string, number>, alpha = false): number[] {
  const rgb = base.with({ space, ...patch }).to("srgb");
  return [
    Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255),
    Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255),
    Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255),
    alpha ? Math.round(rgb.alpha * 255) : 255,
  ];
}

describe("sampleChannelGrid", () => {
  it("matches the object API pixel for pixel", () => {
    const [w, h] = [7, 5];
    const data = sampleChannelGrid(BASE, "hsv", "s", "v", 0, 1, 1, 0, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const want = expected(BASE, "hsv", {
          s: 0 + (x / (w - 1)) * 1,
          v: 1 + (y / (h - 1)) * (0 - 1),
        });
        expect([...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]).toEqual(want);
      }
    }
  });

  it("lets the y axis win when both axes name the same channel", () => {
    // The old implementation built `{ [xChannel]: xVal, [yChannel]: yVal }`, so
    // a duplicate key kept the *y* value. Hoisting the writes must preserve it.
    const [w, h] = [5, 4];
    const data = sampleChannelGrid(BASE, "hsv", "s", "s", 0, 1, 1, 0, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const want = expected(BASE, "hsv", { s: 1 + (y / (h - 1)) * (0 - 1) });
        expect([...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]).toEqual(want);
      }
    }
  });

  it("carries alpha through when asked", () => {
    const faded = BASE.withAlpha(0.4);
    const data = sampleChannelGrid(faded, "hsv", "s", "v", 0, 1, 1, 0, 3, 3, true);
    expect(data[3]).toBe(Math.round(0.4 * 255));
  });

  it("throws for a channel the space does not have", () => {
    expect(() => sampleChannelGrid(BASE, "hsv", "nope", "v", 0, 1, 0, 1, 4, 4)).toThrow(RangeError);
    expect(() => sampleChannelGrid(BASE, "hsv", "s", "nope", 0, 1, 0, 1, 4, 4)).toThrow(RangeError);
  });
});

describe("sampleConicRing", () => {
  it("matches the object API pixel for pixel", () => {
    const [w, h] = [9, 7];
    const data = sampleConicRing(BASE, "oklch", "h", 0, 360, w, h);
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += 2 * Math.PI;
        const want = expected(BASE, "oklch", { h: 0 + (angle / (2 * Math.PI)) * 360 });
        expect([...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]).toEqual(want);
      }
    }
  });

  it("honours a start angle", () => {
    const a = sampleConicRing(BASE, "oklch", "h", 0, 360, 8, 8, 0);
    const b = sampleConicRing(BASE, "oklch", "h", 0, 360, 8, 8, 90);
    expect([...a]).not.toEqual([...b]);
  });

  it("throws for an unknown channel", () => {
    expect(() => sampleConicRing(BASE, "oklch", "nope", 0, 360, 4, 4)).toThrow(RangeError);
  });
});

describe("samplePolarGrid", () => {
  it("matches the object API pixel for pixel", () => {
    const [w, h] = [7, 7];
    const data = samplePolarGrid(BASE, "oklch", "h", "c", 0, 360, 0, 0.4, w, h);
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += 2 * Math.PI;
        const want = expected(BASE, "oklch", {
          h: 0 + (angle / (2 * Math.PI)) * 360,
          c: 0 + r * 0.4,
        });
        expect([...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]).toEqual(want);
      }
    }
  });

  it("throws for an unknown channel", () => {
    expect(() => samplePolarGrid(BASE, "oklch", "h", "nope", 0, 360, 0, 1, 4, 4)).toThrow(RangeError);
  });
});

describe("sampleTriangleGrid", () => {
  const V0 = { x: 1, y: 0 };
  const V1 = { x: 0, y: 1 };
  const V2 = { x: 0, y: 0 };

  it("keeps 2- and 3-channel modes distinct", () => {
    const two = sampleTriangleGrid(BASE, "srgb", "r", "g", 0, 1, 0, 1, V0, V1, V2, 9, 9);
    const three = sampleTriangleGrid(BASE, "srgb", "r", "g", 0, 1, 0, 1, V0, V1, V2, 9, 9, false, "b", 0, 1);
    expect([...two]).not.toEqual([...three]);
  });

  it("throws for an unknown channel in either mode", () => {
    expect(() => sampleTriangleGrid(BASE, "srgb", "nope", "g", 0, 1, 0, 1, V0, V1, V2, 4, 4)).toThrow(RangeError);
    expect(() => sampleTriangleGrid(BASE, "srgb", "r", "g", 0, 1, 0, 1, V0, V1, V2, 4, 4, false, "nope", 0, 1))
      .toThrow(RangeError);
  });
});

describe("sampleBilinearGrid", () => {
  it("matches per-pixel mixing of the four corners", () => {
    const [w, h] = [6, 5];
    const tl = BASE;
    const tr = Color.parse("#ef4444")!;
    const bl = Color.parse("oklch(0.7 0.2 140)")!;
    const br = Color.parse("#eab308")!;
    const space: SpaceId = "oklab";
    const data = sampleBilinearGrid(tl, tr, bl, br, w, h, space);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const vx = x / (w - 1);
        const vy = y / (h - 1);
        const rgb = tl.mix(tr, vx, { space }).mix(bl.mix(br, vx, { space }), vy, { space }).to("srgb");
        const want = [
          Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255),
          Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255),
          Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255),
          255,
        ];
        expect([...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]).toEqual(want);
      }
    }
  });

  it("gives the corners back at the corners", () => {
    const tr = Color.parse("#ef4444")!;
    const data = sampleBilinearGrid(BASE, tr, BASE, tr, 5, 5, "oklab");
    const topLeft = [...data.slice(0, 3)];
    expect(topLeft).toEqual([...expected(BASE, "srgb", {})].slice(0, 3));
  });
});

describe("interpolateStops", () => {
  it("matches mixing each segment through the object API", () => {
    const colors = [BASE, Color.parse("#ef4444")!, Color.parse("oklch(0.7 0.2 140)")!];
    const space: SpaceId = "oklab";
    for (const steps of [2, 3, 7, 11]) {
      const got = interpolateStops(colors, steps, space);
      expect(got).toHaveLength(steps);
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const segment = t * (colors.length - 1);
        const idx = Math.min(Math.floor(segment), colors.length - 2);
        const want = colors[idx]!.mix(colors[idx + 1]!, segment - idx, { space }).to("srgb");
        expect(got[i]!.coords).toEqual(want.coords);
        expect(got[i]!.alpha).toBe(want.alpha);
        expect(got[i]!.space).toBe("srgb");
      }
    }
  });

  it("still short-circuits for fewer than two colors", () => {
    expect(interpolateStops([BASE], 5, "oklab")).toHaveLength(1);
    expect(interpolateStops([], 5, "oklab")).toHaveLength(0);
  });
});
