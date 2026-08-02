import { describe, expect, it } from "bun:test";
import { parseAliases, parseItems, parseLabels, type RawAliasRow, type RawItemRow, type RawLabelRow } from "../../../scripts/sync-wikidata/fetch";
import { buildOutput, renderChunkModule, renderManifest } from "../../../scripts/sync-wikidata/main";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

async function output() {
  return buildOutput(
    parseItems(await fixture("items.json")),
    parseLabels(await fixture("labels.json")),
    parseAliases(await fixture("aliases.json")),
    "2026-08-02T00:00:00.000Z",
  );
}

describe("buildOutput", () => {
  it("emits one chunk per shipping locale", async () => {
    const result = await output();
    expect([...result.chunks.keys()].sort()).toEqual(["en", "ka", "ru", "sr-Cyrl", "sr-Latn"]);
  });

  it("ships thin-tail languages rather than pruning them", async () => {
    const result = await output();
    expect(result.chunks.get("ka")?.terms).toHaveLength(1);
  });

  it("records the catalogue size and per-language coverage", async () => {
    const result = await output();
    expect(result.meta.itemCount).toBe(4);
    expect(result.meta.source).toBe("wikidata");
    expect(result.meta.retrievedAt).toBe("2026-08-02T00:00:00.000Z");
    expect(result.meta.languages.en).toEqual({ model: "palette", terms: 4, coverage: 1 });
    expect(result.meta.languages.ka).toEqual({ model: "palette", terms: 1, coverage: 0.25 });
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

    const result = buildOutput(itemRows, labelRows, aliasRows, "2026-01-01T00:00:00.000Z");

    expect(result.chunks.get("en")?.terms).toHaveLength(3);
    expect(result.collisions).toBe(1);
  });

  it("never emits an empty chunk", async () => {
    const result = await output();
    for (const chunk of result.chunks.values()) {
      expect(chunk.terms.length).toBeGreaterThan(0);
    }
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
