import { describe, expect, it } from "bun:test";
import { parseAliases, parseCatalogue, parseItems, parseLabels, type RawAliasRow, type RawItemRow, type RawLabelRow } from "../../../scripts/sync-wikidata/fetch";
import { buildOutput, renderChunkModule, renderManifest } from "../../../scripts/sync-wikidata/main";
import { fold } from "../../../scripts/sync-wikidata/transform";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

async function output() {
  return buildOutput(
    parseItems(await fixture("items.json")),
    parseLabels(await fixture("labels.json")),
    parseAliases(await fixture("aliases.json")),
    parseCatalogue(await fixture("catalogue.json")),
    "2026-08-02T00:00:00.000Z",
  );
}

describe("buildOutput", () => {
  it("emits one chunk per shipping locale", async () => {
    const result = await output();
    // `de` appears only because Q2516404 (RAL 3020) carries the German
    // descriptive name `Verkehrsrot`, which the split spares.
    expect([...result.chunks.keys()].sort()).toEqual(["de", "en", "ka", "ru", "sr-Cyrl", "sr-Latn"]);
  });

  it("ships thin-tail languages rather than pruning them", async () => {
    const result = await output();
    expect(result.chunks.get("ka")?.terms).toHaveLength(1);
  });

  it("records the catalogue size and per-language coverage", async () => {
    const result = await output();
    // Five items, not six: Q24885519 (Pantone 448 C) lost every label and is
    // pruned out of the denominator, while Q2516404 kept `Verkehrsrot`.
    expect(result.meta.itemCount).toBe(5);
    expect(result.meta.source).toBe("wikidata");
    expect(result.meta.retrievedAt).toBe("2026-08-02T00:00:00.000Z");
    expect(result.meta.languages.en).toEqual({ model: "palette", terms: 4, coverage: 0.8 });
    expect(result.meta.languages.ka).toEqual({ model: "palette", terms: 1, coverage: 0.2 });
  });

  it("reports the items that carried more than one hex", async () => {
    const result = await output();
    expect(result.multiHexItems).toEqual(["Q12894641"]);
  });

  it("reports how many name collisions it resolved", async () => {
    const result = await output();
    // English "white" is the label of both Q23444 and Q62391724.
    expect(result.collisions).toBe(1);
  });

  it("counts one collision per colliding group, not one per extra occurrence", () => {
    // Three distinct items all labelled "red" in en: one colliding GROUP of
    // three, not two "extra occurrences". A naive `seen.has` tally counts
    // N-1 (= 2) per group; the documented contract on `SyncOutput.collisions`
    // — "(locale, name) pairs claimed by more than one item" — counts 1.
    const itemRows: RawItemRow[] = [
      { qid: "Q1001", hex: "FF0000", sitelinks: 10 },
      { qid: "Q1002", hex: "FF0001", sitelinks: 5 },
      { qid: "Q1003", hex: "FF0002", sitelinks: 1 },
    ];
    const labelRows: RawLabelRow[] = [
      { qid: "Q1001", lang: "en", value: "red" },
      { qid: "Q1002", lang: "en", value: "red" },
      { qid: "Q1003", lang: "en", value: "red" },
    ];
    const aliasRows: RawAliasRow[] = [];

    const result = buildOutput(itemRows, labelRows, aliasRows, [], "2026-01-01T00:00:00.000Z");

    expect(result.chunks.get("en")?.terms).toHaveLength(3);
    expect(result.collisions).toBe(1);
  });

  it("never emits an empty chunk", async () => {
    const result = await output();
    for (const chunk of result.chunks.values()) {
      expect(chunk.terms.length).toBeGreaterThan(0);
    }
  });

  it("serialises meta.languages with sorted keys, independent of label row order", () => {
    const itemRows: RawItemRow[] = [{ qid: "Q1", hex: "FF0000", sitelinks: 1 }];
    // Deliberately out of order: `labels` (a Map) preserves insertion order,
    // which follows raw SPARQL row order, which carries no salience signal.
    const labelRows: RawLabelRow[] = [
      { qid: "Q1", lang: "zz", value: "z" },
      { qid: "Q1", lang: "aa", value: "a" },
      { qid: "Q1", lang: "mm", value: "m" },
    ];
    const result = buildOutput(itemRows, labelRows, [], [], "2026-01-01T00:00:00.000Z");
    expect(Object.keys(result.meta.languages)).toEqual(["aa", "mm", "zz"]);
  });

  it("rounds coverage to 4 decimal places without touching terms or itemCount", () => {
    const itemRows: RawItemRow[] = [
      { qid: "Q1", hex: "FF0000", sitelinks: 1 },
      { qid: "Q2", hex: "00FF00", sitelinks: 1 },
      { qid: "Q3", hex: "0000FF", sitelinks: 1 },
    ];
    const labelRows: RawLabelRow[] = [{ qid: "Q1", lang: "xx", value: "one" }];
    const result = buildOutput(itemRows, labelRows, [], [], "2026-01-01T00:00:00.000Z");
    expect(result.meta.itemCount).toBe(3);
    expect(result.meta.languages.xx?.terms).toBe(1);
    // 1/3 = 0.3333333… — rounded, not truncated to a fixed string.
    expect(result.meta.languages.xx?.coverage).toBe(0.3333);
  });
});

describe("renderChunkModule", () => {
  it("emits a default-exported module with attribution", async () => {
    const result = await output();
    const source = renderChunkModule(result.chunks.get("ka")!);
    expect(source).toContain("Do not edit by hand");
    expect(source).toContain("CC0");
    expect(source).toContain("export default ");
    expect(source).toContain("ყვითელი");
  });

  it("emits valid JSON that round-trips to the chunk", async () => {
    const result = await output();
    const chunk = result.chunks.get("en")!;
    const source = renderChunkModule(chunk);
    const json = source.slice(source.indexOf("export default ") + "export default ".length, -2);
    expect(JSON.parse(json)).toEqual(chunk);
  });
});

describe("renderManifest", () => {
  it("emits sorted lazy imports typed as ChunkLoaders", () => {
    const manifest = renderManifest(["ru", "en", "sr-Cyrl"]);
    expect(manifest).toContain("export const wikidataChunks: ChunkLoaders = {");
    expect(manifest.indexOf("\"en\"")).toBeLessThan(manifest.indexOf("\"ru\""));
    expect(manifest).toContain("../../data/wikidata/sr-Cyrl.js");
  });
});

describe("catalogue split reporting", () => {
  it("counts dropped code labels per catalogue", async () => {
    const result = await output();
    // en "RAL 3020"; en and ru "Pantone 448 C".
    expect(result.catalogueDropped).toEqual({ pantone: 2, ral: 1, ncs: 0 });
  });

  it("counts descriptive names spared on catalogue items", async () => {
    const result = await output();
    expect(result.catalogueSpared).toBe(1);
  });

  it("keeps the spared name in its own locale's chunk", async () => {
    const result = await output();
    expect(result.chunks.get("de")?.terms.map(entry => entry[1])).toEqual(["verkehrsrot"]);
  });

  it("ships no catalogue code in any chunk", async () => {
    const result = await output();
    for (const chunk of result.chunks.values()) {
      for (const [, name] of chunk.terms) {
        expect(name).not.toContain("ral 3020");
        expect(name).not.toContain("pantone");
      }
    }
  });
});

describe("name hygiene reporting", () => {
  it("ships every term folded, NFC, and equal to its key", async () => {
    const result = await output();
    for (const [lang, chunk] of result.chunks) {
      for (const [term, name] of chunk.terms) {
        expect(term).toBe(name);
        expect(name).toBe(name.normalize("NFC"));
        expect(name).toBe(fold(name, lang));
      }
    }
  });

  it("reports nothing dropped by the alphabet check for clean fixtures", async () => {
    const result = await output();
    expect(result.droppedByScript).toEqual({});
    expect(result.unlistedLetters).toBe(0);
    expect(result.invariantCaseLocales).toEqual([]);
  });

  it("reports a locale whose tag Intl rejects for case mapping", () => {
    const itemRows: RawItemRow[] = [{ qid: "Q1", hex: "FF0000", sitelinks: 1 }];
    const labelRows: RawLabelRow[] = [{ qid: "Q1", lang: "map-bms", value: "Abang" }];
    const result = buildOutput(itemRows, labelRows, [], [], "2026-01-01T00:00:00.000Z");
    expect(result.invariantCaseLocales).toEqual(["map-bms"]);
    expect(result.chunks.get("map-bms")?.terms[0]![1]).toBe("abang");
  });

  it("reports names the alphabet check removed, in upstream spelling", () => {
    const itemRows: RawItemRow[] = [
      { qid: "Q1", hex: "FF0000", sitelinks: 6 },
      { qid: "Q2", hex: "00FF00", sitelinks: 5 },
      { qid: "Q3", hex: "0000FF", sitelinks: 4 },
      { qid: "Q4", hex: "FFFF00", sitelinks: 3 },
      { qid: "Q5", hex: "000000", sitelinks: 2 },
    ];
    const labelRows: RawLabelRow[] = [
      { qid: "Q1", lang: "ru", value: "Красный" },
      { qid: "Q2", lang: "ru", value: "Зелёный" },
      { qid: "Q3", lang: "ru", value: "Синий" },
      { qid: "Q4", lang: "ru", value: "Жёлтый" },
      { qid: "Q5", lang: "ru", value: "Eigengrau" },
    ];
    const result = buildOutput(itemRows, labelRows, [], [], "2026-01-01T00:00:00.000Z");
    expect(result.droppedByScript).toEqual({ ru: ["Eigengrau"] });
    expect(result.chunks.get("ru")?.terms).toHaveLength(4);
  });
});
