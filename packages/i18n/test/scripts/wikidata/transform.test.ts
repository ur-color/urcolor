import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { parseAliases, parseCatalogue, parseItems, parseLabels } from "../../../scripts/sync-wikidata/fetch";
import type { Catalogue } from "../../../scripts/sync-wikidata/fetch";
import {
  EXCLUDED_LANGUAGES,
  LANGUAGE_MERGE,
  buildItems,
  buildPaletteChunk,
  catalogueMembership,
  groupAliases,
  groupLabels,
  isCatalogueCode,
  normalizeLanguage,
  paletteCoverage,
  pickHex,
  pruneCatalogueItems,
  stripCatalogueCodes,
} from "../../../scripts/sync-wikidata/transform";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

/**
 * Mirrors the pipeline `main.ts` runs, split included. The fixtures carry two
 * catalogue items on purpose — Q2516404 (RAL 3020, which also has the German
 * name `Verkehrsrot`) and Q24885519 (Pantone 448 C, which has only codes) — so
 * skipping the split here would test a shape the sync never produces.
 */
async function load() {
  const membership = catalogueMembership(parseCatalogue(await fixture("catalogue.json")));
  const labelRows = stripCatalogueCodes(parseLabels(await fixture("labels.json")), membership);
  const aliasRows = stripCatalogueCodes(parseAliases(await fixture("aliases.json")), membership);
  const surviving = new Set(labelRows.kept.map(row => row.qid));

  return {
    items: buildItems(pruneCatalogueItems(parseItems(await fixture("items.json")), membership, surviving)),
    labels: groupLabels(labelRows.kept),
    aliases: groupAliases(aliasRows.kept),
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

  it("merges the simple-English pseudo-tag into en", () => {
    // `simple` is Simple English Wikipedia's MediaWiki code, not a BCP 47
    // subtag no `Intl` locale negotiates to it. Its sole term duplicates one
    // already in `en`, so merging (rather than shipping it standalone) is a
    // content no-op.
    expect(normalizeLanguage("simple")).toBe("en");
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
    // Five, not six: Q24885519 (Pantone 448 C) had only code labels and was
    // pruned, while Q2516404 kept German "Verkehrsrot" and so survives.
    expect(items).toHaveLength(5);
    const lilac = items.find(i => i.qid === "Q12894641");
    expect(lilac?.hex).toBe("BF00FF");
  });

  it("orders by sitelinks descending so collisions resolve to the central sense", async () => {
    const { items } = await load();
    expect(items.map(i => i.qid))
      .toEqual(["Q943", "Q23444", "Q12894641", "Q2516404", "Q62391724"]);
  });

  it("computes an Oklab centroid matching a direct conversion", async () => {
    const { items } = await load();
    const yellow = items.find(i => i.qid === "Q943")!;
    const expected = Color.parse("#FFFF00")!.to("oklab").coords;
    expect(yellow.centroid[0]).toBeCloseTo(expected[0], 10);
    expect(yellow.centroid[1]).toBeCloseTo(expected[1], 10);
    expect(yellow.centroid[2]).toBeCloseTo(expected[2], 10);
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
    // Q943 has both en "yellow" and en-us "yellow (US)". The fixture happens
    // to list the "en" row before "en-us", which alone wouldn't distinguish
    // base-tag-wins from plain first-wins-by-arrival — so this assertion is
    // backed up by the inline, order-reversed case below.
    expect(labels.get("en")?.get("Q943")).toBe("yellow");
  });

  it("lets the base tag win even when the variant row arrives first", () => {
    // Same shape as the fixture case above, but built inline with the
    // variant row ("en-us") listed before the base row ("en") — the order
    // the fixture doesn't exercise. If the base-tag-wins guard were deleted
    // and this fell back to first-wins-by-arrival, this would return
    // "yellow (US)" instead.
    const labels = groupLabels([
      { qid: "Q943", lang: "en-us", value: "yellow (US)" },
      { qid: "Q943", lang: "en", value: "yellow" },
    ]);
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

  it("breaks a no-base-tag tie by source language tag, ascending, regardless of row order", () => {
    // Neither row is the base "en" tag, so first-wins-by-arrival would make
    // this depend on `LABELS_QUERY`'s (unordered) result order. The tiebreak
    // must land on the lexicographically smaller source tag ("en-ca") in
    // both input orders.
    const forward = groupLabels([
      { qid: "Q1", lang: "en-gb", value: "grey" },
      { qid: "Q1", lang: "en-ca", value: "gray" },
    ]);
    const reversed = groupLabels([
      { qid: "Q1", lang: "en-ca", value: "gray" },
      { qid: "Q1", lang: "en-gb", value: "grey" },
    ]);
    expect(forward.get("en")?.get("Q1")).toBe("gray");
    expect(reversed.get("en")?.get("Q1")).toBe("gray");
  });

  it("lets the base tag win over competing variants regardless of row order", () => {
    const baseFirst = groupLabels([
      { qid: "Q1", lang: "en", value: "grey-base" },
      { qid: "Q1", lang: "en-gb", value: "grey-variant" },
      { qid: "Q1", lang: "en-ca", value: "gray-variant" },
    ]);
    const baseLast = groupLabels([
      { qid: "Q1", lang: "en-gb", value: "grey-variant" },
      { qid: "Q1", lang: "en-ca", value: "gray-variant" },
      { qid: "Q1", lang: "en", value: "grey-base" },
    ]);
    expect(baseFirst.get("en")?.get("Q1")).toBe("grey-base");
    expect(baseLast.get("en")?.get("Q1")).toBe("grey-base");
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

  it("resolves a shared alias to the more-salient item, regardless of row order", () => {
    // Q1 is far more linked than Q2, but Q2's alias row comes first in the
    // input array — `ALIASES_QUERY` has no `ORDER BY`, so raw row order
    // carries no salience signal. The alias must still resolve to Q1.
    const items = buildItems([
      { qid: "Q2", hex: "000000", sitelinks: 1 },
      { qid: "Q1", hex: "FFFFFF", sitelinks: 100 },
    ]);
    const labels = new Map([
      ["Q1", "foo"],
      ["Q2", "bar"],
    ]);
    const aliases = [
      { qid: "Q2", value: "shared" },
      { qid: "Q1", value: "shared" },
    ];
    const chunk = buildPaletteChunk("xx", items, labels, aliases);
    expect(chunk.terms[chunk.aliases.shared!]?.[1]).toBe("foo");
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

describe("isCatalogueCode", () => {
  it("treats any label containing a decimal digit as a code", () => {
    expect(isCatalogueCode("RAL 5010")).toBe(true);
    expect(isCatalogueCode("Pantone 448 C")).toBe(true);
    expect(isCatalogueCode("彩通448C")).toBe(true);
    // Persian digits. The digit test is script-neutral by design.
    expect(isCatalogueCode("پنتون ۴۴۸ سی")).toBe(true);
  });

  it("treats a catalogue marker word as a code even without digits", () => {
    expect(isCatalogueCode("Pantone Reflex Blue")).toBe(true);
    expect(isCatalogueCode("NCS red")).toBe(true);
    expect(isCatalogueCode("NCS roso")).toBe(true);
    expect(isCatalogueCode("NCS-read")).toBe(true);
  });

  it("spares descriptive names that happen to sit on catalogue items", () => {
    expect(isCatalogueCode("Verkehrsrot")).toBe(false);
    expect(isCatalogueCode("traffic red")).toBe(false);
    expect(isCatalogueCode("rosso traffico")).toBe(false);
    expect(isCatalogueCode("交通紅")).toBe(false);
    expect(isCatalogueCode("シグナルレッド")).toBe(false);
    expect(isCatalogueCode("Mesikollane")).toBe(false);
  });

  it("does not fire on a marker embedded in a longer word", () => {
    expect(isCatalogueCode("coral")).toBe(false);
    expect(isCatalogueCode("general grey")).toBe(false);
  });
});

describe("catalogue split", () => {
  const membership: ReadonlyMap<string, Catalogue> = new Map<string, Catalogue>([
    ["Q1", "ral"],
    ["Q2", "pantone"],
  ]);

  const labels = [
    { qid: "Q1", lang: "de", value: "Verkehrsrot" },
    { qid: "Q1", lang: "en", value: "RAL 3020" },
    { qid: "Q2", lang: "en", value: "Pantone 448 C" },
    { qid: "Q2", lang: "he", value: "פנטון 448c" },
    { qid: "Q3", lang: "en", value: "yellow" },
  ];

  it("maps each QID to its catalogue", () => {
    const map = catalogueMembership([
      { qid: "Q1", catalogue: "ral" },
      { qid: "Q2", catalogue: "pantone" },
    ]);
    expect(map.get("Q1")).toBe("ral");
    expect(map.get("Q2")).toBe("pantone");
    expect(map.has("Q3")).toBe(false);
  });

  it("drops code-shaped labels on catalogue items and keeps descriptive ones", () => {
    const { kept, dropped } = stripCatalogueCodes(labels, membership);
    expect(kept.map(row => row.value)).toEqual(["Verkehrsrot", "yellow"]);
    expect(dropped.map(row => row.value)).toEqual(["RAL 3020", "Pantone 448 C", "פנטון 448c"]);
  });

  it("never touches labels on items outside a catalogue", () => {
    // The item is what makes a label a code, not the label's own shape.
    const { kept } = stripCatalogueCodes(
      [{ qid: "Q3", lang: "en", value: "Pantone 448 C" }],
      membership,
    );
    expect(kept).toHaveLength(1);
  });

  it("keeps a catalogue item only when a label survived", () => {
    const items = [
      { qid: "Q1", hex: "CC0605", sitelinks: 3 },
      { qid: "Q2", hex: "4A412A", sitelinks: 1 },
      { qid: "Q3", hex: "FFFF00", sitelinks: 9 },
    ];
    expect(pruneCatalogueItems(items, membership, new Set(["Q1", "Q3"])).map(row => row.qid))
      .toEqual(["Q1", "Q3"]);
  });

  it("never prunes an item outside a catalogue, even unlabelled", () => {
    // Their presence in the denominator is what makes coverage mean "the
    // fraction of the catalogue this language names".
    const items = [{ qid: "Q9", hex: "FFFFFF", sitelinks: 0 }];
    expect(pruneCatalogueItems(items, membership, new Set())).toHaveLength(1);
  });
});
