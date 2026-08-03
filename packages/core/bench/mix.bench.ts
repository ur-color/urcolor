/**
 * Mixing and interpolation.
 *
 * Two shapes are measured separately, because they cost very different things:
 *
 *  - **one-shot mix** — blend two colors once (`mix(a, b, 0.5)`).
 *  - **gradient sampling** — build an interpolator once, then sample it N times.
 *    This is what a gradient strip or a slider track actually does, and it is
 *    where a reusable interpolator beats a per-sample `mix()` call.
 *
 * The tinycolors and colord only mix in sRGB, which is a different (and much
 * cheaper) computation than an Oklab blend — they appear only in the sRGB group.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  chroma,
  Color,
  ColorJS,
  culori,
  interpolate,
  mix,
  nextA,
  nextAObj,
  nextB,
  nextBObj,
  nextChromaA,
  nextChromaB,
  nextColordA,
  nextColorjsA,
  nextColorjsB,
  nextCtrlA,
  nextCuloriA,
  nextCuloriB,
  nextHex,
  OTHER,
  tinycolor2,
} from "./setup";

/** Sample count for the gradient suite — a slider track's worth of stops. */
const SAMPLES = 64;

export function register(): void {
  summary(() => {
    group("mix · sRGB, 50%", () => {
      bench("urcolor  .mix()", () => do_not_optimize(nextA().mix(nextB(), 0.5, { space: "srgb" })));
      bench("urcolor  mix (fn)", () =>
        do_not_optimize(mix(nextAObj(), nextBObj(), 0.5, { space: "srgb" })));
      bench("culori", () =>
        do_not_optimize(culori.interpolate([nextCuloriA(), nextCuloriB()], "rgb")(0.5)));
      bench("colord", () => do_not_optimize(nextColordA().mix(OTHER.hex, 0.5)));
      bench("chroma-js", () => do_not_optimize(chroma.mix(nextChromaA(), nextChromaB(), 0.5, "rgb")));
      bench("tinycolor2", () => do_not_optimize(tinycolor2.mix(nextHex(), OTHER.hex, 50)));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().mix(OTHER.hex, 50)));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.mix(nextColorjsA(), nextColorjsB(), 0.5, { space: "srgb" })));
    });
  });

  // Oklab is the perceptual default — mixing here is what avoids the muddy
  // midpoints of an sRGB blend, and it is the mix most design systems want.
  summary(() => {
    group("mix · Oklab, 50%", () => {
      bench("urcolor  .mix()", () => do_not_optimize(nextA().mix(nextB(), 0.5)));
      bench("urcolor  mix (fn)", () => do_not_optimize(mix(nextAObj(), nextBObj(), 0.5)));
      bench("culori", () =>
        do_not_optimize(culori.interpolate([nextCuloriA(), nextCuloriB()], "oklab")(0.5)));
      bench("chroma-js", () =>
        do_not_optimize(chroma.mix(nextChromaA(), nextChromaB(), 0.5, "oklab")));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.mix(nextColorjsA(), nextColorjsB(), 0.5, { space: "oklab" })));
    });
  });

  summary(() => {
    group("mix · Oklch (shorter hue arc), 50%", () => {
      bench("urcolor", () =>
        do_not_optimize(nextA().mix(nextB(), 0.5, { space: "oklch", hue: "shorter" })));
      bench("culori", () =>
        do_not_optimize(culori.interpolate([nextCuloriA(), nextCuloriB()], "oklch")(0.5)));
      bench("chroma-js", () =>
        do_not_optimize(chroma.mix(nextChromaA(), nextChromaB(), 0.5, "oklch")));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.mix(nextColorjsA(), nextColorjsB(), 0.5, { space: "oklch" })));
    });
  });

  summary(() => {
    group("mix · CIE Lab, 50%", () => {
      bench("urcolor", () => do_not_optimize(nextA().mix(nextB(), 0.5, { space: "lab" })));
      bench("culori", () =>
        do_not_optimize(culori.interpolate([nextCuloriA(), nextCuloriB()], "lab")(0.5)));
      bench("chroma-js", () => do_not_optimize(chroma.mix(nextChromaA(), nextChromaB(), 0.5, "lab")));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.mix(nextColorjsA(), nextColorjsB(), 0.5, { space: "lab" })));
    });
  });

  // Building the interpolator once and sampling it — the gradient case.
  summary(() => {
    group(`gradient · ${SAMPLES} Oklab samples (interpolator reused)`, () => {
      bench("urcolor", () => {
        const f = interpolate(nextAObj(), nextBObj(), { space: "oklab" });
        for (let i = 0; i < SAMPLES; i++) do_not_optimize(f(i / (SAMPLES - 1)));
      });
      bench("culori", () => {
        const f = culori.interpolate([nextCuloriA(), nextCuloriB()], "oklab");
        for (let i = 0; i < SAMPLES; i++) do_not_optimize(f(i / (SAMPLES - 1)));
      });
      bench("chroma-js", () => {
        const s = chroma.scale([nextChromaA(), nextChromaB()]).mode("oklab");
        for (let i = 0; i < SAMPLES; i++) do_not_optimize(s(i / (SAMPLES - 1)));
      });
      bench("colorjs.io", () => {
        const f = ColorJS.range(nextColorjsA(), nextColorjsB(), { space: "oklab" });
        for (let i = 0; i < SAMPLES; i++) do_not_optimize(f(i / (SAMPLES - 1)));
      });
    });
  });

  // The naive shape people actually write first: a fresh mix per sample.
  summary(() => {
    group(`gradient · ${SAMPLES} Oklab samples (mix per sample)`, () => {
      bench("urcolor", () => {
        const a = nextAObj();
        const b = nextBObj();
        for (let i = 0; i < SAMPLES; i++) do_not_optimize(mix(a, b, i / (SAMPLES - 1)));
      });
      bench("culori", () => {
        const a = nextCuloriA();
        const b = nextCuloriB();
        for (let i = 0; i < SAMPLES; i++) {
          do_not_optimize(culori.interpolate([a, b], "oklab")(i / (SAMPLES - 1)));
        }
      });
      bench("chroma-js", () => {
        const a = nextChromaA();
        const b = nextChromaB();
        for (let i = 0; i < SAMPLES; i++) do_not_optimize(chroma.mix(a, b, i / (SAMPLES - 1), "oklab"));
      });
      bench("colorjs.io", () => {
        const a = nextColorjsA();
        const b = nextColorjsB();
        for (let i = 0; i < SAMPLES; i++) {
          do_not_optimize(ColorJS.mix(a, b, i / (SAMPLES - 1), { space: "oklab" }));
        }
      });
    });
  });

  // A color-scale build: 11 stops from two anchors, the shape of a Tailwind
  // palette generator.
  summary(() => {
    group("palette · 11 stops from two anchors", () => {
      bench("urcolor", () => {
        const f = interpolate(nextAObj(), nextBObj(), { space: "oklab" });
        for (let i = 0; i < 11; i++) do_not_optimize(Color.from(f(i / 10)).toString("hex"));
      });
      bench("culori", () => {
        const f = culori.interpolate([nextCuloriA(), nextCuloriB()], "oklab");
        for (let i = 0; i < 11; i++) do_not_optimize(culori.formatHex(f(i / 10)));
      });
      bench("chroma-js", () => {
        const s = chroma.scale([nextChromaA(), nextChromaB()]).mode("oklab");
        for (let i = 0; i < 11; i++) do_not_optimize(s(i / 10).hex());
      });
      bench("colorjs.io", () => {
        const f = ColorJS.range(nextColorjsA(), nextColorjsB(), { space: "oklab" });
        for (let i = 0; i < 11; i++) {
          do_not_optimize(f(i / 10).to("srgb").toString({ format: "hex" }));
        }
      });
    });
  });
}
