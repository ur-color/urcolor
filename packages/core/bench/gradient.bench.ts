/**
 * Canvas gradient rendering — the CPU path.
 *
 * These are the functions behind every picker surface: a slider track, an
 * SV plane, a hue wheel. Each produces an `Uint8ClampedArray` of RGBA bytes
 * ready for `ctx.putImageData()`, so the numbers here are literally
 * "milliseconds to paint one frame".
 *
 * The competing libraries have no equivalent primitive — none of them ship a
 * grid sampler — so the comparison rows hand-roll the same loop with each
 * library's interpolator and converter. That is exactly what you would write
 * yourself if you reached for them, which makes it the honest comparison.
 *
 * urcolor's WebGL entry points (`drawGradient`, `drawLinearGradient`) are not
 * benchmarked here: they need a live `HTMLCanvasElement` and a GPU context,
 * neither of which exists in a headless Bun process. They also do the
 * interpolation in a fragment shader, so their cost is a uniform upload and one
 * draw call regardless of surface size.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  interpolateStops,
  sampleBilinearGrid,
  sampleChannelGrid,
  sampleConicRing,
  samplePolarGrid,
} from "../src/gradient";
import {
  A,
  B,
  chroma,
  chromaA,
  chromaB,
  ColorJS,
  colorjsA,
  colorjsB,
  culori,
  culoriA,
  culoriB,
  toRgb,
} from "./setup";

/** A slider track at 2× DPR. */
const TRACK = 512;
/** A picker plane. 128² = 16 384 pixels — a small-but-real SV square. */
const PLANE = 128;

/**
 * Write one clamped 0..1 triple into an RGBA byte buffer. Channels are typed
 * nullable because colorjs.io models a powerless component (an achromatic hue,
 * say) as `null`; sRGB coordinates never are, but the signature has to admit it.
 */
type Chan = number | null | undefined;

function put(data: Uint8ClampedArray, i: number, r: Chan, g: Chan, b: Chan): void {
  data[i] = Math.round(Math.max(0, Math.min(1, r ?? 0)) * 255);
  data[i + 1] = Math.round(Math.max(0, Math.min(1, g ?? 0)) * 255);
  data[i + 2] = Math.round(Math.max(0, Math.min(1, b ?? 0)) * 255);
  data[i + 3] = 255;
}

export function register(): void {
  // A gradient strip — the shape of every slider track in a color picker.
  summary(() => {
    group(`canvas · ${TRACK}px linear track, Oklab → RGBA bytes`, () => {
      bench("urcolor  interpolateStops", () => {
        const stops = interpolateStops([A, B], TRACK, "oklab");
        const data = new Uint8ClampedArray(TRACK * 4);
        for (let x = 0; x < TRACK; x++) {
          const c = stops[x]!;
          put(data, x * 4, c.get("r"), c.get("g"), c.get("b"));
        }
        do_not_optimize(data);
      });
      bench("culori   (hand-rolled)", () => {
        const f = culori.interpolate([culoriA, culoriB], "oklab");
        const data = new Uint8ClampedArray(TRACK * 4);
        for (let x = 0; x < TRACK; x++) {
          const c = toRgb(f(x / (TRACK - 1)));
          put(data, x * 4, c.r, c.g, c.b);
        }
        do_not_optimize(data);
      });
      bench("chroma-js (hand-rolled)", () => {
        const s = chroma.scale([chromaA, chromaB]).mode("oklab");
        const data = new Uint8ClampedArray(TRACK * 4);
        for (let x = 0; x < TRACK; x++) {
          const [r, g, b] = s(x / (TRACK - 1)).gl();
          put(data, x * 4, r, g, b);
        }
        do_not_optimize(data);
      });
      bench("colorjs.io (hand-rolled)", () => {
        const f = ColorJS.range(colorjsA, colorjsB, { space: "oklab" });
        const data = new Uint8ClampedArray(TRACK * 4);
        for (let x = 0; x < TRACK; x++) {
          const [r, g, b] = f(x / (TRACK - 1)).to("srgb").coords;
          put(data, x * 4, r, g, b);
        }
        do_not_optimize(data);
      });
    });
  });

  // A four-corner bilinear surface — the classic "shade square".
  summary(() => {
    group(`canvas · ${PLANE}×${PLANE} bilinear plane, Oklab → RGBA bytes`, () => {
      bench("urcolor  sampleBilinearGrid", () =>
        do_not_optimize(sampleBilinearGrid(A, B, B, A, PLANE, PLANE, "oklab")));
      bench("culori   (hand-rolled)", () => {
        const data = new Uint8ClampedArray(PLANE * PLANE * 4);
        for (let y = 0; y < PLANE; y++) {
          const vy = y / (PLANE - 1);
          for (let x = 0; x < PLANE; x++) {
            const vx = x / (PLANE - 1);
            const top = culori.interpolate([culoriA, culoriB], "oklab")(vx);
            const bot = culori.interpolate([culoriB, culoriA], "oklab")(vx);
            const c = toRgb(culori.interpolate([top, bot], "oklab")(vy));
            put(data, (y * PLANE + x) * 4, c.r, c.g, c.b);
          }
        }
        do_not_optimize(data);
      });
      bench("colorjs.io (hand-rolled)", () => {
        const data = new Uint8ClampedArray(PLANE * PLANE * 4);
        for (let y = 0; y < PLANE; y++) {
          const vy = y / (PLANE - 1);
          for (let x = 0; x < PLANE; x++) {
            const vx = x / (PLANE - 1);
            const top = ColorJS.mix(colorjsA, colorjsB, vx, { space: "oklab" });
            const bot = ColorJS.mix(colorjsB, colorjsA, vx, { space: "oklab" });
            const [r, g, b] = ColorJS.mix(top, bot, vy, { space: "oklab" }).to("srgb").coords;
            put(data, (y * PLANE + x) * 4, r, g, b);
          }
        }
        do_not_optimize(data);
      });
    });
  });

  // The saturation/value plane of an HSV picker: evaluated per pixel rather
  // than interpolated, because two channels vary independently.
  summary(() => {
    group(`canvas · ${PLANE}×${PLANE} HSV S/V plane → RGBA bytes`, () => {
      bench("urcolor  sampleChannelGrid", () =>
        do_not_optimize(
          sampleChannelGrid(A, "hsv", "s", "v", 0, 1, 1, 0, PLANE, PLANE),
        ));
      bench("culori   (hand-rolled)", () => {
        const data = new Uint8ClampedArray(PLANE * PLANE * 4);
        const h = culori.converter("hsv")(culoriA).h ?? 0;
        for (let y = 0; y < PLANE; y++) {
          const v = 1 - y / (PLANE - 1);
          for (let x = 0; x < PLANE; x++) {
            const c = toRgb({ mode: "hsv", h, s: x / (PLANE - 1), v });
            put(data, (y * PLANE + x) * 4, c.r, c.g, c.b);
          }
        }
        do_not_optimize(data);
      });
      bench("colorjs.io (hand-rolled)", () => {
        const data = new Uint8ClampedArray(PLANE * PLANE * 4);
        const h = colorjsA.get("hsv.h");
        for (let y = 0; y < PLANE; y++) {
          const v = (1 - y / (PLANE - 1)) * 100;
          for (let x = 0; x < PLANE; x++) {
            const c = new ColorJS("hsv", [h, (x / (PLANE - 1)) * 100, v]).to("srgb");
            put(data, (y * PLANE + x) * 4, c.coords[0], c.coords[1], c.coords[2]);
          }
        }
        do_not_optimize(data);
      });
    });
  });

  // Wheels: a full polar surface and a conic hue ring.
  summary(() => {
    group(`canvas · ${PLANE}×${PLANE} Oklch polar wheel → RGBA bytes`, () => {
      bench("urcolor  samplePolarGrid", () =>
        do_not_optimize(
          samplePolarGrid(A, "oklch", "h", "c", 0, 360, 0, 0.4, PLANE, PLANE),
        ));
      bench("culori   (hand-rolled)", () => {
        const data = new Uint8ClampedArray(PLANE * PLANE * 4);
        const l = culori.converter("oklch")(culoriA).l;
        const cx = (PLANE - 1) / 2;
        for (let y = 0; y < PLANE; y++) {
          for (let x = 0; x < PLANE; x++) {
            const dx = (x - cx) / cx;
            const dy = (y - cx) / cx;
            const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
            let a = Math.atan2(dx, -dy);
            if (a < 0) a += 2 * Math.PI;
            const c = toRgb({ mode: "oklch", l, c: r * 0.4, h: (a / (2 * Math.PI)) * 360 });
            put(data, (y * PLANE + x) * 4, c.r, c.g, c.b);
          }
        }
        do_not_optimize(data);
      });
    });
  });

  summary(() => {
    group(`canvas · ${PLANE}×${PLANE} conic hue ring → RGBA bytes`, () => {
      bench("urcolor  sampleConicRing", () =>
        do_not_optimize(sampleConicRing(A, "oklch", "h", 0, 360, PLANE, PLANE)));
      bench("culori   (hand-rolled)", () => {
        const data = new Uint8ClampedArray(PLANE * PLANE * 4);
        const base = culori.converter("oklch")(culoriA);
        const cx = (PLANE - 1) / 2;
        for (let y = 0; y < PLANE; y++) {
          for (let x = 0; x < PLANE; x++) {
            const dx = (x - cx) / cx;
            const dy = (y - cx) / cx;
            let a = Math.atan2(dx, -dy);
            if (a < 0) a += 2 * Math.PI;
            const c = toRgb({ mode: "oklch", l: base.l, c: base.c, h: (a / (2 * Math.PI)) * 360 });
            put(data, (y * PLANE + x) * 4, c.r, c.g, c.b);
          }
        }
        do_not_optimize(data);
      });
    });
  });

  // How many full frames per second does each surface leave room for?
  // (Reported as raw throughput; divide 16.7 ms by the mean to get frames.)
  summary(() => {
    group("canvas · per-pixel cost, 1 000 Oklch → sRGB pixels", () => {
      bench("urcolor  sampleConicRing", () =>
        do_not_optimize(sampleConicRing(A, "oklch", "h", 0, 360, 1000, 1)));
      bench("culori   (hand-rolled)", () => {
        const data = new Uint8ClampedArray(1000 * 4);
        const base = culori.converter("oklch")(culoriA);
        for (let x = 0; x < 1000; x++) {
          const c = toRgb({ mode: "oklch", l: base.l, c: base.c, h: (x / 1000) * 360 });
          put(data, x * 4, c.r, c.g, c.b);
        }
        do_not_optimize(data);
      });
      bench("chroma-js (hand-rolled)", () => {
        const data = new Uint8ClampedArray(1000 * 4);
        const [l, c] = chromaA.oklch();
        for (let x = 0; x < 1000; x++) {
          const [r, g, b] = chroma.oklch(l, c, (x / 1000) * 360).gl();
          put(data, x * 4, r, g, b);
        }
        do_not_optimize(data);
      });
      bench("colorjs.io (hand-rolled)", () => {
        const data = new Uint8ClampedArray(1000 * 4);
        const [l, c] = colorjsA.to("oklch").coords;
        for (let x = 0; x < 1000; x++) {
          const px = new ColorJS("oklch", [l!, c!, (x / 1000) * 360]).to("srgb");
          put(data, x * 4, px.coords[0], px.coords[1], px.coords[2]);
        }
        do_not_optimize(data);
      });
    });
  });
}
