import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  SchemaError,
  download,
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

  it("throws SchemaError naming the index when a record element is null", () => {
    expect(() => parseFullBinned("[null]")).toThrow(SchemaError);
    expect(() => parseFullBinned("[null]")).toThrow(/full_color_names_binned\[0\]/);
  });

  it("throws SchemaError naming the index when a record element is not an object", () => {
    expect(() => parseFullBinned("[\"nope\"]")).toThrow(SchemaError);
    expect(() => parseFullBinned("[\"nope\"]")).toThrow(/full_color_names_binned\[0\]/);
  });

  const validFullRecord = {
    langAbv: "ko", term: "파랑", commonTerm: "파란색", binL: 1, binA: 1, binB: 1, pTC: 0.5,
  };

  const invalidNumericValues: [string, unknown][] = [
    ["null", null],
    ["an empty string", ""],
    ["a whitespace-only string", "   "],
    ["a non-numeric string", "N/A"],
    ["true", true],
    ["false", false],
    ["an empty array", []],
    ["an array with a number", [5]],
    ["an empty object", {}],
    ["a string that overflows to Infinity", "1e400"],
    ["a missing key", undefined],
  ];

  it.each(invalidNumericValues)("rejects pTC when it is %s", (_label, value) => {
    const bad = JSON.stringify([{ ...validFullRecord, pTC: value }]);
    expect(() => parseFullBinned(bad)).toThrow(SchemaError);
    expect(() => parseFullBinned(bad)).toThrow(/pTC/);
  });

  const invalidStringValues: [string, unknown][] = [
    ["null", null],
    ["an empty string", ""],
    ["a whitespace-only string", "   "],
    ["a number", 42],
    ["an object", {}],
  ];

  it.each(invalidStringValues)("rejects langAbv when it is %s", (_label, value) => {
    const bad = JSON.stringify([{ ...validFullRecord, langAbv: value }]);
    expect(() => parseFullBinned(bad)).toThrow(SchemaError);
    expect(() => parseFullBinned(bad)).toThrow(/langAbv/);
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

  it("throws SchemaError naming the bin index when a bin entry is null", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x", bins: [null] } } });
    expect(() => parseHueBinned(bad)).toThrow(SchemaError);
    expect(() => parseHueBinned(bad)).toThrow(/hue\[ar\]\[x\]\.bins\[0\]/);
  });

  it("throws SchemaError naming the bin index when a bin entry is not an object", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x", bins: ["nope"] } } });
    expect(() => parseHueBinned(bad)).toThrow(SchemaError);
    expect(() => parseHueBinned(bad)).toThrow(/hue\[ar\]\[x\]\.bins\[0\]/);
  });

  it("throws SchemaError naming the term when a term value is null", () => {
    const bad = JSON.stringify({ ar: { x: null } });
    expect(() => parseHueBinned(bad)).toThrow(SchemaError);
    expect(() => parseHueBinned(bad)).toThrow(/hue\[ar\]\[x\]/);
  });

  it("throws SchemaError naming the language when a language value is null", () => {
    const bad = JSON.stringify({ ar: null });
    expect(() => parseHueBinned(bad)).toThrow(SchemaError);
    expect(() => parseHueBinned(bad)).toThrow(/hue\[ar\]/);
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

  it("parses a blank avgFullL/avgFullA/avgFullB as NaN rather than throwing", () => {
    // Real upstream data: terms with too few full-colour samples to average
    // ship with these three cells empty, not missing or malformed.
    const csv = `${header}\nko,파란색,파랑,,,\n`;
    const rows = parseBasicInfo(csv);
    expect(rows[0]?.avgFullL).toBeNaN();
    expect(rows[0]?.avgFullA).toBeNaN();
    expect(rows[0]?.avgFullB).toBeNaN();
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
  it("pins the commit sha by default", () => {
    expect(upstreamUrl("model/lang_info.csv")).toBe(
      "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages/"
      + "f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5/model/lang_info.csv",
    );
  });

  it("accepts an explicit commit sha, overriding the pinned default", () => {
    expect(upstreamUrl("model/lang_info.csv", "deadbeefcafe")).toBe(
      "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages/"
      + "deadbeefcafe/model/lang_info.csv",
    );
  });
});

describe("download", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("downloads from the pinned default commit sha when none is given", async () => {
    // `download` always calls `fetch` with a plain string URL, never a
    // Request/URL object, so the mock can assert on `input` directly.
    const fetchMock = mock(async (input: string) => {
      expect(input).toBe(
        "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages/"
        + "f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5/model/lang_info.csv",
      );
      return new Response("ok");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await download("model/lang_info.csv")).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("downloads from an explicit commit sha when given one", async () => {
    const fetchMock = mock(async (input: string) => {
      expect(input).toBe(
        "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages/"
        + "deadbeefcafe/model/lang_info.csv",
      );
      return new Response("ok-at-ref");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await download("model/lang_info.csv", "deadbeefcafe")).toBe("ok-at-ref");
  });

  it("throws a SchemaError carrying the HTTP status on failure", async () => {
    globalThis.fetch = mock(async () => new Response("nope", { status: 404 })) as unknown as typeof fetch;

    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(download("model/missing.csv")).rejects.toThrow(SchemaError);
  });
});

describe("SchemaError", () => {
  it("carries the HTTP status when given one", () => {
    const error = new SchemaError("Failed to download x: HTTP 404", 404);
    expect(error.status).toBe(404);
  });

  it("leaves status undefined for schema-drift errors", () => {
    const error = new SchemaError("missing column");
    expect(error.status).toBeUndefined();
  });
});
