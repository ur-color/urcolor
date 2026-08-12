import { describe, expect, test } from "bun:test";
import { Color } from "@urcolor/core";
import {
  applyChannelOverrides,
  gradientOpacity,
  sliderStops,
  SLIDER_CANVAS_STEPS,
} from "./gradient-stops";

const BASE = Color.parse("hsl(210, 80%, 50%)")!;

describe("applyChannelOverrides", () => {
  test("returns the base untouched when overrides are false", () => {
    expect(applyChannelOverrides(BASE, "hsl", false)).toBe(BASE);
  });

  test("locks alpha", () => {
    const result = applyChannelOverrides(BASE.withAlpha(0.4), "hsl", { alpha: 1 });
    expect(result.alpha).toBe(1);
  });

  test("ignores channels the space does not have", () => {
    const result = applyChannelOverrides(BASE, "hsl", { nonsense: 5, s: 0.2 });
    expect(Math.round(result.to("hsl").get("s") * 100)).toBe(20);
  });
});

describe("gradientOpacity", () => {
  test("is 1 for the alpha channel itself", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "alpha", { alpha: 1 })).toBe(1);
  });

  test("is 1 when alpha is locked by an override", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "h", { alpha: 1 })).toBe(1);
  });

  test("follows the color's alpha when nothing locks it", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "h", false)).toBeCloseTo(0.3, 5);
  });

  test("follows the color's alpha when the overrides omit it", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "h", { s: 1 })).toBeCloseTo(0.3, 5);
  });
});

describe("sliderStops", () => {
  test("sweeps the channel across its native range", () => {
    const stops = sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "h",
      steps: SLIDER_CANVAS_STEPS,
      mirrored: false,
    })!;
    expect(stops.length).toBe(SLIDER_CANVAS_STEPS);
    expect(Math.round(stops[0]!.to("hsl").get("h"))).toBe(0);
    expect(Math.round(stops.at(-1)!.to("hsl").get("h"))).toBe(360);
  });

  test("returns a transparent-to-opaque pair for the alpha channel", () => {
    const stops = sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "alpha",
      steps: SLIDER_CANVAS_STEPS,
      mirrored: false,
    })!;
    expect(stops.length).toBe(2);
    expect(stops[0]!.alpha).toBe(0);
    expect(stops[1]!.alpha).toBe(1);
  });

  test("reverses the stops when mirrored", () => {
    const plain = sliderStops({ color: BASE, colorSpace: "hsl", channel: "h", steps: 4, mirrored: false })!;
    const mirrored = sliderStops({ color: BASE, colorSpace: "hsl", channel: "h", steps: 4, mirrored: true })!;
    expect(mirrored.map(c => Math.round(c.to("hsl").get("h"))))
      .toEqual(plain.map(c => Math.round(c.to("hsl").get("h"))).reverse());
  });

  test("uses explicit colors when given", () => {
    const stops = sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "h",
      colors: ["#ff0000", "#0000ff"],
      steps: 4,
      mirrored: false,
    })!;
    expect(stops.length).toBe(2);
  });

  test("returns null when an explicit color fails to parse", () => {
    expect(sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "h",
      colors: ["#ff0000", "not-a-color"],
      steps: 4,
      mirrored: false,
    })).toBeNull();
  });

  test("returns null for fewer than two explicit colors", () => {
    expect(sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "h",
      colors: ["#ff0000"],
      steps: 4,
      mirrored: false,
    })).toBeNull();
  });

  test("densifies to the interpolation step count when a space is given", () => {
    const stops = sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "h",
      steps: 4,
      mirrored: false,
      interpolationSpace: "oklab",
    })!;
    expect(stops.length).toBe(32);
  });

  test("returns null for a channel the space does not have", () => {
    expect(sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "nonsense",
      steps: 4,
      mirrored: false,
    })).toBeNull();
  });

  test("holds the overridden channels fixed across the sweep", () => {
    const stops = sliderStops({
      color: BASE,
      colorSpace: "hsl",
      channel: "h",
      channelOverrides: { s: 0.5, alpha: 1 },
      steps: 4,
      mirrored: false,
    })!;
    for (const stop of stops) {
      expect(Math.round(stop.to("hsl").get("s") * 100)).toBe(50);
      expect(stop.alpha).toBe(1);
    }
  });

  test("defaults to locking alpha when no overrides are given", () => {
    const stops = sliderStops({
      color: BASE.withAlpha(0.25),
      colorSpace: "hsl",
      channel: "h",
      steps: 4,
      mirrored: false,
    })!;
    expect(stops.every(stop => stop.alpha === 1)).toBe(true);
  });
});
