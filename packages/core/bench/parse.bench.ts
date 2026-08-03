/**
 * Parsing: CSS string → the library's own color representation.
 *
 * Hex and legacy `rgb()`/`hsl()` are the common denominator. `oklch()`,
 * `lab()` and `color(display-p3 …)` are modern CSS Color 4 notations, which
 * only the CSS-Color-4-aware libraries (urcolor, culori, colorjs.io) parse at
 * all — the older ones are absent from those groups by necessity.
 *
 * Each row parses a rotating pool of eight strings, so no parser gets to hoist
 * a constant out of the measurement loop.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  chroma,
  Color,
  colord,
  ColorJS,
  culori,
  nextHex,
  nextHex8,
  nextHsl,
  nextInvalid,
  nextLab,
  nextNamed,
  nextOklch,
  nextP3,
  nextRgb,
  nextRgbLegacy,
  parse,
  TinyColor,
  tinycolor2,
  tryParse,
} from "./setup";

export function register(): void {
  summary(() => {
    group("parse · hex", () => {
      bench("urcolor  Color.parse", () => do_not_optimize(Color.parse(nextHex())));
      bench("urcolor  parse (fn)", () => do_not_optimize(parse(nextHex())));
      bench("culori   parse", () => do_not_optimize(culori.parse(nextHex())));
      bench("colord", () => do_not_optimize(colord(nextHex())));
      bench("chroma-js", () => do_not_optimize(chroma(nextHex())));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextHex())));
      bench("@ctrl/tinycolor", () => do_not_optimize(new TinyColor(nextHex())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextHex())));
    });
  });

  summary(() => {
    group("parse · hex + alpha (#rrggbbaa)", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextHex8())));
      bench("culori", () => do_not_optimize(culori.parse(nextHex8())));
      bench("colord", () => do_not_optimize(colord(nextHex8())));
      bench("chroma-js", () => do_not_optimize(chroma(nextHex8())));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextHex8())));
      bench("@ctrl/tinycolor", () => do_not_optimize(new TinyColor(nextHex8())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextHex8())));
    });
  });

  summary(() => {
    group("parse · rgb() modern syntax", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextRgb())));
      bench("culori", () => do_not_optimize(culori.parse(nextRgb())));
      bench("colord", () => do_not_optimize(colord(nextRgb())));
      bench("chroma-js", () => do_not_optimize(chroma(nextRgb())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextRgb())));
    });
  });

  summary(() => {
    group("parse · rgba() legacy syntax", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextRgbLegacy())));
      bench("culori", () => do_not_optimize(culori.parse(nextRgbLegacy())));
      bench("colord", () => do_not_optimize(colord(nextRgbLegacy())));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextRgbLegacy())));
      bench("@ctrl/tinycolor", () => do_not_optimize(new TinyColor(nextRgbLegacy())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextRgbLegacy())));
    });
  });

  summary(() => {
    group("parse · hsl()", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextHsl())));
      bench("culori", () => do_not_optimize(culori.parse(nextHsl())));
      bench("colord", () => do_not_optimize(colord(nextHsl())));
      bench("chroma-js", () => do_not_optimize(chroma(nextHsl())));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextHsl())));
      bench("@ctrl/tinycolor", () => do_not_optimize(new TinyColor(nextHsl())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextHsl())));
    });
  });

  summary(() => {
    group("parse · named color", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextNamed())));
      bench("culori", () => do_not_optimize(culori.parse(nextNamed())));
      bench("colord", () => do_not_optimize(colord(nextNamed())));
      bench("chroma-js", () => do_not_optimize(chroma(nextNamed())));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextNamed())));
      bench("@ctrl/tinycolor", () => do_not_optimize(new TinyColor(nextNamed())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextNamed())));
    });
  });

  // CSS Color 4 notations — tinycolor2/@ctrl/tinycolor/colord/chroma-js cannot
  // parse these at all, so they are not in the group.
  summary(() => {
    group("parse · oklch() [CSS Color 4]", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextOklch())));
      bench("culori", () => do_not_optimize(culori.parse(nextOklch())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextOklch())));
    });
  });

  summary(() => {
    group("parse · lab() [CSS Color 4]", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextLab())));
      bench("culori", () => do_not_optimize(culori.parse(nextLab())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextLab())));
    });
  });

  summary(() => {
    group("parse · color(display-p3 …) [CSS Color 4]", () => {
      bench("urcolor", () => do_not_optimize(Color.parse(nextP3())));
      bench("culori", () => do_not_optimize(culori.parse(nextP3())));
      bench("colorjs.io", () => do_not_optimize(new ColorJS(nextP3())));
    });
  });

  // The nullable path: how cheap is rejecting garbage? Libraries differ wildly
  // here because some unwind a thrown error and some return a sentinel.
  summary(() => {
    group("parse · invalid input (rejection)", () => {
      bench("urcolor  tryParse", () => do_not_optimize(tryParse(nextInvalid())));
      bench("culori   parse", () => do_not_optimize(culori.parse(nextInvalid())));
      bench("colord   .isValid()", () => do_not_optimize(colord(nextInvalid()).isValid()));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextInvalid()).isValid));
      bench("@ctrl/tinycolor", () => do_not_optimize(new TinyColor(nextInvalid()).isValid));
    });
  });
}
