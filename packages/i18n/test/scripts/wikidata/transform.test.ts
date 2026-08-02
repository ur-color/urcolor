import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { parseAliases, parseItems, parseLabels } from "../../../scripts/sync-wikidata/fetch";
import {
  EXCLUDED_LANGUAGES,
  LANGUAGE_MERGE,
  buildItems,
  buildPaletteChunk,
  groupAliases,
  groupLabels,
  normalizeLanguage,
  paletteCoverage,
  pickHex,
} from "../../../scripts/sync-wikidata/transform";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

async function load() {
  return {
    items: buildItems(parseItems(await fixture("items.json"))),
    labels: groupLabels(parseLabels(await fixture("labels.json"))),
    aliases: groupAliases(parseAliases(await fixture("aliases.json"))),
  };
}

describe("normalizeLanguage", () => {
  it("merges region-only variants into their base tag", () => {
    expect(normalizeLanguage("en-us")).toBe("en");
    expect(normalizeLanguage("en-gb")).toBe("en");
    expect(normalizeLanguage("de-at")).toBe("de");
    expect(normalizeLanguage("pt-br")).toBe("pt");
  });

  it("renames script variants to well-formed BCP 47 subtags", () => {
    expect(normalizeLanguage("sr-ec")).toBe("sr-Cyrl");
    expect(normalizeLanguage("sr-el")).toBe("sr-Latn");
    expect(normalizeLanguage("tt-cyrl")).toBe("tt-Cyrl");
    expect(normalizeLanguage("ms-arab")).toBe("ms-Arab");
  });

  it("treats Chinese regional tags as script tags", () => {
    expect(normalizeLanguage("zh-cn")).toBe("zh");
    expect(normalizeLanguage("zh-hans")).toBe("zh");
    expect(normalizeLanguage("zh-tw")).toBe("zh-Hant");
    expect(normalizeLanguage("zh-hant")).toBe("zh-Hant");
  });

  it("passes through tags with no merge rule", () => {
    expect(normalizeLanguage("ka")).toBe("ka");
    expect(normalizeLanguage("be-tarask")).toBe("be-tarask");
    expect(normalizeLanguage("map-bms")).toBe("map-bms");
  });

  it("drops pseudo-languages", () => {
    expect(normalizeLanguage("mul")).toBeUndefined();
    expect(normalizeLanguage("zxx")).toBeUndefined();
    expect(EXCLUDED_LANGUAGES.has("mul")).toBe(true);
  });

  it("is case-insensitive about the incoming tag", () => {
    expect(normalizeLanguage("EN-US")).toBe("en");
    expect(normalizeLanguage("MUL")).toBeUndefined();
  });

  it("never maps a tag onto an excluded one", () => {
    for (const target of Object.values(LANGUAGE_MERGE)) {
      expect(EXCLUDED_LANGUAGES.has(target.toLowerCase())).toBe(false);
    }
  });
});

describe("pickHex", () => {
  it("sorts and takes the first, so the choice is stable across syncs", () => {
    expect(pickHex(["C8A2C8", "BF00FF"])).toBe("BF00FF");
    expect(pickHex(["BF00FF", "C8A2C8"])).toBe("BF00FF");
  });

  it("returns the only value when there is no ambiguity", () => {
    expect(pickHex(["FFFF00"])).toBe("FFFF00");
  });
});

describe("buildItems", () => {
  it("collapses multi-hex rows into one item", async () => {
    const { items } = await load();
    expect(items).toHaveLength(4);
    const lilac = items.find(i => i.qid === "Q12894641");
    expect(lilac?.hex).toBe("BF00FF");
  });

  it("orders by sitelinks descending so collisions resolve to the central sense", async () => {
    const { items } = await load();
    expect(items.map(i => i.qid)).toEqual(["Q943", "Q23444", "Q12894641", "Q62391724"]);
  });

  it("computes an Oklab centroid matching a direct conversion", async () => {
    const { items } = await load();
    const yellow = items.find(i => i.qid === "Q943")!;
    const expected = Color.parse("#FFFF00")!.to("oklab").coords;
    expect(yellow.centroid[0]).toBeCloseTo(expected[0]!, 10);
    expect(yellow.centroid[1]).toBeCloseTo(expected[1]!, 10);
    expect(yellow.centroid[2]).toBeCloseTo(expected[2]!, 10);
  });

  it("breaks a sitelink tie by ascending numeric QID", () => {
    const items = buildItems([
      { qid: "Q100", hex: "FFFFFF", sitelinks: 5 },
      { qid: "Q20", hex: "000000", sitelinks: 5 },
    ]);
    expect(items.map(i => i.qid)).toEqual(["Q20", "Q100"]);
  });
});

describe("groupLabels", () => {
  it("merges variant tags into the base bucket", async () => {
    const { labels } = await load();
    expect(labels.get("en")?.get("Q12894641")).toBe("lilac");
  });

  it("lets the base tag win over a variant for the same item", async () => {
    const { labels } = await load();
    // Q943 has both en "yellow" and en-us "yellow (US)".
    expect(labels.get("en")?.get("Q943")).toBe("yellow");
  });

  it("keeps script variants in separate buckets", async () => {
    const { labels } = await load();
    expect(labels.get("sr-Cyrl")?.get("Q943")).toBe("жута");
    expect(labels.get("sr-Latn")?.get("Q943")).toBe("žuta");
  });

  it("drops excluded pseudo-languages", async () => {
    const { labels } = await load();
    expect(labels.has("mul")).toBe(false);
  });

  it("keeps thin-tail languages", async () => {
    const { labels } = await load();
    expect(labels.get("ka")?.get("Q943")).toBe("ყვითელი");
  });
});

describe("buildPaletteChunk", () => {
  it("emits one entry per labelled item, in salience order", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("en", items, labels.get("en")!, aliases.get("en") ?? []);

    expect(chunk.model).toBe("palette");
    expect(chunk.lang).toBe("en");
    expect(chunk.terms.map(t => t[0])).toEqual(["yellow", "white", "lilac", "white"]);
    expect(chunk.provenance.map(p => p[0])).toEqual(["Q943", "Q23444", "Q12894641", "Q62391724"]);
  });

  it("keeps both sides of a name collision, most-linked first", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("en", items, labels.get("en")!, aliases.get("en") ?? []);
    const whites = chunk.terms
      .map((term, index) => ({ term: term[0], qid: chunk.provenance[index]![0] }))
      .filter(entry => entry.term === "white");
    expect(whites.map(w => w.qid)).toEqual(["Q23444", "Q62391724"]);
  });

  it("uses a lowercased term key and the written label as the name", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("en", items, labels.get("en")!, aliases.get("en") ?? []);
    const lilac = chunk.terms.find(t => t[1] === "lilac");
    expect(lilac?.[0]).toBe("lilac");
  });

  it("always leaves pCT null — the source carries no such signal", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("en", items, labels.get("en")!, aliases.get("en") ?? []);
    expect(chunk.terms.every(t => t[3] === null)).toBe(true);
  });

  it("indexes aliases lowercased, pointing at the right term", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("en", items, labels.get("en")!, aliases.get("en") ?? []);
    expect(chunk.terms[chunk.aliases["yellow color"]!]?.[0]).toBe("yellow");
    expect(chunk.terms[chunk.aliases["color yellow"]!]?.[0]).toBe("yellow");
    // "White" is an alias of Q23444, lowercased on the way in.
    expect(chunk.terms[chunk.aliases["white"]!]?.[0]).toBe("white");
  });

  it("omits items this language has no label for", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("ka", items, labels.get("ka")!, aliases.get("ka") ?? []);
    expect(chunk.terms).toHaveLength(1);
    expect(chunk.terms[0]?.[1]).toBe("ყვითელი");
  });

  it("normalises terms, names, and aliases to NFC", () => {
    const decomposed = "же́"; // же + combining acute
    const composed = decomposed.normalize("NFC");
    const items = buildItems([{ qid: "Q1", hex: "FFFFFF", sitelinks: 1 }]);
    const chunk = buildPaletteChunk(
      "xx",
      items,
      new Map([["Q1", decomposed]]),
      [{ qid: "Q1", value: decomposed }],
    );
    expect(chunk.terms[0]?.[1]).toBe(composed);
    expect(Object.keys(chunk.aliases)).toEqual([composed.toLowerCase()]);
  });
});

describe("paletteCoverage", () => {
  it("reports terms over the catalogue size", async () => {
    const { items, labels, aliases } = await load();
    const chunk = buildPaletteChunk("en", items, labels.get("en")!, aliases.get("en") ?? []);
    expect(paletteCoverage(chunk, 4)).toEqual({ model: "palette", terms: 4, coverage: 1 });
    expect(paletteCoverage(chunk, 8).coverage).toBe(0.5);
  });

  it("reports zero coverage rather than NaN for an empty catalogue", () => {
    const chunk = { lang: "xx", model: "palette" as const, terms: [], provenance: [], aliases: {} };
    expect(paletteCoverage(chunk, 0).coverage).toBe(0);
  });
});
