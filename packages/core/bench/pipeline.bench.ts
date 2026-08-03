/**
 * End-to-end pipelines — string in, string out.
 *
 * The single-operation groups elsewhere isolate one cost each; these measure
 * the whole round trip, which is what an application actually pays. They also
 * expose the cost of a library's *object model*, since a full pipeline
 * allocates every intermediate the library insists on.
 */

import { bench, do_not_optimize, group, summary } from "mitata";
import {
  chroma,
  Color,
  colord,
  ColorJS,
  contrast,
  convert,
  culori,
  darken,
  deltaE,
  lighten,
  mix,
  nextHex,
  OTHER,
  parse,
  serialize,
  SWATCHES,
  TinyColor,
  tinycolor2,
  toOklch,
} from "./setup";

export function register(): void {
  // The most common thing anyone does with a color library.
  summary(() => {
    group("pipeline · hex → lighten → hex", () => {
      bench("urcolor  Color", () =>
        do_not_optimize(Color.parse(nextHex())!.lighten(0.1).toString("hex")));
      bench("urcolor  fn", () =>
        do_not_optimize(serialize(lighten(parse(nextHex()), 0.1), "hex")));
      // culori ships no lighten/darken, so this is the loop you would write:
      // into Oklch, nudge L, straight back out as hex.
      bench("culori   (hand-rolled)", () => {
        const c = toOklch(nextHex())!;
        do_not_optimize(culori.formatHex({ ...c, l: Math.min(1, c.l + 0.1) }));
      });
      bench("colord", () => do_not_optimize(colord(nextHex()).lighten(0.1).toHex()));
      bench("chroma-js", () => do_not_optimize(chroma(nextHex()).brighten(0.1).hex()));
      bench("tinycolor2", () => do_not_optimize(tinycolor2(nextHex()).lighten(10).toHexString()));
      bench("@ctrl/tinycolor", () =>
        do_not_optimize(new TinyColor(nextHex()).lighten(10).toHexString()));
      bench("colorjs.io", () => {
        const c = new ColorJS(nextHex()).to("oklch");
        c.set("l", (l: number) => l + 0.1);
        do_not_optimize(c.to("srgb").toString({ format: "hex" }));
      });
    });
  });

  summary(() => {
    group("pipeline · hex → oklch → hex (round trip)", () => {
      bench("urcolor  Color", () =>
        do_not_optimize(Color.parse(nextHex())!.to("oklch").to("srgb").toString("hex")));
      bench("urcolor  fn", () =>
        do_not_optimize(serialize(convert(convert(parse(nextHex()), "oklch"), "srgb"), "hex")));
      bench("culori", () => do_not_optimize(culori.formatHex(toOklch(nextHex()))));
      bench("chroma-js", () => {
        const [l, c, h] = chroma(nextHex()).oklch();
        do_not_optimize(chroma.oklch(l, c, h).hex());
      });
      bench("colorjs.io", () =>
        do_not_optimize(new ColorJS(nextHex()).to("oklch").to("srgb").toString({ format: "hex" })));
    });
  });

  summary(() => {
    group("pipeline · two hex strings → mixed hex (Oklab)", () => {
      bench("urcolor  Color", () =>
        do_not_optimize(
          Color.parse(nextHex())!.mix(Color.parse(OTHER.hex)!, 0.5).toString("hex"),
        ));
      bench("urcolor  fn", () =>
        do_not_optimize(serialize(mix(parse(nextHex()), parse(OTHER.hex), 0.5), "hex")));
      bench("culori", () =>
        do_not_optimize(
          culori.formatHex(culori.interpolate([nextHex(), OTHER.hex], "oklab")(0.5)),
        ));
      bench("chroma-js", () =>
        do_not_optimize(chroma.mix(nextHex(), OTHER.hex, 0.5, "oklab").hex()));
      bench("colorjs.io", () =>
        do_not_optimize(
          ColorJS.mix(nextHex(), OTHER.hex, 0.5, { space: "oklab" })
            .to("srgb")
            .toString({ format: "hex" }),
        ));
    });
  });

  summary(() => {
    group("pipeline · two hex strings → ΔE2000", () => {
      bench("urcolor  Color", () =>
        do_not_optimize(Color.parse(nextHex())!.deltaE(Color.parse(OTHER.hex)!)));
      bench("urcolor  fn", () => do_not_optimize(deltaE(parse(nextHex()), parse(OTHER.hex))));
      bench("culori", () =>
        do_not_optimize(culori.differenceCiede2000()(nextHex(), OTHER.hex)));
      bench("colord", () => do_not_optimize(colord(nextHex()).delta(OTHER.hex)));
      bench("chroma-js", () => do_not_optimize(chroma.deltaE(nextHex(), OTHER.hex)));
      bench("colorjs.io", () => do_not_optimize(ColorJS.deltaE(nextHex(), OTHER.hex, "2000")));
    });
  });

  summary(() => {
    group("pipeline · two hex strings → WCAG contrast", () => {
      bench("urcolor  Color", () =>
        do_not_optimize(Color.parse(nextHex())!.contrast(Color.parse(OTHER.hex)!)));
      bench("urcolor  fn", () => do_not_optimize(contrast(parse(nextHex()), parse(OTHER.hex))));
      bench("culori", () => do_not_optimize(culori.wcagContrast(nextHex(), OTHER.hex)));
      bench("colord", () => do_not_optimize(colord(nextHex()).contrast(OTHER.hex)));
      bench("chroma-js", () => do_not_optimize(chroma.contrast(nextHex(), OTHER.hex)));
      bench("tinycolor2", () => do_not_optimize(tinycolor2.readability(nextHex(), OTHER.hex)));
      bench("colorjs.io", () => do_not_optimize(ColorJS.contrast(nextHex(), OTHER.hex, "WCAG21")));
    });
  });

  // A theme pass: every swatch parsed, darkened, and printed back. The input is
  // already ten distinct strings, so no rotation is needed here.
  summary(() => {
    group(`batch · ${SWATCHES.length} swatches → darken → hex`, () => {
      bench("urcolor  Color", () => {
        for (const s of SWATCHES) do_not_optimize(Color.parse(s)!.darken(0.15).toString("hex"));
      });
      bench("urcolor  fn", () => {
        for (const s of SWATCHES) do_not_optimize(serialize(darken(parse(s), 0.15), "hex"));
      });
      bench("culori   (hand-rolled)", () => {
        for (const s of SWATCHES) {
          const c = toOklch(s)!;
          do_not_optimize(culori.formatHex({ ...c, l: Math.max(0, c.l - 0.15) }));
        }
      });
      bench("colord", () => {
        for (const s of SWATCHES) do_not_optimize(colord(s).darken(0.15).toHex());
      });
      bench("chroma-js", () => {
        for (const s of SWATCHES) do_not_optimize(chroma(s).darken(0.15).hex());
      });
      bench("tinycolor2", () => {
        for (const s of SWATCHES) do_not_optimize(tinycolor2(s).darken(15).toHexString());
      });
      bench("colorjs.io", () => {
        for (const s of SWATCHES) {
          const c = new ColorJS(s).to("oklch");
          c.set("l", (l: number) => l - 0.15);
          do_not_optimize(c.to("srgb").toString({ format: "hex" }));
        }
      });
    });
  });
}
