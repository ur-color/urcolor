import { describe, expect, it } from "bun:test";
import { EXACT_EPSILON, lookupPalette } from "../../src/engine/lookup-palette";
import type { PaletteChunk } from "../../src/engine/types";

/**
 * Three widely separated Oklab points so nearest-centroid ordering is
 * unambiguous. Values are plausible Oklab coordinates, not derived from a
 * conversion, because this unit tests the search, not the colour maths.
 */
const chunk: PaletteChunk = {
  lang: "en",
  model: "palette",
  terms: [
    ["yellow", "yellow", [0.968, -0.071, 0.198], null],
    ["white", "white", [1, 0, 0], null],
    ["black", "black", [0, 0, 0], null],
  ],
  provenance: [["Q943", "FFFF00"], ["Q23444", "FFFFFF"], ["Q23445", "000000"]],
  aliases: { "yellow color": 0, "color yellow": 0 },
};

const options = { topN: 5, maxDistance: 0.5 };

describe("lookupPalette", () => {
  it("reports an exact hit when the query is a catalogued colour", () => {
    const match = lookupPalette(chunk, [0.968, -0.071, 0.198], options);
    expect(match.coverage).toBe("exact");
    expect(match.binDistance).toBeCloseTo(0, 10);
    expect(match.candidates[0]?.term).toBe("yellow");
    expect(match.candidates[0]?.probability).toBeCloseTo(1, 10);
  });

  it("reports nearest with the true Oklab distance", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], options);
    expect(match.coverage).toBe("nearest");
    expect(match.candidates[0]?.term).toBe("white");
    expect(match.binDistance).toBeCloseTo(0.1, 10);
  });

  it("orders every candidate by ascending distance", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], options);
    expect(match.candidates.map(c => c.term)).toEqual(["white", "yellow", "black"]);
  });

  it("derives probability as clamped proximity, not a frequency", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], options);
    // distance 0.1, maxDistance 0.5 -> 1 - 0.1/0.5 = 0.8
    expect(match.candidates[0]?.probability).toBeCloseTo(0.8, 10);
  });

  it("honours topN", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], { topN: 2, maxDistance: 0.5 });
    expect(match.candidates).toHaveLength(2);
  });

  it("reports none when the nearest centroid is beyond maxDistance", () => {
    const match = lookupPalette(chunk, [0.5, 0.3, -0.3], { topN: 5, maxDistance: 0.01 });
    expect(match.coverage).toBe("none");
    expect(match.candidates).toEqual([]);
    expect(match.binDistance).toBe(Number.POSITIVE_INFINITY);
  });

  it("still matches an exact hit when maxDistance is zero", () => {
    const match = lookupPalette(chunk, [1, 0, 0], { topN: 5, maxDistance: 0 });
    expect(match.coverage).toBe("exact");
    expect(match.candidates[0]?.term).toBe("white");
    expect(match.candidates[0]?.probability).toBe(1);
  });

  it("reports none for an empty chunk", () => {
    const empty: PaletteChunk = {
      lang: "xx", model: "palette", terms: [], provenance: [], aliases: {},
    };
    expect(lookupPalette(empty, [0.5, 0, 0], options).coverage).toBe("none");
  });

  it("treats a sub-epsilon distance as exact", () => {
    const match = lookupPalette(chunk, [1, 0, EXACT_EPSILON / 2], options);
    expect(match.coverage).toBe("exact");
  });

  it("skips entries with a null centroid rather than throwing", () => {
    const withNull: PaletteChunk = {
      lang: "en",
      model: "palette",
      terms: [["ghost", "ghost", null, null], ["white", "white", [1, 0, 0], null]],
      provenance: [["Q1", "000000"], ["Q23444", "FFFFFF"]],
      aliases: {},
    };
    const match = lookupPalette(withNull, [1, 0, 0], options);
    expect(match.candidates.map(c => c.term)).toEqual(["white"]);
  });
});
