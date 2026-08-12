import { describe, expect, test } from "bun:test";
import { Color } from "@urcolor/core";
import {
  alphaAxisPixels,
  areaCssLayers,
  paintAreaSurface,
  SURFACE_GRID,
  surfaceOpacity,
} from "./surface-gradients";

const BASE = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * A canvas stub. The paint functions only reach a 2D context to blit into, so
 * recording that a blit happened is enough to prove a path ran.
 */
function fakeCanvas() {
  const blits: string[] = [];
  const canvas = {
    width: 64,
    height: 64,
    clientWidth: 64,
    clientHeight: 64,
    getContext(kind: string) {
      if (kind !== "2d") return null;
      return {
        canvas,
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        putImageData: () => blits.push("put"),
        drawImage: () => blits.push("draw"),
        clearRect: () => {},
        setTransform: () => {},
        scale: () => {},
      };
    },
  };
  return { blits, canvas: canvas as unknown as HTMLCanvasElement };
}

const AXES = {
  colorSpace: "hsv" as const,
  slidingFromLeft: true,
  slidingFromTop: true,
};

describe("surfaceOpacity", () => {
  test("is 1 when an axis is alpha", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), true, { alpha: 1 })).toBe(1);
  });

  test("is 1 when alpha is locked by an override", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), false, { alpha: 1 })).toBe(1);
  });

  test("follows the color's alpha when nothing locks it", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), false, false)).toBeCloseTo(0.3, 5);
  });

  test("follows the color's alpha when the overrides omit it", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), false, { s: 1 })).toBeCloseTo(0.3, 5);
  });
});

describe("paintAreaSurface", () => {
  test("returns without painting when both axes are alpha", () => {
    const { canvas, blits } = fakeCanvas();
    paintAreaSurface({
      ...AXES, canvas, color: BASE, xChannel: "alpha", yChannel: "alpha", overrides: false,
    });
    expect(blits.length).toBe(0);
  });

  test("survives every axis combination", () => {
    const { canvas } = fakeCanvas();
    const combinations: [string, string][] = [["s", "v"], ["s", "alpha"], ["alpha", "v"]];
    for (const [xChannel, yChannel] of combinations) {
      expect(() => paintAreaSurface({
        ...AXES, canvas, color: BASE, xChannel, yChannel, overrides: { alpha: 1 },
      })).not.toThrow();
    }
  });

  test("survives interpolated corners", () => {
    const { canvas } = fakeCanvas();
    // Only the CPU path is exercised here. The other one goes through
    // `drawGradient`, which throws "WebGL not supported" outside a browser.
    expect(() => paintAreaSurface({
      ...AXES,
      canvas,
      color: BASE,
      xChannel: "s",
      yChannel: "v",
      overrides: false,
      corners: ["#f00", "#0f0", "#00f", "#fff"],
      interpolationSpace: "oklab",
    })).not.toThrow();
  });

  test("returns without painting when a corner fails to parse", () => {
    const { canvas, blits } = fakeCanvas();
    paintAreaSurface({
      ...AXES,
      canvas,
      color: BASE,
      xChannel: "s",
      yChannel: "v",
      overrides: false,
      corners: ["#f00", "not-a-color", "#00f", "#fff"],
      interpolationSpace: "oklab",
    });
    expect(blits.length).toBe(0);
  });
});

describe("alphaAxisPixels", () => {
  const axes = { ...AXES, xChannel: "s", yChannel: "alpha" };

  test("returns a full RGBA grid", () => {
    const pixels = alphaAxisPixels(BASE, axes, "s")!;
    expect(pixels.length).toBe(SURFACE_GRID * SURFACE_GRID * 4);
  });

  test("runs alpha from transparent to opaque down the y axis", () => {
    const pixels = alphaAxisPixels(BASE, axes, "s")!;
    const topLeftAlpha = pixels[3];
    const bottomLeftAlpha = pixels[((SURFACE_GRID - 1) * SURFACE_GRID) * 4 + 3];
    expect(topLeftAlpha).toBe(0);
    expect(bottomLeftAlpha).toBe(255);
  });

  test("mirrors the alpha axis when the surface slides from the bottom", () => {
    const pixels = alphaAxisPixels(BASE, { ...axes, slidingFromTop: false }, "s")!;
    expect(pixels[3]).toBe(255);
    expect(pixels[((SURFACE_GRID - 1) * SURFACE_GRID) * 4 + 3]).toBe(0);
  });

  test("returns null for a channel the space does not have", () => {
    expect(alphaAxisPixels(BASE, axes, "nonsense")).toBeNull();
  });
});

describe("areaCssLayers", () => {
  test("builds channel layers when no corners are given", () => {
    const layers = areaCssLayers({
      ...AXES, color: BASE, xChannel: "s", yChannel: "v", overrides: { alpha: 1 },
    });
    expect(layers).not.toBeNull();
    expect(layers!.length).toBeGreaterThan(0);
  });

  test("treats an alpha axis as having no channel", () => {
    const layers = areaCssLayers({
      ...AXES, color: BASE, xChannel: "s", yChannel: "alpha", overrides: false,
    });
    expect(layers).not.toBeNull();
  });

  test("stays on the canvas when corners are interpolated", () => {
    const layers = areaCssLayers({
      ...AXES,
      color: BASE,
      xChannel: "s",
      yChannel: "v",
      overrides: false,
      corners: ["#f00", "#0f0", "#00f", "#fff"],
      interpolationSpace: "oklab",
    });
    expect(layers).toBeNull();
  });

  test("builds a bilinear recipe from plain corners", () => {
    const layers = areaCssLayers({
      ...AXES,
      color: BASE,
      xChannel: "s",
      yChannel: "v",
      overrides: false,
      corners: ["#f00", "#0f0", "#00f", "#fff"],
    });
    expect(layers).not.toBeNull();
  });
});

describe("SURFACE_GRID", () => {
  test("is the sample resolution the surfaces share", () => {
    expect(SURFACE_GRID).toBe(64);
  });
});
