import { Color } from "@urcolor/core";
import { describe, expect, it } from "bun:test";
import type { FullChunk } from "../../src/engine/types";
import type { RawBasicRow, RawFullRecord, RawHueTerm } from "../../scripts/sync-uwdata/fetch";
import { parseBasicInfo, parseFullBinned, parseHueBinned } from "../../scripts/sync-uwdata/fetch";
import { buildFullChunk, buildHueChunk, chunkCoverage } from "../../scripts/sync-uwdata/transform";

/**
 * Independently reproduces the reachable-bin measurement that `chunkCoverage`
 * uses as its full-model denominator, so the test pins real behaviour instead
 * of a hardcoded magic number. Mirrors the production grid resolution (40).
 */
function measureReachableBinCount(binSize: number): number {
  const n = 40;
  const bins = new Set<string>();
  for (let ri = 0; ri < n; ri++) {
    for (let gi = 0; gi < n; gi++) {
      for (let bi = 0; bi < n; bi++) {
        const r = (ri / (n - 1)) * 255;
        const g = (gi / (n - 1)) * 255;
        const b = (bi / (n - 1)) * 255;
        const [l, a, bLab] = Color.fromRgb(r, g, b).to("oklab").coords;
        bins.add(`${Math.round(l / binSize)},${Math.round(a / binSize)},${Math.round(bLab / binSize)}`);
      }
    }
  }
  return bins.size;
}

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../fixtures/uwdata/${name}`).text();

describe("buildFullChunk", () => {
  it("groups records into bins with a shared term table", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const centroids = parseBasicInfo(await fixture("basic_colors_info_ko.csv"));
    const chunk = buildFullChunk("ko", records.filter(r => r.langAbv === "ko"), centroids);

    expect(chunk.model).toBe("full");
    expect(chunk.binSize).toBe(0.05);
    expect(chunk.terms.map(t => t[0])).toEqual(["파랑", "하늘"]);
    expect(chunk.terms[0]?.[1]).toBe("파란색");
    expect(chunk.terms[0]?.[2]).toEqual([0.521, -0.041, -0.173]);
    // pCT from the fixture: "파랑" row has 0.31, "하늘" row has 0.08.
    expect(chunk.terms[0]?.[3]).toBeCloseTo(0.31, 5);
    expect(chunk.terms[1]?.[3]).toBeCloseTo(0.08, 5);
    expect(chunk.bins["11,-1,-4"]).toEqual([[0, 0.61], [1, 0.13]]);
  });

  it("sorts each bin's candidates by descending probability", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const chunk = buildFullChunk("ko", records.filter(r => r.langAbv === "ko"), []);
    const bin = chunk.bins["11,-1,-4"] ?? [];
    expect(bin[0]?.[1]).toBeGreaterThan(bin[1]?.[1] ?? 1);
  });

  it("sorts each bin's candidates even when input is in ascending order", () => {
    // Records deliberately in ascending pTC order (wrong order without sort)
    const records: RawFullRecord[] = [
      { langAbv: "test", term: "low", commonTerm: "lowName", binL: 10, binA: 0, binB: 0, pTC: 0.1, pCT: 0.2 },
      { langAbv: "test", term: "high", commonTerm: "highName", binL: 10, binA: 0, binB: 0, pTC: 0.9, pCT: 0.8 },
    ];
    const chunk = buildFullChunk("test", records, []);
    const bin = chunk.bins["10,0,0"] ?? [];
    expect(bin[0]?.[0]).toBe(1); // "high" should be first (index 1)
    expect(bin[0]?.[1]).toBe(0.9);
    expect(bin[1]?.[0]).toBe(0); // "low" should be second (index 0)
    expect(bin[1]?.[1]).toBe(0.1);
  });

  it("leaves the centroid null when the term is missing from basic info", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const chunk = buildFullChunk("en", records.filter(r => r.langAbv === "en"), []);
    expect(chunk.terms[0]?.[2]).toBeNull();
  });

  it("uses centroid from basic info when term is present, and null when absent", () => {
    const records: RawFullRecord[] = [
      { langAbv: "test", term: "present", commonTerm: "presentName", binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.4 },
      { langAbv: "test", term: "absent", commonTerm: "absentName", binL: 10, binA: 1, binB: 1, pTC: 0.3, pCT: 0.2 },
    ];
    const centroids: RawBasicRow[] = [
      { lang_abv: "test", commonName: "presentName", simplifiedName: "present", avgFullL: 0.5, avgFullA: 0.1, avgFullB: 0.2 },
    ];
    const chunk = buildFullChunk("test", records, centroids);
    expect(chunk.terms[0]?.[2]).toEqual([0.5, 0.1, 0.2]); // present term has centroid
    expect(chunk.terms[1]?.[2]).toBeNull(); // absent term has no centroid
  });
});

describe("buildHueChunk", () => {
  it("expands each term's bin array into per-bin candidate lists", async () => {
    const parsed = parseHueBinned(await fixture("hue_colors_binned.json"));
    const chunk = buildHueChunk("ar", parsed.ar ?? {}, []);

    expect(chunk.model).toBe("hue");
    expect(chunk.binCount).toBe(72);
    expect(chunk.binTerms).toHaveLength(72);
    expect(chunk.binTerms[0]).toEqual([[0, 0.54]]);
    expect(chunk.binTerms[1]).toEqual([[0, 0.09]]);
    expect(chunk.binTerms[2]).toEqual([]);
  });

  it("sorts each bin's candidates by descending probability even when input is in ascending order", () => {
    // Hue terms with probabilities in ascending order for the same bin (wrong order without sort)
    const terms: Record<string, RawHueTerm> = {
      low: {
        simplifiedName: "low",
        commonName: "lowName",
        bins: [
          { pTC: 0.1, pCT: NaN }, // bin 0: low probability
          { pTC: 0.0, pCT: NaN },
        ],
      },
      high: {
        simplifiedName: "high",
        commonName: "highName",
        bins: [
          { pTC: 0.9, pCT: NaN }, // bin 0: high probability
          { pTC: 0.0, pCT: NaN },
        ],
      },
    };
    const chunk = buildHueChunk("test", terms, []);
    // Without the sort, "low" (index 0) would appear before "high" (index 1)
    // With the sort, "high" should be first
    expect(chunk.binTerms[0]?.[0]?.[0]).toBe(1); // "high" should be first (index 1)
    expect(chunk.binTerms[0]?.[0]?.[1]).toBe(0.9);
    expect(chunk.binTerms[0]?.[1]?.[0]).toBe(0); // "low" should be second (index 0)
    expect(chunk.binTerms[0]?.[1]?.[1]).toBe(0.1);
  });
});

describe("TermTable.indexOf (pCT: representative value per term)", () => {
  it("keeps the maximum pCT across a term's bins, not the first or last seen", () => {
    const records: RawFullRecord[] = [
      { langAbv: "test", term: "color", commonTerm: "name", binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.2 },
      { langAbv: "test", term: "color", commonTerm: "name2", binL: 11, binA: 0, binB: 0, pTC: 0.3, pCT: 0.9 },
      { langAbv: "test", term: "color", commonTerm: "name3", binL: 12, binA: 0, binB: 0, pTC: 0.1, pCT: 0.4 },
    ];
    const chunk = buildFullChunk("test", records, []);
    expect(chunk.terms).toHaveLength(1);
    expect(chunk.terms[0]?.[3]).toBe(0.9);
  });

  it("uses a single bin's pCT directly when the term has only one", () => {
    const records: RawFullRecord[] = [
      { langAbv: "test", term: "color", commonTerm: "name", binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.42 },
    ];
    const chunk = buildFullChunk("test", records, []);
    expect(chunk.terms[0]?.[3]).toBe(0.42);
  });
});

describe("buildHueChunk: pCT", () => {
  it("takes the maximum pCT across a term's bins when upstream provides it", () => {
    const terms: Record<string, RawHueTerm> = {
      x: {
        simplifiedName: "x",
        commonName: "xName",
        bins: [{ pTC: 0.1, pCT: 0.2 }, { pTC: 0.9, pCT: 0.8 }],
      },
    };
    const chunk = buildHueChunk("test", terms, []);
    expect(chunk.terms[0]?.[3]).toBe(0.8);
  });

  // Documents the asymmetry noted on TermEntry (engine/types.ts): the full
  // model always has pCT, but a hue-model chunk's pCT is null whenever
  // upstream's bin objects don't carry the signal at all — absent, not zero.
  it("leaves pCT null, not zero, when no bin for the term carries a finite pCT", () => {
    const terms: Record<string, RawHueTerm> = {
      x: {
        simplifiedName: "x",
        commonName: "xName",
        bins: [{ pTC: 0.1, pCT: NaN }, { pTC: 0.9, pCT: NaN }],
      },
    };
    const chunk = buildHueChunk("test", terms, []);
    expect(chunk.terms[0]?.[3]).toBeNull();
  });

  it("ignores a bin with no usable pCT when another bin for the same term has one", () => {
    const terms: Record<string, RawHueTerm> = {
      x: {
        simplifiedName: "x",
        commonName: "xName",
        bins: [{ pTC: 0.1, pCT: NaN }, { pTC: 0.9, pCT: 0.63 }],
      },
    };
    const chunk = buildHueChunk("test", terms, []);
    expect(chunk.terms[0]?.[3]).toBe(0.63);
  });
});

describe("TermTable.indexOf (display-name collision policy)", () => {
  it("keeps the first-seen display name when the same term recurs with a different commonTerm", () => {
    // Test that when the same term appears with different display names,
    // the first occurrence's display name is retained
    const records: RawFullRecord[] = [
      { langAbv: "test", term: "color", commonTerm: "firstDisplayName", binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.4 },
      { langAbv: "test", term: "color", commonTerm: "secondDisplayName", binL: 10, binA: 1, binB: 1, pTC: 0.3, pCT: 0.2 },
    ];
    const chunk = buildFullChunk("test", records, []);
    // Both records reference the same term "color", so there should be only one term entry
    expect(chunk.terms.filter(t => t[0] === "color")).toHaveLength(1);
    // The display name should be the first one seen
    expect(chunk.terms[0]?.[1]).toBe("firstDisplayName");
  });
});

describe("TermTable.indexOf (Unicode normalisation)", () => {
  // Upstream ships some colour terms in NFD (decomposed); anything a caller
  // types, pastes, or writes as a source literal is NFC (composed). Built
  // from explicit code points (not source literals) so the fixture's
  // normalisation form can't be silently altered by an editor or git filter.
  // Real example: Korean "파랑" ("blue"). Code points per the bug report.
  const NFD_TERM = String.fromCharCode(0x1111, 0x1161, 0x1105, 0x1161, 0x11bc);
  const NFC_TERM = String.fromCharCode(0xd30c, 0xb791);
  const NFD_NAME = String.fromCharCode(0x1111, 0x1161, 0x1105, 0x1161, 0x11ab, 0x1109, 0x1162, 0x11a8);

  it("normalises NFD term and name input to NFC on the way in", () => {
    expect(NFD_TERM).not.toBe(NFC_TERM);
    expect(NFD_TERM.normalize("NFC")).toBe(NFC_TERM);

    const records: RawFullRecord[] = [
      { langAbv: "test", term: NFD_TERM, commonTerm: NFD_TERM, binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.4 },
    ];
    const chunk = buildFullChunk("test", records, []);

    expect(chunk.terms[0]?.[0]).toBe(NFC_TERM);
    expect(chunk.terms[0]?.[0]).toBe(chunk.terms[0]?.[0]?.normalize("NFC"));
    expect(chunk.terms[0]?.[1]).toBe(NFC_TERM);
    expect(chunk.terms[0]?.[1]).toBe(chunk.terms[0]?.[1]?.normalize("NFC"));
  });

  it("interns NFD and NFC spellings of the same term to a single entry, not two", () => {
    const records: RawFullRecord[] = [
      { langAbv: "test", term: NFD_TERM, commonTerm: "firstName", binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.4 },
      { langAbv: "test", term: NFC_TERM, commonTerm: "secondName", binL: 10, binA: 1, binB: 1, pTC: 0.3, pCT: 0.2 },
    ];
    const chunk = buildFullChunk("test", records, []);

    expect(chunk.terms).toHaveLength(1);
    expect(chunk.terms[0]?.[0]).toBe(NFC_TERM);
    // First-seen display name wins, per the existing interning policy.
    expect(chunk.terms[0]?.[1]).toBe("firstName");
    // Both records' bins reference the same interned index.
    expect(chunk.bins["10,0,0"]?.[0]?.[0]).toBe(0);
    expect(chunk.bins["10,1,1"]?.[0]?.[0]).toBe(0);
  });

  it("normalises a centroid's NFD simplifiedName so an NFD term still finds its centroid", () => {
    const records: RawFullRecord[] = [
      { langAbv: "test", term: NFD_TERM, commonTerm: NFD_NAME, binL: 10, binA: 0, binB: 0, pTC: 0.5, pCT: 0.4 },
    ];
    const centroids: RawBasicRow[] = [
      { lang_abv: "test", commonName: NFD_NAME, simplifiedName: NFD_TERM, avgFullL: 0.5, avgFullA: 0.1, avgFullB: 0.2 },
    ];
    const chunk = buildFullChunk("test", records, centroids);

    expect(chunk.terms[0]?.[2]).toEqual([0.5, 0.1, 0.2]);
  });

  it("normalises NFD term and name in buildHueChunk too", () => {
    const terms: Record<string, RawHueTerm> = {
      [NFD_TERM]: {
        simplifiedName: NFD_TERM,
        commonName: NFD_NAME,
        bins: [{ pTC: 0.5, pCT: NaN }],
      },
    };
    const chunk = buildHueChunk("test", terms, []);

    expect(chunk.terms[0]?.[0]).toBe(NFC_TERM);
    expect(chunk.terms[0]?.[0]).toBe(chunk.terms[0]?.[0]?.normalize("NFC"));
  });
});

describe("chunkCoverage", () => {
  it("reports term count and populated-bin fraction", async () => {
    const parsed = parseHueBinned(await fixture("hue_colors_binned.json"));
    const coverage = chunkCoverage(buildHueChunk("ar", parsed.ar ?? {}, []));
    expect(coverage.model).toBe("hue");
    expect(coverage.terms).toBe(1);
    expect(coverage.coverage).toBeCloseTo(2 / 72, 5);
  });

  it("reports full-model coverage against the sRGB-reachable bin count, not the Oklab bounding box", () => {
    const binSize = 0.05;
    const reachable = measureReachableBinCount(binSize);
    const populatedCount = 5;

    const chunk: FullChunk = {
      lang: "test",
      model: "full",
      binSize,
      terms: [],
      bins: Object.fromEntries(
        Array.from({ length: populatedCount }, (_, i) => [`${i},0,0`, []]),
      ),
    };

    const coverage = chunkCoverage(chunk);
    expect(coverage.model).toBe("full");
    expect(coverage.terms).toBe(0);
    // The old bug divided by a rectangular Oklab slab (5120 bins at binSize
    // 0.05); the reachable sRGB gamut is a much smaller fraction of that.
    expect(reachable).toBeLessThan(5120);
    expect(coverage.coverage).toBeCloseTo(populatedCount / reachable, 10);
  });

  it("clamps full-model coverage to 1 for wide-gamut data that exceeds the sRGB-reachable bin count", () => {
    const binSize = 0.05;
    const reachable = measureReachableBinCount(binSize);

    const chunk: FullChunk = {
      lang: "test",
      model: "full",
      binSize,
      terms: [],
      // More populated bins than the sRGB gamut can reach (simulates p3/rec2020 samples).
      bins: Object.fromEntries(
        Array.from({ length: reachable + 50 }, (_, i) => [`${i},0,0`, []]),
      ),
    };

    const coverage = chunkCoverage(chunk);
    expect(coverage.coverage).toBe(1);
  });
});
