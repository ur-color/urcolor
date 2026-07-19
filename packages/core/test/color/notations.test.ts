import { describe, expect, it } from "bun:test";
import { parseChannelToken } from "../../src/color/components";
import { NOTATIONS } from "../../src/color/notations";
import { tryParse } from "../../src/color/parse";

describe("NOTATIONS", () => {
  it("covers every CSS functional notation", () => {
    expect(Object.keys(NOTATIONS).sort()).toEqual(
      ["color", "hsl", "hwb", "lab", "lch", "oklab", "oklch", "rgb"].sort(),
    );
  });

  it("gives each notation three named channels", () => {
    for (const [name, def] of Object.entries(NOTATIONS)) {
      expect(def.channels).toHaveLength(3);
      for (const ch of def.channels) {
        expect(typeof ch.name).toBe("string");
        expect(ch.name.length).toBeGreaterThan(0);
        expect(Number.isFinite(ch.percentRef)).toBe(true);
      }
      expect(def.space).toBeTruthy();
      expect(name).toBeTruthy();
    }
  });

  it("round-trips native <-> css units for every channel", () => {
    for (const def of Object.values(NOTATIONS)) {
      for (const ch of def.channels) {
        for (const css of [0, 0.25, 1, 42]) {
          expect(ch.fromNative(ch.toNative(css))).toBeCloseTo(css, 9);
        }
      }
    }
  });

  it("resolves tokens to the same native values the parsers produce", () => {
    const rgbR = NOTATIONS.rgb!.channels[0]!;
    expect(parseChannelToken("255", rgbR)).toBeCloseTo(1, 9);
    expect(parseChannelToken("50%", rgbR)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("none", rgbR)).toBe(0);

    const hslS = NOTATIONS.hsl!.channels[1]!;
    expect(parseChannelToken("50", hslS)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("50%", hslS)).toBeCloseTo(0.5, 9);

    const labA = NOTATIONS.lab!.channels[1]!;
    expect(parseChannelToken("50%", labA)).toBeCloseTo(62.5, 9);

    const oklchC = NOTATIONS.oklch!.channels[1]!;
    expect(parseChannelToken("50%", oklchC)).toBeCloseTo(0.2, 9);

    const hslH = NOTATIONS.hsl!.channels[0]!;
    expect(parseChannelToken("0.5turn", hslH)).toBeCloseTo(180, 9);
    expect(parseChannelToken("200grad", hslH)).toBeCloseTo(180, 9);
  });

  it("pins every channel's percent reference against silent drift", () => {
    // rgb: r, g, b -> percentRef 255, toNative divides by 255.
    for (const ch of NOTATIONS.rgb!.channels) {
      expect(parseChannelToken("50%", ch)).toBeCloseTo(0.5, 9);
    }

    // hsl: s, l -> percentRef 100, toNative divides by 100.
    expect(parseChannelToken("50%", NOTATIONS.hsl!.channels[1]!)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("50%", NOTATIONS.hsl!.channels[2]!)).toBeCloseTo(0.5, 9);

    // hwb: w, b -> percentRef 100, toNative divides by 100.
    expect(parseChannelToken("50%", NOTATIONS.hwb!.channels[1]!)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("50%", NOTATIONS.hwb!.channels[2]!)).toBeCloseTo(0.5, 9);

    // lab: l -> percentRef 100 (identity); a, b -> percentRef 125 (identity).
    expect(parseChannelToken("50%", NOTATIONS.lab!.channels[0]!)).toBeCloseTo(50, 9);
    expect(parseChannelToken("50%", NOTATIONS.lab!.channels[1]!)).toBeCloseTo(62.5, 9);
    expect(parseChannelToken("50%", NOTATIONS.lab!.channels[2]!)).toBeCloseTo(62.5, 9);

    // lch: l -> percentRef 100 (identity); c -> percentRef 150 (identity).
    // 150 is the most unusual constant in the table and the likeliest to be
    // mistyped, so pin it explicitly.
    expect(parseChannelToken("50%", NOTATIONS.lch!.channels[0]!)).toBeCloseTo(50, 9);
    expect(parseChannelToken("50%", NOTATIONS.lch!.channels[1]!)).toBeCloseTo(75, 9);

    // oklab: l -> percentRef 1 (identity); a, b -> percentRef 0.4 (identity).
    expect(parseChannelToken("50%", NOTATIONS.oklab!.channels[0]!)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("50%", NOTATIONS.oklab!.channels[1]!)).toBeCloseTo(0.2, 9);
    expect(parseChannelToken("50%", NOTATIONS.oklab!.channels[2]!)).toBeCloseTo(0.2, 9);

    // oklch: l -> percentRef 1 (identity); c -> percentRef 0.4 (identity).
    expect(parseChannelToken("50%", NOTATIONS.oklch!.channels[0]!)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("50%", NOTATIONS.oklch!.channels[1]!)).toBeCloseTo(0.2, 9);

    // color: r, g, b -> percentRef 1 (identity).
    for (const ch of NOTATIONS.color!.channels) {
      expect(parseChannelToken("50%", ch)).toBeCloseTo(0.5, 9);
    }

    // Angle channels (hsl.h, hwb.h, lch.h, oklch.h) don't take percentages:
    // parseChannelToken returns at the `ch.angle` branch before any percent
    // handling runs. Assert their actual unit handling instead — a bare
    // number plus at least one of deg/grad/rad/turn.
    for (const ch of [
      NOTATIONS.hsl!.channels[0]!,
      NOTATIONS.hwb!.channels[0]!,
      NOTATIONS.lch!.channels[2]!,
      NOTATIONS.oklch!.channels[2]!,
    ]) {
      expect(parseChannelToken("180", ch)).toBeCloseTo(180, 9);
      expect(parseChannelToken("0.5turn", ch)).toBeCloseTo(180, 9);
    }
  });

  it("agrees with the real parsers end to end", () => {
    // If the refactor changed any unit, one of these shifts.
    expect(tryParse("rgb(255 0 0)")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("hsl(120 50% 50%)")?.coords[1]).toBeCloseTo(0.5, 9);
    expect(tryParse("lab(50% 50% 0)")?.coords[1]).toBeCloseTo(62.5, 9);
    expect(tryParse("oklch(50% 50% 180)")?.coords[1]).toBeCloseTo(0.2, 9);
  });
});
