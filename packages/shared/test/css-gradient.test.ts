import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import {
  channelStops,
  collapseLayers,
  cssAreaBilinear,
  cssAreaChannels,
  cssConicStops,
  cssLinearStops,
  cssWheelPolar,
  CYCLIC_STEPS,
  DEFAULT_STEPS,
  defaultStepsFor,
  isCyclicChannel,
} from "../src/css-gradient";

const BASE = Color.parse("hsl(210, 80%, 50%)")!;
const RED = Color.parse("red")!;
const BLUE = Color.parse("blue")!;
const LIME = Color.parse("lime")!;
const YELLOW = Color.parse("yellow")!;

/**
 * Composite `src` over `dst` in gamma sRGB — what a browser does for a
 * background layer, and the space HSV and HSL are themselves defined in.
 */
function over(src: number[], dst: number[], a: number): number[] {
  return [0, 1, 2].map(i => src[i]! * a + dst[i]! * (1 - a));
}

function rgb(color: Color): number[] {
  const s = color.to("srgb");
  return [s.get("r"), s.get("g"), s.get("b")].map(v => Math.max(0, Math.min(1, v)));
}

function maxError(a: number[], b: number[]): number {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));
}

describe("cssLinearStops", () => {
  it("converts the components' angle to CSS's clockwise-from-top origin", () => {
    // 0 is left-to-right, which CSS writes as 90deg.
    expect(cssLinearStops([RED, BLUE], 0)![0]!.image)
      .toBe("linear-gradient(90deg, rgb(255 0 0) 0%, rgb(0 0 255) 100%)");
    // 90 is top-to-bottom, which CSS writes as 180deg.
    expect(cssLinearStops([RED, BLUE], 90)![0]!.image).toStartWith("linear-gradient(180deg, ");
  });

  it("normalises the angle past a full turn and below zero", () => {
    expect(cssLinearStops([RED, BLUE], 360)![0]!.image).toStartWith("linear-gradient(90deg, ");
    expect(cssLinearStops([RED, BLUE], -90)![0]!.image).toStartWith("linear-gradient(0deg, ");
  });

  it("spaces stops evenly across 0–100%", () => {
    const stops = channelStops(BASE, "hsl", "l", { steps: 3 })!;
    expect(cssLinearStops(stops, 0)![0]!.image)
      .toBe("linear-gradient(90deg, rgb(0 0 0) 0%, rgb(25 128 230) 50%, rgb(255 255 255) 100%)");
  });

  it("serialises every stop to rgb(), never to the color's own notation", () => {
    const stops = channelStops(BASE.to("oklch"), "oklch", "c", { steps: 4 })!;
    const image = cssLinearStops(stops, 0)![0]!.image;
    expect(image).not.toContain("oklch");
    expect(image.match(/rgb\(/g)).toHaveLength(4);
  });

  it("returns null for fewer than two stops", () => {
    expect(cssLinearStops([RED], 0)).toBeNull();
    expect(cssLinearStops([], 0)).toBeNull();
  });
});

describe("cssConicStops", () => {
  it("passes the start angle through and spreads stops across 360deg", () => {
    const stops = channelStops(BASE, "hsl", "h", { steps: 4 })!;
    expect(cssConicStops(stops, 30)![0]!.image).toBe(
      "conic-gradient(from 30deg, rgb(230 25 25) 0deg, rgb(25 230 25) 120deg, "
      + "rgb(25 25 230) 240deg, rgb(230 25 25) 360deg)",
    );
  });

  it("returns null for fewer than two stops", () => {
    expect(cssConicStops([RED], 0)).toBeNull();
  });
});

describe("cssAreaBilinear", () => {
  it("puts the bottom row underneath and masks the top row with a vertical ramp", () => {
    expect(cssAreaBilinear(RED, BLUE, LIME, YELLOW)).toEqual([
      { image: "linear-gradient(to right, rgb(0 255 0), rgb(255 255 0))" },
      {
        image: "linear-gradient(to right, rgb(255 0 0), rgb(0 0 255))",
        mask: "linear-gradient(to top, rgb(0 0 0 / 0), #000)",
      },
    ]);
  });

  it("reproduces bilinear interpolation exactly", () => {
    const [a, b, c, d] = [rgb(RED), rgb(BLUE), rgb(LIME), rgb(YELLOW)];
    let worst = 0;
    for (let xi = 0; xi <= 20; xi++) {
      for (let yi = 0; yi <= 20; yi++) {
        const x = xi / 20;
        const y = yi / 20;
        // The mask sets the top layer's alpha to y.
        const layered = over(over(b, a, x), over(d, c, x), y);
        const truth = [0, 1, 2].map(i =>
          (a[i]! * (1 - x) + b[i]! * x) * y + (c[i]! * (1 - x) + d[i]! * x) * (1 - y));
        worst = Math.max(worst, maxError(layered, truth));
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });
});

describe("cssAreaChannels — HSV s × v", () => {
  const base = BASE.to("hsv");

  it("stacks the hue, then white, then black", () => {
    expect(cssAreaChannels(base, "hsv", "s", "v", true, false)).toEqual([
      { image: "linear-gradient(rgb(0 128 255), rgb(0 128 255))" },
      { image: "linear-gradient(to right, #fff, rgb(255 255 255 / 0))" },
      { image: "linear-gradient(to top, #000, rgb(0 0 0 / 0))" },
    ]);
  });

  it("swaps the layer directions when the axes are swapped", () => {
    const layers = cssAreaChannels(base, "hsv", "v", "s", true, false)!;
    // s is now on y and slides from the bottom; v is on x and slides from the left.
    expect(layers[1]!.image).toBe("linear-gradient(to top, #fff, rgb(255 255 255 / 0))");
    expect(layers[2]!.image).toBe("linear-gradient(to right, #000, rgb(0 0 0 / 0))");
  });

  it("flips a direction when the axis slides backwards", () => {
    const layers = cssAreaChannels(base, "hsv", "s", "v", false, false)!;
    expect(layers[1]!.image).toBe("linear-gradient(to left, #fff, rgb(255 255 255 / 0))");
  });

  it("paints opaque regardless of the base color's alpha", () => {
    const layers = cssAreaChannels(base.withAlpha(0.25), "hsv", "s", "v", true, false)!;
    expect(layers[0]!.image).not.toContain("/");
  });

  it("reproduces the HSV sweep exactly", () => {
    let worst = 0;
    for (const h of [0, 37, 120, 210, 300, 359]) {
      const color = Color.parse(`hsl(${h}, 80%, 50%)`)!.to("hsv");
      const hue = rgb(color.with({ space: "hsv", s: 1, v: 1 }));
      for (let si = 0; si <= 20; si++) {
        for (let vi = 0; vi <= 20; vi++) {
          const s = si / 20;
          const v = vi / 20;
          const layered = over([0, 0, 0], over([1, 1, 1], hue, 1 - s), 1 - v);
          worst = Math.max(worst, maxError(layered, rgb(color.with({ space: "hsv", s, v }))));
        }
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });
});

describe("cssAreaChannels — HSL s × l", () => {
  it("puts the gray-to-hue row under a black-to-white overlay", () => {
    expect(cssAreaChannels(BASE, "hsl", "s", "l", true, false)).toEqual([
      { image: "linear-gradient(to right, rgb(128 128 128), rgb(0 128 255))" },
      {
        image: "linear-gradient(to top, #000 0%, rgb(0 0 0 / 0) 50%, "
          + "rgb(255 255 255 / 0) 50%, #fff 100%)",
      },
    ]);
  });

  it("reproduces the HSL sweep exactly on both halves of the lightness ramp", () => {
    let worst = 0;
    for (const h of [0, 37, 120, 210, 300, 359]) {
      const color = Color.parse(`hsl(${h}, 80%, 50%)`)!;
      const gray = rgb(color.with({ space: "hsl", s: 0, l: 0.5 }));
      const hue = rgb(color.with({ space: "hsl", s: 1, l: 0.5 }));
      for (let si = 0; si <= 20; si++) {
        for (let li = 0; li <= 20; li++) {
          const s = si / 20;
          const l = li / 20;
          const row = over(hue, gray, s);
          const layered = l < 0.5
            ? over([0, 0, 0], row, 1 - 2 * l)
            : over([1, 1, 1], row, 2 * l - 1);
          worst = Math.max(worst, maxError(layered, rgb(color.with({ space: "hsl", s, l }))));
        }
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });
});

describe("cssAreaChannels — alpha axis", () => {
  it("sweeps the real channel into stops and ramps alpha with a mask", () => {
    expect(cssAreaChannels(BASE.to("oklch"), "oklch", "l", null, true, true, { steps: 3 })).toEqual([{
      image: "linear-gradient(to right, rgb(6 0 38), rgb(0 97 196), rgb(165 255 255))",
      mask: "linear-gradient(to bottom, rgb(0 0 0 / 0), #000)",
    }]);
  });

  it("works in every space, including the ones with no 2D recipe", () => {
    for (const [space, channel] of [
      ["oklch", "l"], ["oklab", "a"], ["lab", "b"], ["lch", "c"], ["hwb", "w"],
    ] as const) {
      expect(cssAreaChannels(BASE.to(space), space, null, channel, true, true, { steps: 3 }))
        .not.toBeNull();
    }
  });

  it("returns null when both axes are alpha", () => {
    expect(cssAreaChannels(BASE, "hsl", null, null, true, true)).toBeNull();
  });

  it("returns null for a channel the space does not define", () => {
    expect(cssAreaChannels(BASE, "hsl", "v", null, true, true)).toBeNull();
  });
});

describe("cssAreaChannels — combinations that stay on the canvas", () => {
  it.each([
    ["oklch", "c", "l"],
    ["oklab", "a", "b"],
    ["lab", "a", "b"],
    ["lch", "c", "l"],
    ["hwb", "w", "b"],
    ["srgb", "r", "g"],
  ] as const)("returns null for %s %s × %s", (space, x, y) => {
    expect(cssAreaChannels(BASE.to(space), space, x, y, true, true)).toBeNull();
  });

  it("returns null for an HSV pair that is not s × v", () => {
    expect(cssAreaChannels(BASE.to("hsv"), "hsv", "h", "s", true, true)).toBeNull();
  });

  it("returns null when both axes name the same channel", () => {
    expect(cssAreaChannels(BASE.to("hsv"), "hsv", "s", "s", true, true)).toBeNull();
  });
});

describe("cssWheelPolar", () => {
  it("puts a hue conic under a saturation radial", () => {
    expect(cssWheelPolar(BASE.to("hsv"), "hsv", "h", "s", 0, { steps: 4 })).toEqual([
      {
        image: "conic-gradient(from 0deg, rgb(230 0 0) 0deg, rgb(0 230 0) 120deg, "
          + "rgb(0 0 230) 240deg, rgb(230 0 0) 360deg)",
      },
      { image: "radial-gradient(circle closest-side, rgb(230 230 230), rgb(230 230 230 / 0))" },
    ]);
  });

  it("reproduces the polar sweep exactly in both HSV and HSL", () => {
    let worst = 0;
    for (const [space, fixed] of [["hsv", "v"], ["hsl", "l"]] as const) {
      for (const level of [0.3, 0.5, 0.8]) {
        const color = Color.parse("hsl(0, 100%, 50%)")!.to(space).with({ space, [fixed]: level });
        const center = rgb(color.with({ space, s: 0 }));
        for (const h of [0, 37, 120, 210, 300, 359]) {
          const rim = rgb(color.with({ space, h, s: 1 }));
          for (let si = 0; si <= 20; si++) {
            const s = si / 20;
            // The radial overlay's alpha is 1 at the center and 0 at the rim.
            const layered = over(center, rim, 1 - s);
            worst = Math.max(worst, maxError(layered, rgb(color.with({ space, h, s }))));
          }
        }
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it.each([
    ["oklch", "h", "c"],
    ["lch", "h", "c"],
    ["hwb", "h", "w"],
  ] as const)("returns null for %s", (space, angle, radius) => {
    expect(cssWheelPolar(BASE.to(space), space, angle, radius, 0)).toBeNull();
  });

  it("returns null for an HSV pair that is not h × s", () => {
    expect(cssWheelPolar(BASE.to("hsv"), "hsv", "h", "v", 0)).toBeNull();
  });
});

describe("channelStops", () => {
  it("sweeps a channel across its native range", () => {
    const stops = channelStops(BASE, "hsl", "l", { steps: 3 })!;
    expect(stops.map(c => c.get("l"))).toEqual([0, 0.5, 1]);
  });

  it("sweeps alpha without touching the coordinate channels", () => {
    const stops = channelStops(BASE, "hsl", "alpha", { steps: 3 })!;
    expect(stops.map(c => c.alpha)).toEqual([0, 0.5, 1]);
    expect(stops.every(c => c.get("h") === BASE.get("h"))).toBe(true);
  });

  it("returns null for a channel the space does not define", () => {
    expect(channelStops(BASE, "hsl", "v")).toBeNull();
  });

  it("defaults to more stops for a cyclic channel", () => {
    expect(channelStops(BASE, "hsl", "h")).toHaveLength(CYCLIC_STEPS);
    expect(channelStops(BASE, "hsl", "s")).toHaveLength(DEFAULT_STEPS);
  });
});

describe("defaultStepsFor / isCyclicChannel", () => {
  it("treats every hue channel as cyclic", () => {
    for (const space of ["hsl", "hsv", "hwb", "oklch", "lch"] as const) {
      expect(isCyclicChannel(space, "h")).toBe(true);
      expect(defaultStepsFor(space, "h")).toBe(CYCLIC_STEPS);
    }
  });

  it("treats everything else as monotonic", () => {
    expect(isCyclicChannel("oklch", "c")).toBe(false);
    expect(defaultStepsFor("oklch", "c")).toBe(DEFAULT_STEPS);
    expect(defaultStepsFor("hsl", "nonsense")).toBe(DEFAULT_STEPS);
  });
});

describe("collapseLayers", () => {
  it("merges a mask-free run into one background-image, topmost first", () => {
    expect(collapseLayers([{ image: "a" }, { image: "b" }, { image: "c" }]))
      .toEqual([{ image: "c, b, a" }]);
  });

  it("splits the run around a masked layer", () => {
    expect(collapseLayers([
      { image: "a" },
      { image: "b" },
      { image: "c", mask: "m" },
      { image: "d" },
      { image: "e" },
    ])).toEqual([
      { image: "b, a" },
      { image: "c", mask: "m" },
      { image: "e, d" },
    ]);
  });

  it("leaves a masked layer alone", () => {
    expect(collapseLayers([{ image: "a", mask: "m" }])).toEqual([{ image: "a", mask: "m" }]);
  });

  it("returns nothing for no layers", () => {
    expect(collapseLayers([])).toEqual([]);
  });

  it("collapses the HSV stack to a single element", () => {
    const layers = collapseLayers(cssAreaChannels(BASE.to("hsv"), "hsv", "s", "v", true, false)!);
    expect(layers).toHaveLength(1);
    expect(layers[0]!.image).toBe(
      "linear-gradient(to top, #000, rgb(0 0 0 / 0)), "
      + "linear-gradient(to right, #fff, rgb(255 255 255 / 0)), "
      + "linear-gradient(rgb(0 128 255), rgb(0 128 255))",
    );
  });
});

describe("SSR safety", () => {
  it("builds every recipe with no DOM globals present", () => {
    const globals = ["document", "window", "HTMLCanvasElement", "ImageData", "OffscreenCanvas"];
    const saved = globals.map(k => [k, (globalThis as Record<string, unknown>)[k]] as const);
    for (const k of globals) delete (globalThis as Record<string, unknown>)[k];
    try {
      expect(cssLinearStops([RED, BLUE], 0)).not.toBeNull();
      expect(cssConicStops([RED, BLUE], 0)).not.toBeNull();
      expect(cssAreaBilinear(RED, BLUE, LIME, YELLOW)).toHaveLength(2);
      expect(cssAreaChannels(BASE.to("hsv"), "hsv", "s", "v", true, false)).not.toBeNull();
      expect(cssWheelPolar(BASE.to("hsv"), "hsv", "h", "s", 0)).not.toBeNull();
    } finally {
      for (const [k, v] of saved) (globalThis as Record<string, unknown>)[k] = v;
    }
  });
});
