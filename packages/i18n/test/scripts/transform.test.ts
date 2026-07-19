import { describe, expect, it } from "bun:test";
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

  it("leaves the centroid null when the term is missing from basic info", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const chunk = buildFullChunk("en", records.filter(r => r.langAbv === "en"), []);
    expect(chunk.terms[0]?.[2]).toBeNull();
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
