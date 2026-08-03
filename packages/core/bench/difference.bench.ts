/**
 * Perceptual difference and contrast.
 *
 * ΔE2000 is the expensive one — trigonometry plus a rotation term — and the
 * libraries that ship it are the ones aimed at color science. ΔE76 is a plain
 * Euclidean distance in Lab and is included so the cost of the 2000 formula is
 * visible rather than implied.
 *
 * WCAG 2.1 contrast is comparatively trivial (two relative-luminance terms), so
 * that group mostly measures how much overhead each library's object model adds
 * around a handful of multiplications.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  chroma,
  ColorJS,
  contrast,
  ctrlReadability,
  culori,
  culoriDeltaE2000,
  culoriDeltaE76,
  culoriDeltaEOk,
  deltaE,
  nextA,
  nextAObj,
  nextB,
  nextBObj,
  nextChromaA,
  nextChromaB,
  nextColordA,
  nextColorjsA,
  nextColorjsB,
  nextCuloriA,
  nextCuloriB,
  nextHex,
  OTHER,
  tinycolor2,
} from "./setup";

export function register(): void {
  summary(() => {
    group("deltaE · CIEDE2000", () => {
      bench("urcolor  .deltaE()", () => do_not_optimize(nextA().deltaE(nextB(), "2000")));
      bench("urcolor  deltaE (fn)", () => do_not_optimize(deltaE(nextAObj(), nextBObj(), "2000")));
      bench("culori", () => do_not_optimize(culoriDeltaE2000(nextCuloriA(), nextCuloriB())));
      bench("colord   .delta()", () => do_not_optimize(nextColordA().delta(OTHER.hex)));
      bench("chroma-js", () => do_not_optimize(chroma.deltaE(nextChromaA(), nextChromaB())));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.deltaE(nextColorjsA(), nextColorjsB(), "2000")));
    });
  });

  summary(() => {
    group("deltaE · CIE76 (Euclidean Lab)", () => {
      bench("urcolor", () => do_not_optimize(deltaE(nextAObj(), nextBObj(), "76")));
      bench("culori", () => do_not_optimize(culoriDeltaE76(nextCuloriA(), nextCuloriB())));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.deltaE(nextColorjsA(), nextColorjsB(), "76")));
    });
  });

  summary(() => {
    group("deltaE · ΔEOK (Oklab Euclidean)", () => {
      bench("urcolor", () => do_not_optimize(deltaE(nextAObj(), nextBObj(), "ok")));
      bench("culori", () => do_not_optimize(culoriDeltaEOk(nextCuloriA(), nextCuloriB())));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.deltaE(nextColorjsA(), nextColorjsB(), "OK")));
    });
  });

  summary(() => {
    group("contrast · WCAG 2.1 ratio", () => {
      bench("urcolor  .contrast()", () => do_not_optimize(nextA().contrast(nextB())));
      bench("urcolor  contrast (fn)", () => do_not_optimize(contrast(nextAObj(), nextBObj())));
      bench("culori", () => do_not_optimize(culori.wcagContrast(nextCuloriA(), nextCuloriB())));
      bench("colord", () => do_not_optimize(nextColordA().contrast(OTHER.hex)));
      bench("chroma-js", () => do_not_optimize(chroma.contrast(nextChromaA(), nextChromaB())));
      bench("tinycolor2", () => do_not_optimize(tinycolor2.readability(nextHex(), OTHER.hex)));
      bench("@ctrl/tinycolor", () => do_not_optimize(ctrlReadability(nextHex(), OTHER.hex)));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.contrast(nextColorjsA(), nextColorjsB(), "WCAG21")));
    });
  });

  // APCA is the WCAG 3 candidate — only urcolor and colorjs.io implement it.
  summary(() => {
    group("contrast · APCA", () => {
      bench("urcolor", () =>
        do_not_optimize(contrast(nextAObj(), nextBObj(), { algorithm: "apca" })));
      bench("colorjs.io", () =>
        do_not_optimize(ColorJS.contrast(nextColorjsA(), nextColorjsB(), "APCA")));
    });
  });

  summary(() => {
    group("relative luminance", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("xyz-d65").coords[1]));
      bench("culori", () => do_not_optimize(culori.wcagLuminance(nextCuloriA())));
      bench("chroma-js", () => do_not_optimize(nextChromaA().luminance()));
      bench("colord", () => do_not_optimize(nextColordA().luminance()));
    });
  });

  summary(() => {
    group("equality · same color, different space", () => {
      bench("urcolor  .equals()", () => {
        const a = nextA();
        do_not_optimize(a.equals(a.to("oklch")));
      });
      bench("colord   .isEqual()", () => do_not_optimize(nextColordA().isEqual(nextHex())));
      bench("chroma-js hex compare", () =>
        do_not_optimize(nextChromaA().hex() === nextChromaB().hex()));
    });
  });
}
