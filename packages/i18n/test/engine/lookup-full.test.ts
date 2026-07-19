import { describe, expect, it } from "bun:test";
import { lookupFull } from "../../src/engine/lookup-full";
import type { FullChunk } from "../../src/engine/types";
import { uwdataChunks } from "../../src/sources/uwdata/chunks";

const chunk: FullChunk = {
  lang: "ko",
  model: "full",
  binSize: 0.05,
  terms: [
    ["파랑", "파란색", [0.52, -0.04, -0.17]],
    ["하늘", "하늘색", [0.76, -0.03, -0.08]],
  ],
  // Bin 10,-1,-3 is populated; its neighbour 11,-1,-3 is not.
  bins: { "10,-1,-3": [[0, 0.61], [1, 0.13]] },
};

const options = { topN: 5, maxDistance: 0.075 };

describe("lookupFull", () => {
  it("resolves a colour inside a populated bin exactly", () => {
    const match = lookupFull(chunk, [0.5, -0.05, -0.15], options);
    expect(match.coverage).toBe("exact");
    expect(match.binDistance).toBe(0);
    expect(match.candidates[0]).toEqual({ name: "파란색", term: "파랑", probability: 0.61 });
  });

  it("orders candidates by descending probability", () => {
    const match = lookupFull(chunk, [0.5, -0.05, -0.15], options);
    expect(match.candidates.map(c => c.term)).toEqual(["파랑", "하늘"]);
  });

  it("honours topN", () => {
    const match = lookupFull(chunk, [0.5, -0.05, -0.15], { ...options, topN: 1 });
    expect(match.candidates).toHaveLength(1);
  });

  it("falls back to the nearest populated bin", () => {
    const match = lookupFull(chunk, [0.56, -0.05, -0.15], options);
    expect(match.coverage).toBe("nearest");
    expect(match.binDistance).toBeGreaterThan(0);
    expect(match.binDistance).toBeLessThanOrEqual(0.075);
    expect(match.candidates[0]?.term).toBe("파랑");
  });

  it("reports no coverage beyond maxDistance", () => {
    const match = lookupFull(chunk, [0.95, 0.3, 0.3], options);
    expect(match.coverage).toBe("none");
    expect(match.candidates).toEqual([]);
  });

  it("respects a maxDistance of zero as exact-only", () => {
    const match = lookupFull(chunk, [0.56, -0.05, -0.15], { ...options, maxDistance: 0 });
    expect(match.coverage).toBe("none");
  });

  it("resolves a canonical blue against the real English chunk", async () => {
    const enChunk = (await uwdataChunks.en!()).default as FullChunk;

    // Oklab centroid of the "blue" term itself, taken straight from en.js.
    const blueOklab: [number, number, number] = [
      0.5807189641779935, -0.039803375872856046, -0.17255500280602332,
    ];
    const match = lookupFull(enChunk, blueOklab, { topN: 5, maxDistance: 0.1 });

    expect(match.coverage).toBe("exact");
    expect(match.binDistance).toBe(0);
    expect(match.candidates[0]?.term).toBe("blue");
    expect(match.candidates.length).toBeGreaterThan(1);

    // Candidates must be sorted by descending probability.
    for (let i = 1; i < match.candidates.length; i++) {
      const prev = match.candidates[i - 1];
      const curr = match.candidates[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      if (prev !== undefined && curr !== undefined) {
        expect(prev.probability).toBeGreaterThanOrEqual(curr.probability);
      }
    }
  });
});
