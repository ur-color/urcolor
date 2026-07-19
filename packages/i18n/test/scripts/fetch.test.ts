import { describe, expect, it } from "bun:test";
import {
  SchemaError,
  parseBasicInfo,
  parseFullBinned,
  parseHueBinned,
  upstreamUrl,
} from "../../scripts/sync-uwdata/fetch";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../fixtures/uwdata/${name}`).text();

describe("parseFullBinned", () => {
  it("parses upstream records", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual({
      langAbv: "ko", term: "파랑", commonTerm: "파란색",
      binL: 11, binA: -1, binB: -4, pTC: 0.61,
    });
  });

  it("throws SchemaError naming the missing column", () => {
    const bad = JSON.stringify([{ langAbv: "ko", term: "파랑", binL: 1, binA: 1, binB: 1 }]);
    expect(() => parseFullBinned(bad)).toThrow(SchemaError);
    expect(() => parseFullBinned(bad)).toThrow(/pTC/);
  });

  it("throws SchemaError when the payload is not an array", () => {
    expect(() => parseFullBinned("{}")).toThrow(SchemaError);
  });
});

describe("parseHueBinned", () => {
  it("parses the nested lang -> term -> bins shape", async () => {
    const parsed = parseHueBinned(await fixture("hue_colors_binned.json"));
    expect(Object.keys(parsed)).toEqual(["ar"]);
    expect(parsed.ar?.["أحمر"]?.bins[0]?.pTC).toBe(0.54);
  });

  it("throws SchemaError when a term has no bins array", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x" } } });
    expect(() => parseHueBinned(bad)).toThrow(/bins/);
  });
});

describe("parseBasicInfo", () => {
  it("parses quoted CSV with the Oklab centroid columns", async () => {
    const rows = parseBasicInfo(await fixture("basic_colors_info_ko.csv"));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.simplifiedName).toBe("파랑");
    expect(rows[0]?.commonName).toBe("파란색");
    expect(rows[0]?.avgFullL).toBeCloseTo(0.521, 4);
    expect(rows[0]?.avgFullB).toBeCloseTo(-0.173, 4);
  });

  it("throws SchemaError when a required column is absent", () => {
    expect(() => parseBasicInfo("lang,lang_abv\nx,ko\n")).toThrow(/avgFullL/);
  });
});

describe("upstreamUrl", () => {
  it("pins the commit sha", () => {
    expect(upstreamUrl("model/lang_info.csv")).toBe(
      "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages/"
      + "f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5/model/lang_info.csv",
    );
  });
});
