import { describe, expect, it } from "bun:test";
import { convert, deltaE, tryParse } from "@urcolor/core";
import { fromOklch, toOklch } from "../src/model";
import { formatNotation, parseNotation } from "../src/notation";
import reference from "./fixtures/reference.json";

interface Row { ncs: string; hex: string }

const rows = reference as Row[];

/**
 * The fixtures are a deterministic stride through the published reference, not
 * a hand-picked set. Choosing them by error would let these tests grade the
 * model only on cases it already passes.
 */
function errorsOf(filter: (row: Row) => boolean): number[] {
  const out: number[] = [];
  for (const row of rows) {
    if (!filter(row)) continue;
    const parsed = parseNotation(row.ncs);
    const target = tryParse(row.hex);
    expect(parsed).not.toBeNull();
    expect(target).not.toBeNull();
    out.push(deltaE(toOklch(parsed!), target!, "2000"));
  }
  return out;
}

const isNeutral = (row: Row) => /-N$/.test(row.ncs);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("forward conversion accuracy", () => {
  // The whole package is an approximation of a proprietary system, so these
  // numbers are the honest contract. They are set from the measured
  // distribution over the full 2,031-sample reference, not aspiration.
  it("has a mean ΔE00 under 2.5 across the chromatic fixtures", () => {
    expect(mean(errorsOf(row => !isNeutral(row)))).toBeLessThan(2.5);
  });

  it("keeps 90% of chromatic fixtures under ΔE00 5", () => {
    const errors = errorsOf(row => !isNeutral(row)).sort((a, b) => a - b);
    const p90 = errors[Math.floor(errors.length * 0.9)]!;
    expect(p90).toBeLessThan(5);
  });

  it("has no chromatic fixture worse than ΔE00 11", () => {
    // The worst cases in the full reference are very dark near-neutrals
    // (blackness 85, chromaticness 5), where ΔE00 amplifies small absolute
    // differences. See the accuracy section of the README.
    expect(Math.max(...errorsOf(row => !isNeutral(row)))).toBeLessThan(11);
  });
});

describe("neutrals", () => {
  it("are pure greys, not the published warm tint", () => {
    for (const blackness of [0, 5, 10, 50, 90, 99]) {
      const notation = `S ${String(blackness).padStart(2, "0")}00-N`;
      const [r, g, b] = convert(toOklch(parseNotation(notation)!), "srgb").coords;
      expect(r).toBeCloseTo(g, 6);
      expect(g).toBeCloseTo(b, 6);
    }
  });

  it("darken monotonically with blackness", () => {
    // Blackness is not `1 - L`: the published axis is a curve, steepest at the
    // dark end, which `neutralLightness` fits as a cubic.
    const lightness = [0, 5, 20, 50, 80, 99].map(b =>
      toOklch(parseNotation(`S ${String(b).padStart(2, "0")}00-N`)!).coords[0]);
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]!).toBeLessThan(lightness[i - 1]!);
    }
    expect(lightness[1]!).toBeCloseTo(0.947, 2);
    expect(lightness[3]!).toBeCloseTo(0.621, 2);
  });

  it("stay within ΔE00 4 of the published neutrals despite the tint", () => {
    // The published neutrals are slightly warm; the model deliberately is not.
    expect(Math.max(...errorsOf(isNeutral))).toBeLessThan(4);
  });
});

describe("inverse conversion", () => {
  it("recovers the notation a colour was built from, below the chroma peak", () => {
    for (const notation of ["S 1050-Y90R", "S 2030-Y90R", "S 4030-B50G", "S 3020-R", "S 7010-B"]) {
      const parsed = parseNotation(notation)!;
      const back = fromOklch(toOklch(parsed));
      // Within one unit: the notation quantises to whole percent, so a
      // one-step rounding difference is the floor, not a defect.
      expect(Math.abs(back.blackness - parsed.blackness)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.chromaticness - parsed.chromaticness)).toBeLessThanOrEqual(1);
      expect(back.hue?.from).toBe(parsed.hue!.from);
    }
  });

  it("reads back a lower chromaticness above the chroma peak", () => {
    // `C(c)` peaks near chromaticness 75 and falls after it, so two values
    // produce the same lightness and chroma and no inverse can separate them.
    // `fromOklch` takes the ascending branch by design; this pins that choice
    // rather than pretending the round trip is exact up there.
    const parsed = parseNotation("S 0580-Y")!;
    const back = fromOklch(toOklch(parsed));
    expect(back.chromaticness).toBeLessThan(parsed.chromaticness);
    // The colour it names is still close, which is what a caller sees.
    expect(deltaE(toOklch(parsed), toOklch(back), "2000")).toBeLessThan(3);
  });

  it("returns the neutral axis for an achromatic colour", () => {
    const grey = fromOklch(tryParse("#808080")!);
    expect(grey.hue).toBeNull();
    expect(grey.chromaticness).toBe(0);
  });

  it("always produces a re-parseable notation, even out of gamut", () => {
    // A saturated colour well outside what NCS expresses still gets an answer;
    // clamping is what keeps that answer well-formed.
    for (const hex of ["#ff00ff", "#00ff00", "#000000", "#ffffff", "#ff0000"]) {
      const notation = formatNotation(fromOklch(tryParse(hex)!));
      expect(parseNotation(notation)).not.toBeNull();
    }
  });

  it("honours the blackness plus chromaticness constraint", () => {
    for (const hex of ["#ff00ff", "#003300", "#101010", "#7a3b00"]) {
      const ncs = fromOklch(tryParse(hex)!);
      expect(ncs.blackness + ncs.chromaticness).toBeLessThanOrEqual(100);
      expect(ncs.blackness).toBeGreaterThanOrEqual(0);
      expect(ncs.chromaticness).toBeGreaterThanOrEqual(0);
    }
  });
});
