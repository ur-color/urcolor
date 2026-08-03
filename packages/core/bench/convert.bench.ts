/**
 * Conversion: an already-parsed color → another color space.
 *
 * Operands are pre-parsed in `setup.ts` so these groups measure the transform
 * matrices and transfer functions, not string parsing. Where a group converts
 * *out* of a perceptual space, the source operand is pre-converted for every
 * library too — otherwise the ones without a native Oklch representation would
 * be charged for a round trip while urcolor pays for one leg. chroma-js cannot
 * hold a non-sRGB color at all, so that one group builds its operand inside the
 * timed region; see the comment there for why the alternative measures nothing.
 *
 * chroma-js and the tinycolors are absent from the wide-gamut groups: neither
 * models Display P3 or Rec. 2020 as a space you can convert into.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  chroma,
  convert,
  culori,
  nextA,
  nextAObj,
  nextAOklch,
  nextChromaA,
  nextChromaOklchCoords,
  nextColordA,
  nextColorjsA,
  nextColorjsAOklch,
  nextCtrlA,
  nextCuloriA,
  nextCuloriAOklch,
  nextTinycolor2A,
  toHsl,
  toLab,
  toOklab,
  toOklch,
  toP3,
  toRec2020,
  toRgb,
  toXyz65,
} from "./setup";

export function register(): void {
  summary(() => {
    group("convert · sRGB → HSL", () => {
      bench("urcolor  .to()", () => do_not_optimize(nextA().to("hsl")));
      bench("urcolor  convert (fn)", () => do_not_optimize(convert(nextAObj(), "hsl")));
      bench("culori", () => do_not_optimize(toHsl(nextCuloriA())));
      bench("colord", () => do_not_optimize(nextColordA().toHsl()));
      bench("chroma-js", () => do_not_optimize(nextChromaA().hsl()));
      bench("tinycolor2", () => do_not_optimize(nextTinycolor2A().toHsl()));
      bench("@ctrl/tinycolor", () => do_not_optimize(nextCtrlA().toHsl()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("hsl")));
    });
  });

  summary(() => {
    group("convert · sRGB → Oklch", () => {
      bench("urcolor  .to()", () => do_not_optimize(nextA().to("oklch")));
      bench("urcolor  convert (fn)", () => do_not_optimize(convert(nextAObj(), "oklch")));
      bench("culori", () => do_not_optimize(toOklch(nextCuloriA())));
      bench("chroma-js", () => do_not_optimize(nextChromaA().oklch()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("oklch")));
    });
  });

  summary(() => {
    group("convert · sRGB → Oklab", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("oklab")));
      bench("culori", () => do_not_optimize(toOklab(nextCuloriA())));
      bench("chroma-js", () => do_not_optimize(nextChromaA().oklab()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("oklab")));
    });
  });

  summary(() => {
    group("convert · sRGB → CIE Lab", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("lab")));
      bench("culori", () => do_not_optimize(toLab(nextCuloriA())));
      bench("colord", () => do_not_optimize(nextColordA().toLab()));
      bench("chroma-js", () => do_not_optimize(nextChromaA().lab()));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("lab")));
    });
  });

  summary(() => {
    group("convert · sRGB → XYZ D65", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("xyz-d65")));
      bench("culori", () => do_not_optimize(toXyz65(nextCuloriA())));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("xyz-d65")));
    });
  });

  // The return trip. Going *out* of a perceptual space is the half that matters
  // for rendering, and it is where the tinycolors have nothing to offer.
  // Sources are pre-converted per library so each pays for exactly one leg.
  //
  // chroma-js is the exception, and not by choice: its `Color` stores sRGB and
  // nothing else — the constructor runs `_rgb = clip_rgb(...)` eagerly, so a
  // "chroma color in Oklch" does not exist. Holding one pre-converted, as the
  // other three rows do, would mean holding an *already-converted sRGB* color,
  // and `.rgb()` would then measure a cached array read (~55 ns) rather than a
  // conversion — reading as 3x faster than everyone while doing none of the
  // work. So its row builds the color from Oklch coordinates, which is what
  // converting Oklch → sRGB with chroma-js actually costs a caller.
  summary(() => {
    group("convert · Oklch → sRGB", () => {
      bench("urcolor", () => do_not_optimize(nextAOklch().to("srgb")));
      bench("culori", () => do_not_optimize(toRgb(nextCuloriAOklch())));
      bench("chroma-js", () => {
        const [l, c, h] = nextChromaOklchCoords();
        do_not_optimize(chroma.oklch(l, c, h).rgb());
      });
      bench("colorjs.io", () => do_not_optimize(nextColorjsAOklch().to("srgb")));
    });
  });

  // Wide gamut: only the CSS-Color-4-aware libraries model these spaces.
  summary(() => {
    group("convert · sRGB → Display P3", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("display-p3")));
      bench("culori", () => do_not_optimize(toP3(nextCuloriA())));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("p3")));
    });
  });

  summary(() => {
    group("convert · sRGB → Rec. 2020", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("rec2020")));
      bench("culori", () => do_not_optimize(toRec2020(nextCuloriA())));
      bench("colorjs.io", () => do_not_optimize(nextColorjsA().to("rec2020")));
    });
  });

  // Chained conversions: the realistic shape of a color-picker frame, where a
  // value hops through several spaces before it reaches the screen.
  summary(() => {
    group("convert · chain sRGB → Oklch → Lab → sRGB", () => {
      bench("urcolor", () => do_not_optimize(nextA().to("oklch").to("lab").to("srgb")));
      bench("culori", () => do_not_optimize(toRgb(toLab(toOklch(nextCuloriA())))));
      bench("colorjs.io", () =>
        do_not_optimize(nextColorjsA().to("oklch").to("lab").to("srgb")));
    });
  });

  // Gamut mapping — pulling an out-of-gamut color back into sRGB. urcolor and
  // colorjs.io both implement the CSS Color 4 Oklch chroma-reduction algorithm;
  // culori's `clampChroma` is the same idea with a different search, so the
  // three are comparable here.
  summary(() => {
    group("gamut · map into sRGB", () => {
      bench("urcolor  .toGamut()", () => do_not_optimize(nextAOklch().toGamut("srgb")));
      bench("culori   clampChroma", () =>
        do_not_optimize(culori.clampChroma(nextCuloriAOklch(), "oklch")));
      bench("colorjs.io .toGamut()", () =>
        do_not_optimize(nextColorjsAOklch().clone().toGamut({ space: "srgb" })));
    });
  });

  summary(() => {
    group("gamut · inGamut check", () => {
      bench("urcolor", () => do_not_optimize(nextAOklch().inGamut("srgb")));
      bench("culori", () => do_not_optimize(culori.displayable(nextCuloriAOklch())));
      bench("colorjs.io", () => do_not_optimize(nextColorjsAOklch().inGamut("srgb")));
    });
  });
}
