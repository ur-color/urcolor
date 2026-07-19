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

  it("throws SchemaError naming the field when langAbv is null", () => {
    const bad = JSON.stringify([
      { langAbv: null, term: "파랑", commonTerm: "파란색", binL: 1, binA: 1, binB: 1, pTC: 0.5 },
    ]);
    expect(() => parseFullBinned(bad)).toThrow(/langAbv/);
  });

  it("throws SchemaError naming the field when term is an empty string", () => {
    const bad = JSON.stringify([
      { langAbv: "ko", term: "", commonTerm: "파란색", binL: 1, binA: 1, binB: 1, pTC: 0.5 },
    ]);
    expect(() => parseFullBinned(bad)).toThrow(/term/);
  });

  it("throws SchemaError naming the field when pTC is non-numeric", () => {
    const bad = JSON.stringify([
      { langAbv: "ko", term: "파랑", commonTerm: "파란색", binL: 1, binA: 1, binB: 1, pTC: "N/A" },
    ]);
    expect(() => parseFullBinned(bad)).toThrow(/pTC/);
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

  it("throws SchemaError when bins is present but not an array", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x", bins: "not-an-array" } } });
    expect(() => parseHueBinned(bad)).toThrow(/bins/);
  });

  it("throws SchemaError naming the field when simplifiedName is null", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: null, commonName: "x", bins: [] } } });
    expect(() => parseHueBinned(bad)).toThrow(/simplifiedName/);
  });

  it("throws SchemaError naming the field when commonName is an empty string", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "", bins: [] } } });
    expect(() => parseHueBinned(bad)).toThrow(/commonName/);
  });

  it("throws SchemaError naming pTC when a bin entry is missing it", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x", bins: [{}] } } });
    expect(() => parseHueBinned(bad)).toThrow(/pTC/);
  });

  it("throws SchemaError naming pTC when a bin entry's pTC is non-numeric", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x", bins: [{ pTC: "N/A" }] } } });
    expect(() => parseHueBinned(bad)).toThrow(/pTC/);
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

  const header = "lang_abv,commonName,simplifiedName,avgFullL,avgFullA,avgFullB";

  it("throws SchemaError naming the field when a required string column is empty", () => {
    const csv = `${header}\n,파란색,파랑,0.52,-0.04,-0.17\n`;
    expect(() => parseBasicInfo(csv)).toThrow(/lang_abv/);
  });

  it("throws SchemaError naming the field when a required numeric column is non-numeric", () => {
    const csv = `${header}\nko,파란색,파랑,N/A,-0.04,-0.17\n`;
    expect(() => parseBasicInfo(csv)).toThrow(/avgFullL/);
  });

  it("throws SchemaError naming the row and column counts when a row has fewer fields than the header", () => {
    const csv = `${header}\nko,파란색,파랑,0.52,-0.04\n`;
    expect(() => parseBasicInfo(csv)).toThrow(/expected 6 columns, got 5/);
  });

  it("parses a CRLF-terminated file identically to the LF fixture", async () => {
    const lf = parseBasicInfo(await fixture("basic_colors_info_ko.csv"));
    const crlf = parseBasicInfo(await fixture("basic_colors_info_ko_crlf.csv"));
    expect(crlf).toEqual(lf);
  });

  it("unescapes a doubled double-quote inside a quoted field", () => {
    const csv = `${header}\nko,"say ""hi""",파랑,0.52,-0.04,-0.17\n`;
    const rows = parseBasicInfo(csv);
    expect(rows[0]?.commonName).toBe("say \"hi\"");
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
