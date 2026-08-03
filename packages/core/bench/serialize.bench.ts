/**
 * Serialization: a color object → a CSS string.
 *
 * This is the last step of every render path, so it runs as often as parsing
 * does. Note that hex serialization forces a conversion to sRGB plus rounding,
 * while `oklch()` output can print the stored coordinates directly — hence the
 * two groups behaving differently.
 *
 * These rows are the reason `setup.ts` rotates its operands: string formatting
 * off a constant is small enough that the JIT hoists it clean out of the
 * measurement loop and reports picoseconds for work that never happened.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  culori,
  nextA,
  nextAObj,
  nextAOklch,
  nextChromaA,
  nextColordA,
  nextColorjsA,
  nextCtrlA,
  nextCuloriA,
  nextCuloriAOklch,
  nextTinycolor2A,
  serialize,
} from "./setup";

export function register(): void {
  summary(() => {
    group("serialize · → hex", () => {
      bench("urcolor  .toString()", () => do_not_optimize(nextA().toString("hex")));
      bench("urcolor  serialize (fn)", () => do_not_optimize(serialize(nextAObj(), "hex")));
      bench("culori   formatHex", () => do_not_optimize(culori.formatHex(nextCuloriA())));
      bench("colord   .toHex()", () => do_not_optimize(nextColordA().toHex()));
      bench("chroma-js .hex()", () => do_not_optimize(nextChromaA().hex()));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().toHexString()));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().toHexString()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().toString({ format: "hex" })));
    });
  });

  summary(() => {
    group("serialize · → rgb()", () => {
      bench("urcolor", () => do_not_optimize(nextA().toString("srgb")));
      bench("culori", () => do_not_optimize(culori.formatRgb(nextCuloriA())));
      bench("colord", () => do_not_optimize(nextColordA().toRgbString()));
      bench("chroma-js", () => do_not_optimize(nextChromaA().css()));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().toRgbString()));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().toRgbString()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().toString({ format: "rgb" })));
    });
  });

  summary(() => {
    group("serialize · → hsl()", () => {
      bench("urcolor", () => do_not_optimize(nextA().toString("hsl")));
      bench("culori", () => do_not_optimize(culori.formatHsl(nextCuloriA())));
      bench("colord", () => do_not_optimize(nextColordA().toHslString()));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().toHslString()));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().toHslString()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("hsl").toString()));
    });
  });

  // CSS Color 4 output — the tinycolors and colord cannot emit these.
  summary(() => {
    group("serialize · → oklch()", () => {
      bench("urcolor", () => do_not_optimize(nextAOklch().toString("oklch")));
      bench("culori", () => do_not_optimize(culori.formatCss(nextCuloriAOklch())));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("oklch").toString()));
    });
  });

  summary(() => {
    group("serialize · sRGB color → oklch() string (convert + print)", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("oklch").toString("oklch")));
      bench("culori", () =>
        do_not_optimize(culori.formatCss(culori.converter("oklch")(nextCuloriA()))));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("oklch").toString()));
    });
  });
}
