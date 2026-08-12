import { describe, expect, it } from "bun:test";
import { deltaE } from "@urcolor/core";
import { fromOklch, toOklch } from "../src/model";
import { ELEMENTARY, formatNotation, parseNotation, type NcsColor } from "../src/notation";

/**
 * A deterministic sweep of the notation space, rather than a handful of chosen
 * colours. Every combination is generated, so a regression anywhere in the
 * space shows up here rather than only where someone thought to look.
 */
function* sweep(): Generator<NcsColor> {
  for (let blackness = 0; blackness <= 90; blackness += 10) {
    for (let chromaticness = 5; chromaticness <= 90; chromaticness += 5) {
      if (blackness + chromaticness > 100) continue;
      for (let index = 0; index < ELEMENTARY.length; index++) {
        for (let percent = 0; percent < 100; percent += 10) {
          const from = ELEMENTARY[index]!;
          yield {
            blackness,
            chromaticness,
            hue: percent === 0
              ? { from, to: null, percent: 0 }
              : { from, to: ELEMENTARY[(index + 1) % ELEMENTARY.length]!, percent },
          };
        }
      }
    }
  }
}

const all = [...sweep()];

describe("notation round trip", () => {
  it("covers the whole space", () => {
    expect(all.length).toBeGreaterThan(4000);
  });

  it("re-parses every emitted notation", () => {
    // Clamping is what guarantees this: the inverse can leave the NCS-expressible
    // region, and a three-digit field or a `s + c > 100` pair would not parse.
    for (const ncs of all) {
      const notation = formatNotation(fromOklch(toOklch(ncs)));
      expect(parseNotation(notation)).not.toBeNull();
    }
  });

  it("never emits a pair summing over 100", () => {
    for (const ncs of all) {
      const back = fromOklch(toOklch(ncs));
      expect(back.blackness + back.chromaticness).toBeLessThanOrEqual(100);
    }
  });
});

describe("colour stability through a round trip", () => {
  const errors = all
    .map(ncs => deltaE(toOklch(ncs), toOklch(fromOklch(toOklch(ncs))), "2000"))
    .sort((a, b) => a - b);

  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;

  it("has a mean ΔE00 well under 1", () => {
    expect(mean).toBeLessThan(0.5);
  });

  it("keeps 95% of the space under ΔE00 1.5", () => {
    expect(errors[Math.floor(errors.length * 0.95)]!).toBeLessThan(1.5);
  });

  it("has no case worse than ΔE00 7", () => {
    // The worst cases sit above the chroma peak near chromaticness 75, where
    // the forward map stops being injective. See `fromOklch`.
    expect(errors.at(-1)!).toBeLessThan(7);
  });
});
