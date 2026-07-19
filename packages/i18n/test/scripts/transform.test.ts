import { describe, expect, it } from "bun:test";
import type { RawBasicRow, RawFullRecord, RawHueTerm } from "../../scripts/sync-uwdata/fetch";
import { parseBasicInfo, parseFullBinned, parseHueBinned } from "../../scripts/sync-uwdata/fetch";
import { buildFullChunk, buildHueChunk, chunkCoverage } from "../../scripts/sync-uwdata/transform";

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
      { langAbv: "test", term: "low", commonTerm: "lowName", binL: 10, binA: 0, binB: 0, pTC: 0.1 },
      { langAbv: "test", term: "high", commonTerm: "highName", binL: 10, binA: 0, binB: 0, pTC: 0.9 },
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
      { langAbv: "test", term: "present", commonTerm: "presentName", binL: 10, binA: 0, binB: 0, pTC: 0.5 },
      { langAbv: "test", term: "absent", commonTerm: "absentName", binL: 10, binA: 1, binB: 1, pTC: 0.3 },
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
          { pTC: 0.1 }, // bin 0: low probability
          { pTC: 0.0 },
        ],
      },
      high: {
        simplifiedName: "high",
        commonName: "highName",
        bins: [
          { pTC: 0.9 }, // bin 0: high probability
          { pTC: 0.0 },
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

describe("TermTable.indexOf (display-name collision policy)", () => {
  it("keeps the first-seen display name when the same term recurs with a different commonTerm", () => {
    // Test that when the same term appears with different display names,
    // the first occurrence's display name is retained
    const records: RawFullRecord[] = [
      { langAbv: "test", term: "color", commonTerm: "firstDisplayName", binL: 10, binA: 0, binB: 0, pTC: 0.5 },
      { langAbv: "test", term: "color", commonTerm: "secondDisplayName", binL: 10, binA: 1, binB: 1, pTC: 0.3 },
    ];
    const chunk = buildFullChunk("test", records, []);
    // Both records reference the same term "color", so there should be only one term entry
    expect(chunk.terms.filter(t => t[0] === "color")).toHaveLength(1);
    // The display name should be the first one seen
    expect(chunk.terms[0]?.[1]).toBe("firstDisplayName");
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
});
