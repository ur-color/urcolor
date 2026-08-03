/**
 * Manipulation: lighten / darken / saturate / hue rotation / channel edits.
 *
 * An important caveat for reading these numbers: the libraries do not agree on
 * *where* the adjustment happens. urcolor and chroma-js work in a perceptual
 * space (Oklch / Lab), so a "lighten" costs two conversions on top of the
 * arithmetic. colord and the tinycolors nudge HSL lightness directly, which is
 * cheaper and perceptually worse. Same name, different job — compare with that
 * in mind rather than reading the fastest bar as the best implementation.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  darken,
  lighten,
  nextA,
  nextAObj,
  nextChromaA,
  nextColordA,
  nextColorjsA,
  nextCtrlA,
  nextTinycolor2A,
  rotateHue,
  saturate,
} from "./setup";

export function register(): void {
  summary(() => {
    group("manipulate · lighten (perceptual: urcolor/chroma-js; HSL: rest)", () => {
      bench("urcolor  .lighten()", () => do_not_optimize(nextA().lighten(0.1)));
      bench("urcolor  lighten (fn)", () => do_not_optimize(lighten(nextAObj(), 0.1)));
      bench("colord   .lighten()", () => do_not_optimize(nextColordA().lighten(0.1)));
      bench("chroma-js .brighten()", () => do_not_optimize(nextChromaA().brighten(0.1)));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().clone().lighten(10)));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().clone().lighten(10)));
    });
  });

  summary(() => {
    group("manipulate · darken", () => {
      bench("urcolor", () => do_not_optimize(darken(nextAObj(), 0.1)));
      bench("colord", () => do_not_optimize(nextColordA().darken(0.1)));
      bench("chroma-js", () => do_not_optimize(nextChromaA().darken(0.1)));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().clone().darken(10)));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().clone().darken(10)));
    });
  });

  summary(() => {
    group("manipulate · saturate", () => {
      bench("urcolor", () => do_not_optimize(saturate(nextAObj(), 0.1)));
      bench("colord", () => do_not_optimize(nextColordA().saturate(0.1)));
      bench("chroma-js", () => do_not_optimize(nextChromaA().saturate(0.1)));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().clone().saturate(10)));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().clone().saturate(10)));
    });
  });

  summary(() => {
    group("manipulate · rotate hue 60°", () => {
      bench("urcolor", () => do_not_optimize(rotateHue(nextAObj(), 60)));
      bench("colord", () => do_not_optimize(nextColordA().rotate(60)));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().clone().spin(60)));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().clone().spin(60)));
    });
  });

  // Setting one channel and reading it back — the inner loop of every slider.
  summary(() => {
    group("channel · set lightness in Oklch", () => {
      bench("urcolor  .with()", () => do_not_optimize(nextA().with({ space: "oklch", l: 0.72 })));
      bench("colorjs.io .set()", () =>
        do_not_optimize(nextColorjsA().to("oklch").set("l", 0.72)));
    });
  });

  summary(() => {
    group("channel · read one channel", () => {
      bench("urcolor  .get()", () => do_not_optimize(nextA().get("r")));
      bench("colord", () => do_not_optimize(nextColordA().toRgb().r));
      bench("chroma-js", () => do_not_optimize(nextChromaA().get("rgb.r")));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().get("srgb.r")));
    });
  });

  summary(() => {
    group("alpha · set opacity", () => {
      bench("urcolor  .withAlpha()", () => do_not_optimize(nextA().withAlpha(0.5)));
      bench("colord   .alpha()", () => do_not_optimize(nextColordA().alpha(0.5)));
      bench("chroma-js .alpha()", () => do_not_optimize(nextChromaA().alpha(0.5)));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().clone().setAlpha(0.5)));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().clone().setAlpha(0.5)));
    });
  });
}
