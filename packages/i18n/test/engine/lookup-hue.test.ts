import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { lookupHue } from "../../src/engine/lookup-hue";
import type { HueChunk } from "../../src/engine/types";
import { uwdataChunks } from "../../src/sources/uwdata/chunks";

// 72 bins over 360°, so bin 0 covers 0–5° (red) and bin 48 covers 240–245° (blue).
const chunk: HueChunk = {
  lang: "ar",
  model: "hue",
  binCount: 72,
  terms: [["أحمر", "أحمر", null], ["أزرق", "أزرق", null]],
  binTerms: Array.from({ length: 72 }, (_, index) => {
    if (index === 0) return [[0, 0.54]] as [number, number][];
    if (index === 48) return [[1, 0.71]] as [number, number][];
    return [] as [number, number][];
  }),
};

const options = { topN: 5, maxDistance: 0.075, maxHueDistance: 0.2 };

describe("lookupHue", () => {
  it("names a saturated red", () => {
    const match = lookupHue(chunk, Color.parse("#ff0000")!, options);
    expect(match.coverage).toBe("exact");
    expect(match.candidates[0]?.term).toBe("أحمر");
    expect(match.hueProjectionDistance).toBeLessThan(0.05);
  });

  it("names a saturated blue", () => {
    const match = lookupHue(chunk, Color.parse("#0000ff")!, options);
    expect(match.candidates[0]?.term).toBe("أزرق");
  });

  it("reports no coverage for an unpopulated hue", () => {
    const match = lookupHue(chunk, Color.parse("#00ff00")!, options);
    expect(match.coverage).toBe("none");
    expect(match.candidates).toEqual([]);
  });

  it("reports no coverage for grey, which has no meaningful hue", () => {
    const match = lookupHue(chunk, Color.parse("#808080")!, options);
    expect(match.coverage).toBe("none");
    expect(match.hueProjectionDistance).toBeGreaterThan(options.maxHueDistance);
  });

  it("reports no coverage for a desaturated pastel far from the hue line", () => {
    const match = lookupHue(chunk, Color.parse("#ffd9d9")!, options);
    expect(match.coverage).toBe("none");
  });

  it("resolves a vivid colour and rejects a grey against the real Arabic hue chunk", async () => {
    const arChunk = (await uwdataChunks.ar!()).default as HueChunk;

    // #ff0000 is squarely bin 0 (0°) of the 72-bin ring; ar.js's bin 0 is
    // populated (see the generated data), so this should resolve.
    const vivid = lookupHue(arChunk, Color.parse("#ff0000")!, options);
    expect(vivid.coverage).toBe("exact");
    expect(vivid.candidates.length).toBeGreaterThan(0);
    expect(vivid.hueProjectionDistance).toBeLessThan(0.05);

    const grey = lookupHue(arChunk, Color.parse("#808080")!, options);
    expect(grey.coverage).toBe("none");
    expect(grey.candidates).toEqual([]);
  });
});
