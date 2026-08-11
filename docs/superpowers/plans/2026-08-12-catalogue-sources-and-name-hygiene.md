# Catalogue Sources and Name Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Pantone, RAL and NCS codes out of the `wikidata` colour-name source into two new opt-in, language-neutral sources, and fold every remaining `wikidata` name to lower case under its own locale while dropping names written in a script the locale does not use.

**Architecture:** Three independent policies land in `scripts/sync-wikidata/transform.ts` and run per chunk in a fixed order: catalogue split, alphabet check, locale-aware fold. Two new sync scripts (`sync-pantone`, `sync-ral`) mirror the existing `sync-uwdata` three-file layout and each emit a single `und` palette chunk. The engine gains one flag, `NameSource.languageNeutral`, which makes source-chain resolution return that `und` chunk for any requested locale.

**Tech Stack:** Bun, TypeScript, `bun test`, `@urcolor/core` for hex-to-Oklab, Wikidata Query Service (SPARQL over HTTP), two MIT-licensed GitHub raw files.

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-08-12-catalogue-sources-and-name-hygiene-design.md`. Read it before starting.
- Run every command from `packages/i18n/`. Tests are `bun test <path>`.
- Never edit anything under `src/data/` or `src/sources/*/chunks.ts` by hand. They are generated.
- Every generated term, name and alias must be NFC-normalised.
- Catalogue items are identified by QID, never by matching label text.
- `setDefaultSources(["uwdata", "wikidata"])` in `src/index.ts` must not change. The new sources are opt-in.
- The language-neutral locale tag is the literal string `"und"`.
- The catalogue discriminators are exactly: Pantone `wdt:P31 wd:Q104919542`, RAL `wdt:P31 wd:Q17421658`, NCS `wdt:P361 wd:Q1503197`.
- The alphabet-check threshold is exactly `Math.max(3, terms.length * 0.05)`.
- Prose in docs follows `CLAUDE.md`: no em dashes in English prose.

---

### Task 1: `languageNeutral` sources

**Files:**
- Modify: `src/engine/types.ts` (the `NameSource` interface)
- Modify: `src/engine/source-chain.ts:43-94`
- Modify: `src/color-names.ts:213-218`
- Test: `test/engine/source-chain.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `NEUTRAL_LOCALE` (the string `"und"`, exported from `src/engine/source-chain.ts`) and the optional `NameSource.languageNeutral?: boolean` field. Tasks 7 and 8 set that field on their source descriptors and key their chunk loaders on `"und"`.

- [ ] **Step 1: Write the failing test**

Append to `test/engine/source-chain.test.ts`. Check the top of that file first: it saves and restores the module-level default chain around its tests, and registers throwaway sources. Follow whatever pattern is already there for registering a fake source.

```ts
describe("language-neutral sources", () => {
  // Registered once for the whole block: `registerSource` writes to shared
  // module state with no unregister, so registering inside individual `it`
  // bodies would make these tests depend on execution order.
  beforeAll(() => {
    registerSource(
      {
        id: "fake-catalogue",
        title: "Fake",
        url: "https://example.invalid/",
        license: "MIT",
        citation: "none",
        languageNeutral: true,
        languages: { und: { model: "palette", terms: 2, coverage: 1 } },
      },
      { und: async () => ({ default: { lang: "und", model: "palette", terms: [], provenance: [], aliases: {} } }) },
    );
    registerSource(
      {
        id: "fake-linguistic",
        title: "Fake",
        url: "https://example.invalid/",
        license: "MIT",
        citation: "none",
        languages: { de: { model: "palette", terms: 1, coverage: 1 } },
      },
      { de: async () => ({ default: { lang: "de", model: "palette", terms: [], provenance: [], aliases: {} } }) },
    );
  });

  it("answers any requested locale with the und chunk", () => {
    expect(resolveSourceChain("ka", ["fake-catalogue"]))
      .toEqual({ source: "fake-catalogue", locale: "und" });
    expect(resolveSourceChain("zh-Hant", ["fake-catalogue"]))
      .toEqual({ source: "fake-catalogue", locale: "und" });
    expect(resolveSourceChain(["xx-YY"], ["fake-catalogue"]))
      .toEqual({ source: "fake-catalogue", locale: "und" });
  });

  it("does not let a neutral source pre-empt an earlier source that has the locale", () => {
    expect(resolveSourceChain("de", ["fake-linguistic", "fake-catalogue"]))
      .toEqual({ source: "fake-linguistic", locale: "de" });
    expect(resolveSourceChain("fr", ["fake-linguistic", "fake-catalogue"]))
      .toEqual({ source: "fake-catalogue", locale: "und" });
  });

  it("treats a one-locale ordinary source as ordinary", () => {
    expect(resolveSourceChain("fr", ["fake-linguistic"])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/engine/source-chain.test.ts`
Expected: FAIL. TypeScript rejects `languageNeutral` as an unknown property, and `resolveSourceChain("ka", ["fake-catalogue"])` returns `undefined`.

- [ ] **Step 3: Add the field to `NameSource`**

In `src/engine/types.ts`, inside `interface NameSource`, after the `retrievedAt` field:

```ts
  /**
   * True when this source's names are the same string in every language, as
   * industrial catalogue codes are: `RAL 1005` is `RAL 1005` everywhere.
   * Such a source ships one chunk under the `und` tag, and locale negotiation
   * returns it for any requested locale rather than matching subtags.
   *
   * Declared here rather than inferred from a one-locale chunk map, so a
   * genuinely linguistic source that happens to cover a single locale never
   * acquires the behaviour by accident.
   */
  languageNeutral?: boolean;
```

- [ ] **Step 4: Honour it in source-chain resolution**

In `src/engine/source-chain.ts`, add the constant below the imports:

```ts
/** The tag a language-neutral source ships its single chunk under. */
export const NEUTRAL_LOCALE = "und";
```

Replace the body of `resolveSourceChain` (currently lines 67-85) with:

```ts
export function resolveSourceChain(
  locales: string | readonly string[],
  chain: readonly string[],
): SourceChainMatch | undefined {
  const tags = typeof locales === "string" ? [locales] : locales;
  const available = chain.map(id => [id, localesOf(id), getSource(id).languageNeutral === true] as const);

  for (const tag of tags) {
    for (const rung of localeLadder(tag)) {
      const key = rung.toLowerCase();
      for (const [source, locales_, neutral] of available) {
        // A neutral source answers at the first rung it is offered: its one
        // chunk is as correct for `zh-Hant` as for `ka`. It still only gets
        // that offer after every earlier source in the chain has missed the
        // same rung, so an ordinary source that genuinely has the locale
        // always wins.
        if (neutral) return { source, locale: NEUTRAL_LOCALE };
        const registered = locales_.get(key);
        if (registered !== undefined) return { source, locale: registered };
      }
    }
  }

  return undefined;
}
```

- [ ] **Step 5: Make `supportedLocalesOf` agree**

`chainLocales` reports a neutral source's only locale as `und`, which no ordinary tag negotiates to, so `supportedLocalesOf` would wrongly report nothing. In `src/color-names.ts`, replace `supportedLocalesOf` (lines 213-218) with:

```ts
  static supportedLocalesOf(
    locales: string | readonly string[],
    options: { source?: string | readonly string[] } = {},
  ): string[] {
    const chain = normalizeChain(options.source);
    // A language-neutral source can answer any tag at all, so every requested
    // tag is supported once one is in the chain. Filtering against
    // `chainLocales` would compare ordinary tags to `und` and report none.
    if (chain.some(id => getSource(id).languageNeutral === true)) {
      return typeof locales === "string" ? [locales] : [...locales];
    }
    return filterSupportedLocales(locales, chainLocales(chain));
  }
```

- [ ] **Step 6: Run the engine tests**

Run: `bun test test/engine/ test/color-names.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/source-chain.ts src/color-names.ts test/engine/source-chain.test.ts
git commit -m "feat(i18n): let a source declare itself language-neutral"
```

---

### Task 2: Fetch catalogue membership from Wikidata

**Files:**
- Modify: `scripts/sync-wikidata/fetch.ts`
- Create: `test/fixtures/wikidata/catalogue.json`
- Test: `test/scripts/wikidata/fetch.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Catalogue` (the union `"pantone" | "ral" | "ncs"`), `RawCatalogueRow` (`{ qid: string; catalogue: Catalogue }`), `CATALOGUE_QUERY` and `parseCatalogue(json: string): RawCatalogueRow[]`, all from `scripts/sync-wikidata/fetch.ts`. Task 3 consumes `RawCatalogueRow`; Task 6 runs `CATALOGUE_QUERY`.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/wikidata/catalogue.json`. The QIDs must match the ones already used in `test/fixtures/wikidata/items.json`; open that file and pick two real ones to stand in as catalogue items, then use those QIDs here. This example assumes `Q24885519` and `Q35795538`; substitute whatever the items fixture actually contains.

```json
{
  "head": { "vars": [ "item", "catalogue" ] },
  "results": {
    "bindings": [
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q24885519" }, "catalogue": { "type": "literal", "value": "pantone" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q35795538" }, "catalogue": { "type": "literal", "value": "ral" } }
    ]
  }
}
```

- [ ] **Step 2: Write the failing test**

Append to `test/scripts/wikidata/fetch.test.ts`:

```ts
describe("parseCatalogue", () => {
  const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

  it("reads QID and catalogue name from each binding", async () => {
    const rows = parseCatalogue(await fixture("catalogue.json"));
    expect(rows).toEqual([
      { qid: "Q24885519", catalogue: "pantone" },
      { qid: "Q35795538", catalogue: "ral" },
    ]);
  });

  it("throws on an unknown catalogue name", async () => {
    const drifted = (await fixture("catalogue.json")).replace('"pantone"', '"munsell"');
    expect(() => parseCatalogue(drifted)).toThrow(SchemaError);
  });

  it("queries all three discriminators", () => {
    expect(CATALOGUE_QUERY).toContain("wd:Q104919542");
    expect(CATALOGUE_QUERY).toContain("wd:Q17421658");
    expect(CATALOGUE_QUERY).toContain("wd:Q1503197");
  });
});
```

Add `CATALOGUE_QUERY` and `parseCatalogue` to that file's existing import from `../../../scripts/sync-wikidata/fetch`.

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test test/scripts/wikidata/fetch.test.ts`
Expected: FAIL with an import error, `parseCatalogue` is not exported.

- [ ] **Step 4: Implement**

In `scripts/sync-wikidata/fetch.ts`, add after `ALIASES_QUERY` (line 41):

```ts
/**
 * Which items are industrial catalogue entries rather than linguistic colour
 * names. Membership is a property of the item, so one statement covers every
 * language at once: Q24885519 is `Pantone 448 C` in English, `彩通448C` in
 * Chinese and `פנטון 448c` in Hebrew, and a label regex written in English
 * misses the other two.
 *
 * NCS uses `P361` rather than `P31` because its four items carry only
 * `P31 wd:Q1075`, the generic colour class, and are distinguished solely by
 * the system they are part of.
 */
export const CATALOGUE_QUERY = `SELECT DISTINCT ?item ?catalogue WHERE {
  { ?item wdt:P31 wd:Q104919542 . BIND("pantone" AS ?catalogue) }
  UNION { ?item wdt:P31 wd:Q17421658 . BIND("ral" AS ?catalogue) }
  UNION { ?item wdt:P361 wd:Q1503197 . BIND("ncs" AS ?catalogue) }
}`;

export type Catalogue = "pantone" | "ral" | "ncs";

const CATALOGUES: ReadonlySet<string> = new Set<Catalogue>(["pantone", "ral", "ncs"]);

export interface RawCatalogueRow {
  qid: string;
  catalogue: Catalogue;
}
```

Add the parser at the end of the file:

```ts
export function parseCatalogue(json: string): RawCatalogueRow[] {
  return bindingsOf(json, "catalogue").map((binding, index) => {
    const where = `catalogue.bindings[${index}]`;
    const catalogue = cellValue(binding, "catalogue", where);
    if (!CATALOGUES.has(catalogue)) {
      throw new SchemaError(
        `WDQS schema drift in ${where}: "${catalogue}" is not a known catalogue.`,
      );
    }
    return {
      qid: qidOf(cellValue(binding, "item", where), where),
      catalogue: catalogue as Catalogue,
    };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/scripts/wikidata/fetch.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-wikidata/fetch.ts test/scripts/wikidata/fetch.test.ts test/fixtures/wikidata/catalogue.json
git commit -m "feat(i18n): query wikidata catalogue membership"
```

---

### Task 3: The catalogue split and the code-shape rule

**Files:**
- Modify: `scripts/sync-wikidata/transform.ts`
- Test: `test/scripts/wikidata/transform.test.ts`

**Interfaces:**
- Consumes: `Catalogue`, `RawCatalogueRow`, `RawItemRow`, `RawLabelRow` from Task 2's `fetch.ts`.
- Produces, all from `scripts/sync-wikidata/transform.ts`:
  - `isCatalogueCode(label: string): boolean`
  - `catalogueMembership(rows: readonly RawCatalogueRow[]): Map<string, Catalogue>`
  - `stripCatalogueCodes<T extends RawLabelRow>(rows: readonly T[], membership: ReadonlyMap<string, Catalogue>): { kept: T[]; dropped: T[] }`
  - `pruneCatalogueItems(itemRows: readonly RawItemRow[], membership: ReadonlyMap<string, Catalogue>, survivingQids: ReadonlySet<string>): RawItemRow[]`

  Task 6 calls all four.

- [ ] **Step 1: Write the failing test**

Append to `test/scripts/wikidata/transform.test.ts`:

```ts
describe("isCatalogueCode", () => {
  it("treats any label containing a decimal digit as a code", () => {
    expect(isCatalogueCode("RAL 5010")).toBe(true);
    expect(isCatalogueCode("Pantone 448 C")).toBe(true);
    expect(isCatalogueCode("彩通448C")).toBe(true);
    expect(isCatalogueCode("پنتون ۴۴۸ سی")).toBe(true); // Arabic-Indic digits
  });

  it("treats a catalogue marker word as a code even without digits", () => {
    expect(isCatalogueCode("Pantone Reflex Blue")).toBe(true);
    expect(isCatalogueCode("NCS red")).toBe(true);
    expect(isCatalogueCode("NCS roso")).toBe(true);
    expect(isCatalogueCode("NCS-read")).toBe(true); // Frisian, hyphen-separated
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
    // "coral" ends in "ral"; "general" contains it. Neither is a RAL code.
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

  it("drops code-shaped labels on catalogue items and keeps descriptive ones", () => {
    const { kept, dropped } = stripCatalogueCodes(labels, membership);
    expect(kept.map(row => row.value)).toEqual(["Verkehrsrot", "yellow"]);
    expect(dropped.map(row => row.value)).toEqual(["RAL 3020", "Pantone 448 C", "פנטון 448c"]);
  });

  it("never touches labels on items outside a catalogue", () => {
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
    const surviving = new Set(["Q1", "Q3"]);
    expect(pruneCatalogueItems(items, membership, surviving).map(row => row.qid))
      .toEqual(["Q1", "Q3"]);
  });

  it("maps each QID to its catalogue", () => {
    const map = catalogueMembership([
      { qid: "Q1", catalogue: "ral" },
      { qid: "Q2", catalogue: "pantone" },
    ]);
    expect(map.get("Q1")).toBe("ral");
    expect(map.get("Q2")).toBe("pantone");
    expect(map.has("Q3")).toBe(false);
  });
});
```

Add the four new names and the `Catalogue` type to that file's existing imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/scripts/wikidata/transform.test.ts`
Expected: FAIL, `isCatalogueCode` is not exported.

- [ ] **Step 3: Implement**

In `scripts/sync-wikidata/transform.ts`, add the `Catalogue` and `RawCatalogueRow` types to the existing `import type { ... } from "./fetch"` line, then add after `normalizeLanguage` (line 51):

```ts
/**
 * Catalogue names as they are actually spelled in the shipped labels. The list
 * exists only for the fifteen digit-free codes in the data: `Pantone Reflex
 * Blue` in three locales, and `NCS red/green/yellow/blue` in English, Venetian
 * and Frisian. Everything else a catalogue label can be is caught by the digit
 * test below.
 */
const CATALOGUE_MARKERS = ["pantone", "ral", "ncs", "彩通", "פנטון", "แพนโทน", "پنتون", "بانتون"];

/**
 * Anchored to whitespace, hyphen or string edge so that "coral" and "general"
 * are not read as RAL codes. Frisian writes `NCS-read`, hence the hyphen.
 */
const MARKER_PATTERN = new RegExp(`(^|[\\s\\-])(${CATALOGUE_MARKERS.join("|")})([\\s\\-]|$)`, "iu");

/**
 * Whether a label on a catalogue item is the code rather than a name.
 *
 * Identifying the item is not the same as condemning all of its labels. Some
 * languages label a RAL item with its descriptive name: German `Verkehrsrot`
 * for RAL 3020, Italian `rosso traffico`, Japanese `シグナルレッド`, plus ten
 * Estonian, eight Indonesian and five Czech names. Those are ordinary colour
 * words and stay in the linguistic source.
 *
 * The digit test carries almost all of the work and is script-neutral:
 * `\p{Nd}` matches Persian `۴۴۸` as readily as `448`. It fails in the safe
 * direction, since an unrecognised marker leaves a code-shaped label visible
 * in the data rather than destroying a real name.
 */
export function isCatalogueCode(label: string): boolean {
  return /\p{Nd}/u.test(label) || MARKER_PATTERN.test(label);
}

export function catalogueMembership(rows: readonly RawCatalogueRow[]): Map<string, Catalogue> {
  return new Map(rows.map(row => [row.qid, row.catalogue]));
}

/** Splits label or alias rows into the ones that stay and the codes that go. */
export function stripCatalogueCodes<T extends RawLabelRow>(
  rows: readonly T[],
  membership: ReadonlyMap<string, Catalogue>,
): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const row of rows) {
    if (membership.has(row.qid) && isCatalogueCode(row.value)) dropped.push(row);
    else kept.push(row);
  }
  return { kept, dropped };
}

/**
 * Drops catalogue items that lost every label, so they stop inflating
 * `itemCount` — the denominator every coverage figure divides by. A catalogue
 * item that kept a descriptive label in some language is still a colour this
 * source names, so it stays.
 *
 * Items outside any catalogue are never pruned, even when unlabelled: their
 * presence in the denominator is what makes coverage mean "the fraction of the
 * catalogue this language names".
 */
export function pruneCatalogueItems(
  itemRows: readonly RawItemRow[],
  membership: ReadonlyMap<string, Catalogue>,
  survivingQids: ReadonlySet<string>,
): RawItemRow[] {
  return itemRows.filter(row => !membership.has(row.qid) || survivingQids.has(row.qid));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/scripts/wikidata/transform.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-wikidata/transform.ts test/scripts/wikidata/transform.test.ts
git commit -m "feat(i18n): split catalogue codes out of wikidata labels"
```

---

### Task 4: The alphabet check

**Files:**
- Create: `scripts/sync-wikidata/scripts.ts`
- Test: `test/scripts/wikidata/scripts.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, all from `scripts/sync-wikidata/scripts.ts`:
  - `CHECKED_SCRIPTS: readonly string[]`
  - `scriptsOf(text: string): Set<string>`
  - `attestedScripts(names: readonly string[]): Set<string>`
  - `isScriptConsistent(name: string, allowed: ReadonlySet<string>): boolean`
  - `unlistedScriptLetters(text: string): number`

  Task 5 calls `attestedScripts` and `isScriptConsistent`; Task 6 reports `unlistedScriptLetters`.

This lives in its own file rather than in `transform.ts` because it is a self-contained Unicode concern with its own table, and `transform.ts` is already 230 lines.

- [ ] **Step 1: Write the failing test**

Create `test/scripts/wikidata/scripts.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  attestedScripts,
  isScriptConsistent,
  scriptsOf,
  unlistedScriptLetters,
} from "../../../scripts/sync-wikidata/scripts";

describe("scriptsOf", () => {
  it("names the scripts a string is written in", () => {
    expect([...scriptsOf("красный")]).toEqual(["Cyrillic"]);
    expect([...scriptsOf("Eigengrau")]).toEqual(["Latin"]);
    expect([...scriptsOf("ピンク")]).toEqual(["Katakana"]);
    expect([...scriptsOf("rосмический")].sort()).toEqual(["Cyrillic", "Latin"]);
  });

  it("ignores digits, spaces and punctuation", () => {
    expect([...scriptsOf("RAL 1005")]).toEqual(["Latin"]);
    expect([...scriptsOf("448")]).toEqual([]);
  });

  it("ignores letters whose script is Common, such as the okina", () => {
    // U+02BB is category Lm, script Common. A naive letter test reads it as
    // foreign to Latin and drops legitimate Hawaiian and Uzbek names.
    expect([...scriptsOf("ʻulaʻula")]).toEqual(["Latin"]);
    expect([...scriptsOf("koʻk")]).toEqual(["Latin"]);
  });
});

describe("attestedScripts", () => {
  it("requires a script in at least three terms", () => {
    const names = ["rot", "grün", "blau", "gelb", "weiß", "Eigengrau", "umber"];
    // Latin is in all seven, so Latin is attested; nothing else appears at all.
    expect([...attestedScripts(names)]).toEqual(["Latin"]);
  });

  it("admits a second script a locale genuinely uses", () => {
    // Japanese is tri-script. Katakana in 4 of 10 clears both the floor of 3
    // and the 5% share, so katakana names are not foreign to Japanese.
    const names = ["黄色", "灰色", "水色", "空色", "紅色", "茶色", "ピンク", "シアン", "マゼンタ", "ベージュ"];
    expect([...attestedScripts(names)].sort()).toEqual(["Han", "Katakana"]);
  });

  it("does not admit a script attested below the floor", () => {
    const names = [...Array(40).keys()].map(() => "красный").concat(["Eigengrau", "umber"]);
    expect([...attestedScripts(names)]).toEqual(["Cyrillic"]);
  });

  it("returns nothing for a chunk too thin to calibrate", () => {
    expect([...attestedScripts(["Lotong", "ᨌᨛᨒ"])]).toEqual([]);
  });
});

describe("isScriptConsistent", () => {
  const cyrillic = new Set(["Cyrillic"]);

  it("keeps a term written wholly in an allowed script", () => {
    expect(isScriptConsistent("красный", cyrillic)).toBe(true);
  });

  it("drops a term written wholly in a foreign script", () => {
    expect(isScriptConsistent("Eigengrau", cyrillic)).toBe(false);
    expect(isScriptConsistent("International Klein Blue", cyrillic)).toBe(false);
  });

  it("drops a mixed-script typo", () => {
    expect(isScriptConsistent("rосмический латте", cyrillic)).toBe(false);
    expect(isScriptConsistent("полноќнoсина", cyrillic)).toBe(false);
    expect(isScriptConsistent("Cиньо-зелен", cyrillic)).toBe(false);
  });

  it("ignores digits and punctuation", () => {
    expect(isScriptConsistent("сине-зелёный (2)", cyrillic)).toBe(true);
  });

  it("keeps everything when nothing is attested", () => {
    expect(isScriptConsistent("Lotong", new Set())).toBe(true);
  });
});

describe("unlistedScriptLetters", () => {
  it("counts nothing for scripts the table covers", () => {
    expect(unlistedScriptLetters("красный")).toBe(0);
    expect(unlistedScriptLetters("ʻulaʻula")).toBe(0);
    expect(unlistedScriptLetters("448 C")).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/scripts/wikidata/scripts.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement**

Create `scripts/sync-wikidata/scripts.ts`:

```ts
/**
 * Script consistency for shipped colour names.
 *
 * Wikidata labels are contributed per language and occasionally land in the
 * wrong one: `Eigengrau` sits in the Russian chunk, `umber` in Cyrillic
 * Serbian. A second fault is the single-character typo, where `rосмический
 * латте` opens with a Latin `r` and `Cиньо-зелен` with a Latin `C`. Both are
 * caught by the same rule.
 *
 * The valid scripts for a locale are derived from that locale's own terms
 * rather than from CLDR. `Intl.Locale.maximize()` was measured and rejected:
 * it maximises `grc` to Cypriot, `lad` to Hebrew and `crh` to Cyrillic, all
 * contradicted by the actual labels, and returns nothing at all for nine of
 * the tags in this data.
 */

/**
 * Every script present in the shipped data, plus headroom.
 *
 * JavaScript has no script-of-character API, so the check tests against this
 * enumerated list. A character in a script missing from it matches nothing and
 * is treated as ignorable, which fails **open**: an unlisted script never
 * causes a wrong drop, it causes a skipped check. `unlistedScriptLetters`
 * exists so the sync report can surface that gap as a number rather than as
 * silence.
 */
export const CHECKED_SCRIPTS: readonly string[] = [
  "Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Han", "Hiragana", "Katakana",
  "Hangul", "Devanagari", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Gujarati", "Gurmukhi", "Oriya", "Sinhala", "Thai", "Lao", "Myanmar", "Khmer",
  "Georgian", "Armenian", "Ethiopic", "Cherokee", "Syriac", "Thaana", "Tibetan",
  "Mongolian", "Meetei_Mayek", "Sylheti_Nagri", "Buginese", "Tifinagh",
  "Canadian_Aboriginal", "Javanese", "Balinese", "Yi", "Vai", "Adlam", "Nko",
  "Osage", "Coptic", "Runic", "Gothic", "Cypriot",
];

const SCRIPT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = CHECKED_SCRIPTS.map(
  name => [name, new RegExp(`\\p{Script_Extensions=${name}}`, "u")] as const,
);

const LETTER = /\p{L}/u;

/**
 * Script-neutral letters. The ʻokina (U+02BB) is the case that matters: it is
 * category `Lm` with script Common, so a naive letter test reads it as foreign
 * to Latin and drops Hawaiian `ʻulaʻula` and Uzbek `koʻk`.
 */
const IGNORED = /[\p{Script_Extensions=Common}\p{Script_Extensions=Inherited}]/u;

function scriptOf(char: string): string | undefined {
  for (const [name, pattern] of SCRIPT_PATTERNS) {
    if (pattern.test(char)) return name;
  }
  return undefined;
}

/** The scripts a string's letters are written in, ignoring neutral characters. */
export function scriptsOf(text: string): Set<string> {
  const found = new Set<string>();
  for (const char of text) {
    if (!LETTER.test(char) || IGNORED.test(char)) continue;
    const script = scriptOf(char);
    if (script !== undefined) found.add(script);
  }
  return found;
}

/** Letters in no listed script, so the report can show the table's blind spot. */
export function unlistedScriptLetters(text: string): number {
  let count = 0;
  for (const char of text) {
    if (!LETTER.test(char) || IGNORED.test(char)) continue;
    if (scriptOf(char) === undefined) count++;
  }
  return count;
}

/**
 * The scripts valid for a locale: those attested in at least
 * `max(3, 5% of terms)` of its own names.
 *
 * The floor and the share both matter. The share admits katakana for Japanese,
 * attested in 40% of its terms, while rejecting Latin for Russian, attested in
 * 3 terms of 197. The floor of 3 stops one stray name in a small chunk from
 * authorising its own script. A floor of 4 was measured and rejected: it drops
 * Chechen `Iаьржа` and `кiайн`, where Latin letters stand in for the palochka
 * by ordinary convention.
 *
 * An empty result means the chunk is too thin to calibrate, and callers ship
 * it unchecked. A three-term chunk cannot tell a foreign name from its own
 * orthography.
 */
export function attestedScripts(names: readonly string[]): Set<string> {
  const tally = new Map<string, number>();
  for (const name of names) {
    for (const script of scriptsOf(name)) {
      tally.set(script, (tally.get(script) ?? 0) + 1);
    }
  }

  const floor = Math.max(3, names.length * 0.05);
  const attested = new Set<string>();
  for (const [script, count] of tally) {
    if (count >= floor) attested.add(script);
  }
  return attested;
}

/** Whether every letter of a name falls in an allowed script. */
export function isScriptConsistent(name: string, allowed: ReadonlySet<string>): boolean {
  if (allowed.size === 0) return true;
  for (const script of scriptsOf(name)) {
    if (!allowed.has(script)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/scripts/wikidata/scripts.test.ts`
Expected: PASS.

If the ʻokina tests fail, `\p{Script_Extensions=Common}` is not matching U+02BB. Check with `bun -e 'console.log(/\p{Script_Extensions=Common}/u.test("ʻ"))'` and, if false, replace the `IGNORED` pattern with an explicit category test `/\p{Lm}/u` combined with the Common test. Do not weaken the rule to a plain `\p{L}` test, which is the failure this guards against.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-wikidata/scripts.ts test/scripts/wikidata/scripts.test.ts
git commit -m "feat(i18n): add attested-script consistency check"
```

---

### Task 5: Locale-aware fold, applied in `buildPaletteChunk`

**Files:**
- Modify: `scripts/sync-wikidata/transform.ts:170-209`
- Test: `test/scripts/wikidata/transform.test.ts`

**Interfaces:**
- Consumes: `attestedScripts` and `isScriptConsistent` from Task 4's `scripts.ts`.
- Produces, from `scripts/sync-wikidata/transform.ts`:
  - `fold(value: string, lang: string): string`
  - `supportsLocaleCase(lang: string): boolean`
  - `PaletteChunkResult` (`{ chunk: PaletteChunk; droppedByScript: string[] }`)
  - `buildPaletteChunk(...)` now returns `PaletteChunkResult` instead of `PaletteChunk`. Task 6 updates the one call site in `main.ts`.

- [ ] **Step 1: Write the failing test**

Append to `test/scripts/wikidata/transform.test.ts`:

```ts
describe("fold", () => {
  it("lower-cases under the rules of the given locale", () => {
    expect(fold("Rot", "de")).toBe("rot");
    expect(fold("Sarı", "az")).toBe("sarı");
  });

  it("folds Turkish dotted capital I to a bare i", () => {
    // Under the invariant rule this yields "i" plus a combining dot above,
    // a different string and so a different lookup key.
    expect(fold("İnci", "tr")).toBe("inci");
    expect(fold("İnci", "tr")).toBe("inci".normalize("NFC"));
  });

  it("returns NFC", () => {
    const decomposed = "Grünbeige".normalize("NFD");
    expect(fold(decomposed, "de")).toBe("grünbeige".normalize("NFC"));
  });

  it("falls back to the invariant rule for tags Intl rejects", () => {
    expect(supportsLocaleCase("map-bms")).toBe(false);
    expect(fold("Abang", "map-bms")).toBe("abang");
  });

  it("reports ordinary tags as supported", () => {
    expect(supportsLocaleCase("tr")).toBe(true);
    expect(supportsLocaleCase("zh-Hant")).toBe(true);
  });
});

describe("buildPaletteChunk hygiene", () => {
  const items = [
    { qid: "Q1", hex: "FF0000", sitelinks: 9, centroid: [0.6, 0.2, 0.1] as [number, number, number] },
    { qid: "Q2", hex: "00FF00", sitelinks: 8, centroid: [0.8, -0.2, 0.1] as [number, number, number] },
    { qid: "Q3", hex: "0000FF", sitelinks: 7, centroid: [0.4, 0.0, -0.3] as [number, number, number] },
    { qid: "Q4", hex: "FFFF00", sitelinks: 6, centroid: [0.9, -0.1, 0.2] as [number, number, number] },
    { qid: "Q5", hex: "000000", sitelinks: 5, centroid: [0.0, 0.0, 0.0] as [number, number, number] },
    { qid: "Q6", hex: "808080", sitelinks: 4, centroid: [0.6, 0.0, 0.0] as [number, number, number] },
  ];

  it("folds every name and key, and drops script-foreign names", () => {
    const labels = new Map([
      ["Q1", "Красный"],
      ["Q2", "Зелёный"],
      ["Q3", "Синий"],
      ["Q4", "Жёлтый"],
      ["Q5", "Eigengrau"],
      ["Q6", "rосмический латте"],
    ]);

    const { chunk, droppedByScript } = buildPaletteChunk("ru", items, labels, []);

    expect(chunk.terms.map(entry => entry[1])).toEqual(["красный", "зелёный", "синий", "жёлтый"]);
    expect(chunk.terms.map(entry => entry[0])).toEqual(["красный", "зелёный", "синий", "жёлтый"]);
    expect(droppedByScript).toEqual(["Eigengrau", "rосмический латте"]);
  });

  it("folds aliases too", () => {
    const labels = new Map([["Q1", "Красный"]]);
    const { chunk } = buildPaletteChunk("ru", items, labels, [{ qid: "Q1", value: "КРАСНЫЙ ЦВЕТ" }]);
    expect(chunk.aliases["красный цвет"]).toBe(0);
  });

  it("ships a chunk too thin to calibrate unchecked", () => {
    const labels = new Map([["Q1", "Lotong"], ["Q2", "ᨌᨛᨒ"]]);
    const { chunk, droppedByScript } = buildPaletteChunk("bug", items, labels, []);
    expect(chunk.terms).toHaveLength(2);
    expect(droppedByScript).toEqual([]);
  });
});
```

Add `fold`, `supportsLocaleCase` to that file's imports, and fix the existing `buildPaletteChunk` assertions in the file to destructure `{ chunk }` from the new return shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/scripts/wikidata/transform.test.ts`
Expected: FAIL, `fold` is not exported.

- [ ] **Step 3: Implement the fold helpers**

In `scripts/sync-wikidata/transform.ts`, add this import at the top:

```ts
import { attestedScripts, isScriptConsistent } from "./scripts";
```

Add above `buildPaletteChunk`:

```ts
/**
 * Whether `Intl` accepts a tag for case mapping. Nine tags in this data are
 * rejected: `sh`, `nah`, `bcl`, `map-bms`, `diq`, `eml`, `mhr`, `tw`, `pnb`.
 */
export function supportsLocaleCase(lang: string): boolean {
  try {
    "A".toLocaleLowerCase(lang);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lower-cases under the rules of the name's own language.
 *
 * `uwdata` ships every display name in lower case in every language it covers,
 * German included, and this brings `wikidata` into line.
 *
 * Both normalisation passes are load-bearing. Turkish `İ` folds to `i` under
 * `tr`, but under the invariant rule it folds to `i` followed by a combining
 * dot above: a different string and so a different lookup key. Normalising
 * after the fold collapses that back to NFC.
 */
export function fold(value: string, lang: string): string {
  const composed = value.normalize("NFC");
  try {
    return composed.toLocaleLowerCase(lang).normalize("NFC");
  } catch {
    return composed.toLowerCase().normalize("NFC");
  }
}
```

- [ ] **Step 4: Rewrite `buildPaletteChunk`**

Replace the whole of `buildPaletteChunk` (lines 170-209) with:

```ts
export interface PaletteChunkResult {
  chunk: PaletteChunk;
  /** Names the alphabet check removed, in upstream spelling, for the report. */
  droppedByScript: string[];
}

export function buildPaletteChunk(
  lang: string,
  items: readonly ColorItem[],
  labels: ReadonlyMap<string, string>,
  aliases: readonly { qid: string; value: string }[],
): PaletteChunkResult {
  // `items` is already in salience order, so the candidates inherit it.
  const candidates: { qid: string; label: string; centroid: [number, number, number]; hex: string }[] = [];
  for (const item of items) {
    const label = labels.get(item.qid);
    if (label === undefined) continue;
    candidates.push({ qid: item.qid, label: label.normalize("NFC"), centroid: item.centroid, hex: item.hex });
  }

  // Calibrate against this locale's own names, which is only possible once
  // they have all been collected. The check runs before the fold because case
  // does not affect script, and the report reads better in upstream spelling.
  const allowed = attestedScripts(candidates.map(candidate => candidate.label));

  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const indexByQid = new Map<string, number>();
  const droppedByScript: string[] = [];

  for (const candidate of candidates) {
    if (!isScriptConsistent(candidate.label, allowed)) {
      droppedByScript.push(candidate.label);
      continue;
    }
    const name = fold(candidate.label, lang);
    indexByQid.set(candidate.qid, terms.length);
    terms.push([name, name, candidate.centroid, null]);
    provenance.push([candidate.qid, candidate.hex]);
  }

  // `aliases` preserves raw SPARQL row order, which carries no salience
  // information (`ALIASES_QUERY` has no `ORDER BY`). Sort by each alias's
  // item's term index — which *is* salience order, per the loop above —
  // before applying first-wins, so the winner is deterministic. `Array.sort`
  // is stable, so multiple aliases on the same item keep their relative order.
  const aliasIndex: Record<string, number> = {};
  const orderedAliases = aliases
    .map(alias => ({ alias, termIndex: indexByQid.get(alias.qid) }))
    .filter((entry): entry is { alias: typeof aliases[number]; termIndex: number } => entry.termIndex !== undefined)
    .sort((a, b) => a.termIndex - b.termIndex);

  for (const { alias, termIndex } of orderedAliases) {
    const key = fold(alias.value, lang);
    // First wins, and the sort above means "first" is the most-linked item.
    if (!(key in aliasIndex)) aliasIndex[key] = termIndex;
  }

  return {
    chunk: { lang, model: "palette", terms, provenance, aliases: aliasIndex },
    droppedByScript,
  };
}
```

Note the term entry is now `[name, name, ...]`: once the display name is folded, the key and the name are the same string, so the previous `name.toLowerCase()` key would be redundant and, for Turkish, wrong.

- [ ] **Step 5: Update the one call site so the package compiles**

In `scripts/sync-wikidata/main.ts` line 85, change:

```ts
    const chunk = buildPaletteChunk(lang, items, labelMap, aliases.get(lang) ?? []);
```

to:

```ts
    const { chunk } = buildPaletteChunk(lang, items, labelMap, aliases.get(lang) ?? []);
```

Task 6 replaces this properly; this keeps the build green in between.

- [ ] **Step 6: Run the script tests**

Run: `bun test test/scripts/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-wikidata/transform.ts scripts/sync-wikidata/main.ts test/scripts/wikidata/transform.test.ts
git commit -m "feat(i18n): fold wikidata names under their own locale"
```

---

### Task 6: Wire the three policies into the sync and its report

**Files:**
- Modify: `scripts/sync-wikidata/main.ts`
- Test: `test/scripts/wikidata/main.test.ts`

**Interfaces:**
- Consumes: `CATALOGUE_QUERY`, `parseCatalogue`, `RawCatalogueRow` (Task 2); `catalogueMembership`, `stripCatalogueCodes`, `pruneCatalogueItems` (Task 3); `unlistedScriptLetters` (Task 4); `buildPaletteChunk` returning `PaletteChunkResult`, `supportsLocaleCase` (Task 5).
- Produces: `buildOutput` gains a fifth parameter `catalogueRows: readonly RawCatalogueRow[]`, inserted **before** `retrievedAt`. `SyncOutput` gains `catalogueDropped: Record<Catalogue, number>`, `catalogueSpared: number`, `droppedByScript: Record<string, string[]>`, `unlistedLetters: number` and `invariantCaseLocales: string[]`.

- [ ] **Step 1: Write the failing test**

Append to `test/scripts/wikidata/main.test.ts`, and update its local `output()` helper to pass the new argument:

```ts
async function output() {
  return buildOutput(
    parseItems(await fixture("items.json")),
    parseLabels(await fixture("labels.json")),
    parseAliases(await fixture("aliases.json")),
    parseCatalogue(await fixture("catalogue.json")),
    "2026-08-02T00:00:00.000Z",
  );
}

describe("catalogue and hygiene reporting", () => {
  it("counts dropped code labels per catalogue", async () => {
    const result = await output();
    expect(result.catalogueDropped.pantone).toBeGreaterThanOrEqual(0);
    expect(result.catalogueDropped.ral).toBeGreaterThanOrEqual(0);
    expect(result.catalogueDropped.ncs).toBeGreaterThanOrEqual(0);
  });

  it("reports the shape of every hygiene figure", async () => {
    const result = await output();
    expect(typeof result.catalogueSpared).toBe("number");
    expect(typeof result.unlistedLetters).toBe("number");
    expect(Array.isArray(result.invariantCaseLocales)).toBe(true);
    expect(typeof result.droppedByScript).toBe("object");
  });

  it("ships every term already folded and NFC", async () => {
    const result = await output();
    for (const [lang, chunk] of result.chunks) {
      for (const [term, name] of chunk.terms) {
        expect(term).toBe(name);
        expect(name).toBe(name.normalize("NFC"));
        expect(name).toBe(fold(name, lang));
      }
    }
  });
});
```

Import `parseCatalogue` from `../../../scripts/sync-wikidata/fetch` and `fold` from `../../../scripts/sync-wikidata/transform` at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/scripts/wikidata/main.test.ts`
Expected: FAIL, `buildOutput` takes four arguments and `result.catalogueDropped` is undefined.

- [ ] **Step 3: Extend `buildOutput`**

In `scripts/sync-wikidata/main.ts`, extend the imports:

```ts
import {
  ALIASES_QUERY,
  CATALOGUE_QUERY,
  ITEMS_QUERY,
  LABELS_QUERY,
  parseAliases,
  parseCatalogue,
  parseItems,
  parseLabels,
  runQuery,
  type Catalogue,
  type RawAliasRow,
  type RawCatalogueRow,
  type RawItemRow,
  type RawLabelRow,
} from "./fetch";
import {
  buildItems,
  buildPaletteChunk,
  catalogueMembership,
  groupAliases,
  groupLabels,
  paletteCoverage,
  pruneCatalogueItems,
  stripCatalogueCodes,
  supportsLocaleCase,
} from "./transform";
import { unlistedScriptLetters } from "./scripts";
```

Extend `SyncOutput`:

```ts
export interface SyncOutput {
  chunks: Map<string, PaletteChunk>;
  meta: SyncMeta;
  /** Items that carried more than one best-rank hex, for the sync report. */
  multiHexItems: string[];
  /** Count of (locale, name) pairs claimed by more than one item. */
  collisions: number;
  /** Code-shaped labels removed, per catalogue. */
  catalogueDropped: Record<Catalogue, number>;
  /** Descriptive labels on catalogue items that were kept, e.g. `Verkehrsrot`. */
  catalogueSpared: number;
  /** Locale -> names the alphabet check removed, in upstream spelling. */
  droppedByScript: Record<string, string[]>;
  /** Letters in no listed script: the script table's blind spot, as a number. */
  unlistedLetters: number;
  /** Locales whose tag `Intl` rejects, folded by the invariant rule instead. */
  invariantCaseLocales: string[];
}
```

Replace the body of `buildOutput` from its signature through the `buildItems` call with:

```ts
export function buildOutput(
  itemRows: readonly RawItemRow[],
  labelRows: readonly RawLabelRow[],
  aliasRows: readonly RawAliasRow[],
  catalogueRows: readonly RawCatalogueRow[],
  retrievedAt: string,
): SyncOutput {
  const membership = catalogueMembership(catalogueRows);

  const splitLabels = stripCatalogueCodes(labelRows, membership);
  const splitAliases = stripCatalogueCodes(aliasRows, membership);

  const catalogueDropped: Record<Catalogue, number> = { pantone: 0, ral: 0, ncs: 0 };
  for (const row of [...splitLabels.dropped, ...splitAliases.dropped]) {
    const catalogue = membership.get(row.qid);
    if (catalogue !== undefined) catalogueDropped[catalogue]++;
  }

  // A catalogue item that kept a descriptive label in some language is still a
  // colour this source names, so it stays in the denominator; one that lost
  // every label would otherwise inflate every coverage figure.
  const survivingQids = new Set(splitLabels.kept.map(row => row.qid));
  const catalogueSpared = [...survivingQids].filter(qid => membership.has(qid)).length;

  const items = buildItems(pruneCatalogueItems(itemRows, membership, survivingQids));
  const labels = groupLabels(splitLabels.kept);
  const aliases = groupAliases(splitAliases.kept);

  let unlistedLetters = 0;
  for (const row of splitLabels.kept) unlistedLetters += unlistedScriptLetters(row.value);
```

Keep the existing `hexesByQid` / `multiHexItems` block unchanged, but note it must now read `itemRows` as before, since multi-hex reporting is about the raw upstream rows.

Replace the chunk loop with:

```ts
  const chunks = new Map<string, PaletteChunk>();
  const languages: Record<string, LanguageCoverage> = {};
  const droppedByScript: Record<string, string[]> = {};
  const invariantCaseLocales: string[] = [];
  let collisions = 0;

  for (const [lang, labelMap] of labels) {
    const built = buildPaletteChunk(lang, items, labelMap, aliases.get(lang) ?? []);
    const chunk = built.chunk;
    if (built.droppedByScript.length > 0) droppedByScript[lang] = built.droppedByScript;
    if (!supportsLocaleCase(lang)) invariantCaseLocales.push(lang);

    // A locale whose every labelled item fell outside the catalogue would
    // produce a chunk that can answer nothing; don't ship one.
    if (chunk.terms.length === 0) continue;

    const occurrences = new Map<string, number>();
    for (const entry of chunk.terms) {
      occurrences.set(entry[0], (occurrences.get(entry[0]) ?? 0) + 1);
    }
    for (const count of occurrences.values()) {
      if (count > 1) collisions++;
    }

    chunks.set(lang, chunk);
    languages[lang] = paletteCoverage(chunk, items.length);
  }
```

Extend the return object with the five new fields, and sort `invariantCaseLocales` for a stable diff:

```ts
  return {
    chunks,
    meta: { source: "wikidata", retrievedAt, itemCount: items.length, languages: sortedLanguages },
    multiHexItems,
    collisions,
    catalogueDropped,
    catalogueSpared,
    droppedByScript,
    unlistedLetters,
    invariantCaseLocales: invariantCaseLocales.sort(),
  };
```

- [ ] **Step 4: Extend `main()` to run the fourth query and print the report**

In `main()`, change the query block to fetch four results and parse the catalogue rows, then pass them to `buildOutput`:

```ts
  const [itemsJson, labelsJson, aliasesJson, catalogueJson] = await Promise.all([
    runQuery(ITEMS_QUERY),
    runQuery(LABELS_QUERY),
    runQuery(ALIASES_QUERY),
    runQuery(CATALOGUE_QUERY),
  ]);

  const itemRows = parseItems(itemsJson);
  const labelRows = parseLabels(labelsJson);
  const aliasRows = parseAliases(aliasesJson);
  const catalogueRows = parseCatalogue(catalogueJson);
  console.log(
    `  ${itemRows.length} item rows, ${labelRows.length} labels, `
    + `${aliasRows.length} aliases, ${catalogueRows.length} catalogue members`,
  );

  const output = buildOutput(itemRows, labelRows, aliasRows, catalogueRows, new Date().toISOString());
```

Append to the report block at the end of `main()`:

```ts
  const { pantone, ral, ncs } = output.catalogueDropped;
  console.log(`\nCatalogue codes removed: ${pantone + ral + ncs} (pantone ${pantone}, ral ${ral}, ncs ${ncs})`);
  console.log(`Descriptive names kept on catalogue items: ${output.catalogueSpared}`);

  const scriptDrops = Object.entries(output.droppedByScript);
  const scriptTotal = scriptDrops.reduce((sum, [, names]) => sum + names.length, 0);
  console.log(`\nDropped by the alphabet check: ${scriptTotal}`);
  for (const [lang, names] of scriptDrops.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${lang.padEnd(9)} ${names.join(" · ")}`);
  }

  console.log(`\nLetters in no listed script: ${output.unlistedLetters}`);
  if (output.invariantCaseLocales.length > 0) {
    console.log(`Locales folded by the invariant rule: ${output.invariantCaseLocales.join(", ")}`);
  }
```

- [ ] **Step 5: Run the tests**

Run: `bun test test/scripts/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-wikidata/main.ts test/scripts/wikidata/main.test.ts
git commit -m "feat(i18n): report the catalogue split and name hygiene"
```

---

### Task 7: The `pantone` source

**Files:**
- Create: `scripts/sync-pantone/fetch.ts`, `scripts/sync-pantone/transform.ts`, `scripts/sync-pantone/main.ts`
- Create: `src/sources/pantone/source.ts`
- Create: `test/fixtures/pantone/colors.json`
- Test: `test/scripts/pantone/fetch.test.ts`, `test/scripts/pantone/transform.test.ts`
- Modify: `src/index.ts`, `package.json`

**Interfaces:**
- Consumes: `NEUTRAL_LOCALE` and `languageNeutral` from Task 1.
- Produces: `src/data/pantone/und.js`, `src/data/pantone/meta.json`, `src/sources/pantone/chunks.ts` (all generated), and `pantoneSource: NameSource`. Task 8 mirrors this structure exactly for RAL.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/pantone/colors.json`. The word-code entry is the case a numeric parser gets wrong, so it must be present:

```json
[
  { "Code": "Process Yellow", "C": "0", "M": "0", "Y": "100", "K": "0", "R": "255", "G": "255", "B": "0", "Hex": "#FFFF00" },
  { "Code": "100", "C": "0", "M": "0", "Y": "51", "K": "0", "R": "255", "G": "255", "B": "125", "Hex": "#FFFF7D" },
  { "Code": "448", "C": "0", "M": "10", "Y": "70", "K": "66", "R": "74", "G": "65", "B": "42", "Hex": "#4A412A" }
]
```

- [ ] **Step 2: Write the failing tests**

Create `test/scripts/pantone/fetch.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { PantoneSchemaError, parsePantone } from "../../../scripts/sync-pantone/fetch";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/pantone/colors.json`).text();

describe("parsePantone", () => {
  it("reads code and hex from every row", async () => {
    const rows = parsePantone(await fixture());
    expect(rows).toEqual([
      { code: "Process Yellow", hex: "FFFF00" },
      { code: "100", hex: "FFFF7D" },
      { code: "448", hex: "4A412A" },
    ]);
  });

  it("throws when the payload is not an array", async () => {
    expect(() => parsePantone("{}")).toThrow(PantoneSchemaError);
  });

  it("throws on a malformed hex", async () => {
    const drifted = (await fixture()).replace("#FFFF00", "#GGGG00");
    expect(() => parsePantone(drifted)).toThrow(PantoneSchemaError);
  });

  it("throws on a missing code", async () => {
    const drifted = (await fixture()).replace('"Code": "100"', '"Code": ""');
    expect(() => parsePantone(drifted)).toThrow(PantoneSchemaError);
  });
});
```

Create `test/scripts/pantone/transform.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parsePantone } from "../../../scripts/sync-pantone/fetch";
import { buildPantoneChunk } from "../../../scripts/sync-pantone/transform";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/pantone/colors.json`).text();

describe("buildPantoneChunk", () => {
  it("ships a language-neutral palette chunk", async () => {
    const chunk = buildPantoneChunk(parsePantone(await fixture()));
    expect(chunk.lang).toBe("und");
    expect(chunk.model).toBe("palette");
    expect(chunk.terms).toHaveLength(3);
  });

  it("prefixes every code and folds it to lower case", async () => {
    const chunk = buildPantoneChunk(parsePantone(await fixture()));
    expect(chunk.terms.map(entry => entry[1])).toEqual([
      "pantone process yellow",
      "pantone 100",
      "pantone 448",
    ]);
    for (const [term, name] of chunk.terms) expect(term).toBe(name);
  });

  it("aliases the bare code so a caller can look one up directly", async () => {
    const chunk = buildPantoneChunk(parsePantone(await fixture()));
    expect(chunk.aliases["448"]).toBe(2);
    expect(chunk.aliases["process yellow"]).toBe(0);
  });

  it("converts hex to a finite Oklab centroid and keeps provenance", async () => {
    const chunk = buildPantoneChunk(parsePantone(await fixture()));
    const [, , centroid, pCT] = chunk.terms[2]!;
    expect(centroid!.every(Number.isFinite)).toBe(true);
    expect(pCT).toBeNull();
    expect(chunk.provenance[2]).toEqual(["448", "4A412A"]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test test/scripts/pantone/`
Expected: FAIL, the modules do not exist.

- [ ] **Step 4: Implement `fetch.ts`**

Create `scripts/sync-pantone/fetch.ts`:

```ts
/** Raised when the upstream JSON no longer matches what the transform expects. */
export class PantoneSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PantoneSchemaError";
  }
}

/**
 * adonald/Pantone-CMYK-RGB-Hex, MIT licensed, 1,149 PMS codes. It is the only
 * cleanly licensed Pantone dataset available: the larger Margaret2 collection
 * carries no licence at all and its own README states the names are Pantone
 * copyright.
 */
export const PANTONE_URL
  = "https://raw.githubusercontent.com/adonald/Pantone-CMYK-RGB-Hex/master/pantone_CMYK_RGB_Hex.json";

/** Below this, assume the fetch or the upstream file is broken rather than shrunk. */
export const MIN_EXPECTED_ROWS = 1000;

export interface PantoneRow {
  /** PMS code exactly as upstream spells it: `100`, or `Process Yellow`. */
  code: string;
  /** Six hex digits, no leading `#`. */
  hex: string;
}

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function parsePantone(json: string): PantoneRow[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new PantoneSchemaError("Upstream Pantone data is not an array.");
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new PantoneSchemaError(`Pantone row ${index} is not an object.`);
    }
    const row = entry as Record<string, unknown>;

    const code = row.Code;
    if (typeof code !== "string" || code.trim().length === 0) {
      throw new PantoneSchemaError(`Pantone row ${index} has no usable Code.`);
    }

    const hex = row.Hex;
    if (typeof hex !== "string") {
      throw new PantoneSchemaError(`Pantone row ${index} has no Hex.`);
    }
    const match = HEX_PATTERN.exec(hex.trim());
    if (match === null) {
      throw new PantoneSchemaError(`Pantone row ${index} has a malformed Hex "${hex}".`);
    }

    return { code: code.trim(), hex: match[1]!.toUpperCase() };
  });
}

export async function fetchPantone(fetchImpl: typeof fetch = fetch): Promise<PantoneRow[]> {
  const response = await fetchImpl(PANTONE_URL);
  if (!response.ok) {
    throw new PantoneSchemaError(`Pantone fetch failed: HTTP ${response.status}`);
  }
  const rows = parsePantone(await response.text());
  if (rows.length < MIN_EXPECTED_ROWS) {
    throw new PantoneSchemaError(
      `Pantone upstream returned ${rows.length} rows, below the ${MIN_EXPECTED_ROWS} floor.`,
    );
  }
  return rows;
}
```

- [ ] **Step 5: Implement `transform.ts`**

Create `scripts/sync-pantone/transform.ts`:

```ts
import { Color } from "@urcolor/core";
import type { PaletteChunk, TermEntry } from "../../src/engine/types";
import type { PantoneRow } from "./fetch";

/**
 * Pantone codes are the same string in every language, so this source ships
 * one chunk under the language-neutral `und` tag rather than pretending the
 * codes are English.
 */
export const NEUTRAL_LOCALE = "und";

/**
 * The bare code is kept as an alias so `colorOf("448")` and
 * `colorOf("process yellow")` both resolve, while the display name stays
 * unambiguous about which catalogue it comes from.
 */
export function buildPantoneChunk(rows: readonly PantoneRow[]): PaletteChunk {
  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const aliases: Record<string, number> = {};

  for (const row of rows) {
    const bare = row.code.normalize("NFC").toLowerCase();
    const name = `pantone ${bare}`;
    const [l, a, b] = Color.parse(`#${row.hex}`)!.to("oklab").coords;

    if (!(bare in aliases)) aliases[bare] = terms.length;
    provenance.push([row.code, row.hex]);
    terms.push([name, name, [l, a, b], null]);
  }

  return { lang: NEUTRAL_LOCALE, model: "palette", terms, provenance, aliases };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test test/scripts/pantone/`
Expected: PASS.

- [ ] **Step 7: Implement `main.ts`**

Create `scripts/sync-pantone/main.ts`:

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import type { LanguageCoverage, PaletteChunk } from "../../src/engine/types";
import { fetchPantone } from "./fetch";
import { NEUTRAL_LOCALE, buildPantoneChunk } from "./transform";

const DATA_DIR = new URL("../../src/data/pantone/", import.meta.url);
const SOURCE_DIR = new URL("../../src/sources/pantone/", import.meta.url);
const MANIFEST_PATH = new URL("chunks.ts", SOURCE_DIR);

const ATTRIBUTION = [
  "// Generated by scripts/sync-pantone. Do not edit by hand.",
  "//",
  "// PMS code to sRGB values from adonald/Pantone-CMYK-RGB-Hex (MIT).",
  "//",
  "// PANTONE is a trademark of Pantone LLC. These are factual colour values,",
  "// not the Pantone system itself, and this package is neither affiliated",
  "// with nor endorsed by Pantone LLC.",
];

export interface PantoneMeta {
  source: "pantone";
  retrievedAt: string;
  itemCount: number;
  languages: Record<string, LanguageCoverage>;
}

export function buildMeta(chunk: PaletteChunk, retrievedAt: string): PantoneMeta {
  return {
    source: "pantone",
    retrievedAt,
    itemCount: chunk.terms.length,
    // A catalogue names its own catalogue entirely, so coverage is 1 by
    // construction rather than a measured fraction.
    languages: { [NEUTRAL_LOCALE]: { model: "palette", terms: chunk.terms.length, coverage: 1 } },
  };
}

export function renderChunkModule(chunk: PaletteChunk): string {
  return [...ATTRIBUTION, `export default ${JSON.stringify(chunk)};`, ""].join("\n");
}

export function renderManifest(): string {
  return [
    ...ATTRIBUTION,
    "import type { Chunk, ChunkLoaders } from \"../../engine/types\";",
    "",
    "export const pantoneChunks: ChunkLoaders = {",
    `  "${NEUTRAL_LOCALE}": () => import("../../data/pantone/${NEUTRAL_LOCALE}.js") as unknown as Promise<{ default: Chunk }>,`,
    "};",
    "",
  ].join("\n");
}

export async function main(): Promise<void> {
  console.log("Fetching Pantone data…");
  const rows = await fetchPantone();
  const chunk = buildPantoneChunk(rows);
  const meta = buildMeta(chunk, new Date().toISOString());

  // Render everything into memory before touching disk, so a rendering failure
  // cannot leave DATA_DIR half-deleted while the manifest still references it.
  const chunkSource = renderChunkModule(chunk);
  const manifestSource = renderManifest();
  const metaSource = `${JSON.stringify(meta, null, 2)}\n`;

  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(SOURCE_DIR, { recursive: true });

  await writeFile(new URL(`${NEUTRAL_LOCALE}.js`, DATA_DIR), chunkSource, "utf8");
  await writeFile(new URL("meta.json", DATA_DIR), metaSource, "utf8");
  await writeFile(MANIFEST_PATH, manifestSource, "utf8");

  console.log(`Wrote ${chunk.terms.length} Pantone codes, ${(Buffer.byteLength(chunkSource, "utf8") / 1024).toFixed(0)} KB.`);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 8: Write the source descriptor**

Create `src/sources/pantone/source.ts`:

```ts
import type { NameSource } from "../../engine/types";
import meta from "../../data/pantone/meta.json";

export const pantoneSource: NameSource = {
  id: "pantone",
  title: "Pantone Matching System codes",
  url: "https://github.com/adonald/Pantone-CMYK-RGB-Hex",
  retrievedAt: meta.retrievedAt,
  license: "MIT",
  languageNeutral: true,
  citation:
    "PMS code to sRGB values from adonald/Pantone-CMYK-RGB-Hex, MIT licensed.",
  disclaimer:
    "PANTONE is a trademark of Pantone LLC. This source ships factual colour "
    + "values keyed by PMS code, not the Pantone system itself, and is neither "
    + "affiliated with nor endorsed by Pantone LLC. Codes carry no coated or "
    + "uncoated suffix upstream, so that distinction is not represented.",
  languages: meta.languages as NameSource["languages"],
};
```

- [ ] **Step 9: Add the sync script and generate the data**

In `package.json`, add to `scripts`:

```json
    "sync:pantone": "bun run scripts/sync-pantone/main.ts",
```

Run: `bun run sync:pantone`
Expected: writes `src/data/pantone/und.js`, `src/data/pantone/meta.json` and `src/sources/pantone/chunks.ts`, and reports about 1,149 codes.

- [ ] **Step 10: Register the source**

In `src/index.ts`, add the imports beside the existing ones and register after `wikidataChunks`:

```ts
import { pantoneSource } from "./sources/pantone/source";
import { pantoneChunks } from "./sources/pantone/chunks";

registerSource(pantoneSource, pantoneChunks);
```

Leave the `setDefaultSources(["uwdata", "wikidata"])` call untouched, and extend the comment above it:

```ts
// uwdata answers the 20 locales it covers; wikidata answers the other 278.
// Order matters and lives here rather than in the lookup layer, which never
// names a dataset. The catalogue sources are registered but deliberately not
// in this chain: a plain resolve() must answer with a word, never a code.
```

- [ ] **Step 11: Verify end to end**

Run: `bun test test/scripts/pantone/ test/exports.test.ts`
Expected: PASS.

Then check the source answers:

```bash
bun -e 'import { ColorNames } from "./src/index";
const names = await ColorNames.load("ru", { source: "pantone" });
console.log(names.resolvedOptions().locale, names.resolvedOptions().source);
console.log(names.colorOf("pantone 448")?.toString());'
```
Expected: `und pantone` on the first line, and a colour on the second.

- [ ] **Step 12: Commit**

```bash
git add scripts/sync-pantone src/sources/pantone src/data/pantone src/index.ts package.json test/scripts/pantone test/fixtures/pantone
git commit -m "feat(i18n): add the pantone catalogue source"
```

---

### Task 8: The `ral` source

**Files:**
- Create: `scripts/sync-ral/fetch.ts`, `scripts/sync-ral/transform.ts`, `scripts/sync-ral/main.ts`
- Create: `src/sources/ral/source.ts`
- Create: `test/fixtures/ral/classic.js.txt`
- Test: `test/scripts/ral/fetch.test.ts`, `test/scripts/ral/transform.test.ts`
- Modify: `src/index.ts`, `package.json`

**Interfaces:**
- Consumes: `NEUTRAL_LOCALE` semantics from Task 7 (mirror the same `"und"` literal).
- Produces: `src/data/ral/und.js`, `src/data/ral/meta.json`, `src/sources/ral/chunks.ts` (generated) and `ralSource: NameSource`.

Upstream is an ES module rather than JSON, so `fetch.ts` parses its text with an anchored regex instead of evaluating it. Evaluating remote JavaScript in a build script is not acceptable; the row-count floor is what catches upstream reformatting.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/ral/classic.js.txt` with the exact upstream spacing, tabs included:

```
export const classic = {
	RAL1000: { description: 'Green beige', 				HEX:	'#CDBA88', rgb: { r: 205, g: 186, b: 136 }, group: 'yellow and beige' },
	RAL1001: { description: 'Beige', 					HEX:	'#D0B084', rgb: { r: 208, g: 176, b: 132 }, group: 'yellow and beige' },
	RAL3020: { description: 'Traffic red', 				HEX:	'#CC0605', rgb: { r: 204, g: 6, b: 5 }, group: 'red' },
}
```

- [ ] **Step 2: Write the failing tests**

Create `test/scripts/ral/fetch.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { RalSchemaError, parseRalClassic } from "../../../scripts/sync-ral/fetch";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/ral/classic.js.txt`).text();

describe("parseRalClassic", () => {
  it("reads code, description and hex from each entry", async () => {
    expect(parseRalClassic(await fixture(), 3)).toEqual([
      { code: "1000", description: "Green beige", hex: "CDBA88" },
      { code: "1001", description: "Beige", hex: "D0B084" },
      { code: "3020", description: "Traffic red", hex: "CC0605" },
    ]);
  });

  it("throws when upstream yields fewer rows than expected", async () => {
    expect(() => parseRalClassic(await fixture(), 213)).toThrow(RalSchemaError);
  });

  it("throws when the shape changes entirely", () => {
    expect(() => parseRalClassic("export const classic = {}", 1)).toThrow(RalSchemaError);
  });
});
```

Create `test/scripts/ral/transform.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseRalClassic } from "../../../scripts/sync-ral/fetch";
import { buildRalChunk } from "../../../scripts/sync-ral/transform";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/ral/classic.js.txt`).text();

describe("buildRalChunk", () => {
  it("ships a language-neutral palette chunk of prefixed codes", async () => {
    const chunk = buildRalChunk(parseRalClassic(await fixture(), 3));
    expect(chunk.lang).toBe("und");
    expect(chunk.terms.map(entry => entry[1])).toEqual(["ral 1000", "ral 1001", "ral 3020"]);
    for (const [term, name] of chunk.terms) expect(term).toBe(name);
  });

  it("aliases the bare code and the English description", async () => {
    const chunk = buildRalChunk(parseRalClassic(await fixture(), 3));
    expect(chunk.aliases["3020"]).toBe(2);
    expect(chunk.aliases["traffic red"]).toBe(2);
  });

  it("keeps provenance and a finite centroid", async () => {
    const chunk = buildRalChunk(parseRalClassic(await fixture(), 3));
    expect(chunk.provenance[2]).toEqual(["3020", "CC0605"]);
    expect(chunk.terms[2]![2]!.every(Number.isFinite)).toBe(true);
    expect(chunk.terms[2]![3]).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test test/scripts/ral/`
Expected: FAIL, the modules do not exist.

- [ ] **Step 4: Implement `fetch.ts`**

Create `scripts/sync-ral/fetch.ts`:

```ts
/** Raised when the upstream module no longer matches what the parser expects. */
export class RalSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RalSchemaError";
  }
}

/**
 * ieskudero/ral-colors, MIT licensed. Preferred over juliuste/ral-to-hex, also
 * MIT and also 213 entries, for two reasons: it carries English names, and its
 * hex values agree with Wikidata's where juliuste's do not (RAL 1000 is CDBA88
 * in both this source and Wikidata, and BEBD7F in juliuste). Agreeing with the
 * data being replaced keeps this a move rather than a silent revaluation.
 */
export const RAL_CLASSIC_URL
  = "https://raw.githubusercontent.com/ieskudero/ral-colors/master/RAL/classic.js";

/** RAL Classic has 213 entries. Fewer means the parse or the upstream broke. */
export const EXPECTED_CLASSIC_ROWS = 213;

export interface RalRow {
  /** Four-digit RAL Classic number, without the `RAL` prefix. */
  code: string;
  /** Upstream's English name, e.g. `Green beige`. */
  description: string;
  /** Six hex digits, no leading `#`. */
  hex: string;
}

/**
 * Upstream ships an ES module rather than JSON, so this reads its text. It is
 * deliberately not evaluated: running remote JavaScript in a build script is
 * not an acceptable trade for the convenience. The row-count floor is what
 * catches an upstream reformat that this regex would otherwise silently
 * under-match.
 */
const ENTRY_PATTERN
  = /RAL(\d{4})\s*:\s*\{\s*description\s*:\s*'([^']+)'\s*,\s*HEX\s*:\s*'#([0-9a-fA-F]{6})'/g;

export function parseRalClassic(source: string, expected = EXPECTED_CLASSIC_ROWS): RalRow[] {
  const rows: RalRow[] = [];
  for (const match of source.matchAll(ENTRY_PATTERN)) {
    rows.push({ code: match[1]!, description: match[2]!.trim(), hex: match[3]!.toUpperCase() });
  }

  if (rows.length < expected) {
    throw new RalSchemaError(
      `RAL upstream yielded ${rows.length} entries, below the expected ${expected}. `
      + "The module's formatting has probably changed; check ENTRY_PATTERN.",
    );
  }
  return rows;
}

export async function fetchRalClassic(fetchImpl: typeof fetch = fetch): Promise<RalRow[]> {
  const response = await fetchImpl(RAL_CLASSIC_URL);
  if (!response.ok) {
    throw new RalSchemaError(`RAL fetch failed: HTTP ${response.status}`);
  }
  return parseRalClassic(await response.text());
}
```

- [ ] **Step 5: Implement `transform.ts`**

Create `scripts/sync-ral/transform.ts`:

```ts
import { Color } from "@urcolor/core";
import type { PaletteChunk, TermEntry } from "../../src/engine/types";
import type { RalRow } from "./fetch";

/** RAL codes are the same string in every language. See sync-pantone. */
export const NEUTRAL_LOCALE = "und";

/**
 * The display name is the code, which is what makes this source honest about
 * being a catalogue. Upstream's English description is kept as an alias so
 * `colorOf("traffic red")` still resolves, without implying the chunk is
 * English.
 */
export function buildRalChunk(rows: readonly RalRow[]): PaletteChunk {
  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const aliases: Record<string, number> = {};

  for (const row of rows) {
    const name = `ral ${row.code}`;
    const [l, a, b] = Color.parse(`#${row.hex}`)!.to("oklab").coords;

    if (!(row.code in aliases)) aliases[row.code] = terms.length;
    const description = row.description.normalize("NFC").toLowerCase();
    if (!(description in aliases)) aliases[description] = terms.length;

    provenance.push([row.code, row.hex]);
    terms.push([name, name, [l, a, b], null]);
  }

  return { lang: NEUTRAL_LOCALE, model: "palette", terms, provenance, aliases };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test test/scripts/ral/`
Expected: PASS.

- [ ] **Step 7: Implement `main.ts`**

Create `scripts/sync-ral/main.ts`:

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import type { LanguageCoverage, PaletteChunk } from "../../src/engine/types";
import { fetchRalClassic } from "./fetch";
import { NEUTRAL_LOCALE, buildRalChunk } from "./transform";

const DATA_DIR = new URL("../../src/data/ral/", import.meta.url);
const SOURCE_DIR = new URL("../../src/sources/ral/", import.meta.url);
const MANIFEST_PATH = new URL("chunks.ts", SOURCE_DIR);

const ATTRIBUTION = [
  "// Generated by scripts/sync-ral. Do not edit by hand.",
  "//",
  "// RAL Classic codes and sRGB values from ieskudero/ral-colors (MIT).",
  "//",
  "// RAL is a trademark of RAL gGmbH. These are factual colour values, not",
  "// the RAL system itself, and this package is neither affiliated with nor",
  "// endorsed by RAL gGmbH.",
];

export interface RalMeta {
  source: "ral";
  retrievedAt: string;
  itemCount: number;
  languages: Record<string, LanguageCoverage>;
}

export function buildMeta(chunk: PaletteChunk, retrievedAt: string): RalMeta {
  return {
    source: "ral",
    retrievedAt,
    itemCount: chunk.terms.length,
    // A catalogue names its own catalogue entirely, so coverage is 1 by
    // construction rather than a measured fraction.
    languages: { [NEUTRAL_LOCALE]: { model: "palette", terms: chunk.terms.length, coverage: 1 } },
  };
}

export function renderChunkModule(chunk: PaletteChunk): string {
  return [...ATTRIBUTION, `export default ${JSON.stringify(chunk)};`, ""].join("\n");
}

export function renderManifest(): string {
  return [
    ...ATTRIBUTION,
    "import type { Chunk, ChunkLoaders } from \"../../engine/types\";",
    "",
    "export const ralChunks: ChunkLoaders = {",
    `  "${NEUTRAL_LOCALE}": () => import("../../data/ral/${NEUTRAL_LOCALE}.js") as unknown as Promise<{ default: Chunk }>,`,
    "};",
    "",
  ].join("\n");
}

export async function main(): Promise<void> {
  console.log("Fetching RAL Classic data…");
  const rows = await fetchRalClassic();
  const chunk = buildRalChunk(rows);
  const meta = buildMeta(chunk, new Date().toISOString());

  // Render everything into memory before touching disk, so a rendering failure
  // cannot leave DATA_DIR half-deleted while the manifest still references it.
  const chunkSource = renderChunkModule(chunk);
  const manifestSource = renderManifest();
  const metaSource = `${JSON.stringify(meta, null, 2)}\n`;

  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(SOURCE_DIR, { recursive: true });

  await writeFile(new URL(`${NEUTRAL_LOCALE}.js`, DATA_DIR), chunkSource, "utf8");
  await writeFile(new URL("meta.json", DATA_DIR), metaSource, "utf8");
  await writeFile(MANIFEST_PATH, manifestSource, "utf8");

  console.log(`Wrote ${chunk.terms.length} RAL Classic codes, ${(Buffer.byteLength(chunkSource, "utf8") / 1024).toFixed(0)} KB.`);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 8: Write the source descriptor**

Create `src/sources/ral/source.ts`:

```ts
import type { NameSource } from "../../engine/types";
import meta from "../../data/ral/meta.json";

export const ralSource: NameSource = {
  id: "ral",
  title: "RAL Classic colour codes",
  url: "https://github.com/ieskudero/ral-colors",
  retrievedAt: meta.retrievedAt,
  license: "MIT",
  languageNeutral: true,
  citation: "RAL Classic codes and sRGB values from ieskudero/ral-colors, MIT licensed.",
  disclaimer:
    "RAL is a trademark of RAL gGmbH. This source ships factual colour values "
    + "keyed by RAL Classic code, not the RAL system itself, and is neither "
    + "affiliated with nor endorsed by RAL gGmbH. RAL Design and RAL Effect "
    + "are not included.",
  languages: meta.languages as NameSource["languages"],
};
```

- [ ] **Step 9: Generate the data and register**

In `package.json`, add `"sync:ral": "bun run scripts/sync-ral/main.ts",`.

Run: `bun run sync:ral`
Expected: 213 RAL Classic codes written.

In `src/index.ts`, add beside the pantone registration:

```ts
import { ralSource } from "./sources/ral/source";
import { ralChunks } from "./sources/ral/chunks";

registerSource(ralSource, ralChunks);
```

- [ ] **Step 10: Verify**

Run: `bun test test/scripts/ral/ test/exports.test.ts`
Expected: PASS.

```bash
bun -e 'import { ColorNames } from "./src/index";
const names = await ColorNames.load("de", { source: "ral" });
console.log(names.colorOf("ral 3020")?.toString(), names.colorOf("traffic red")?.toString());'
```
Expected: the same colour twice.

- [ ] **Step 11: Commit**

```bash
git add scripts/sync-ral src/sources/ral src/data/ral src/index.ts package.json test/scripts/ral test/fixtures/ral
git commit -m "feat(i18n): add the ral catalogue source"
```

---

### Task 9: Regenerate wikidata data and guard the policies against it

**Files:**
- Regenerate: `src/data/wikidata/*`, `src/sources/wikidata/chunks.ts`
- Modify: `test/data.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 through 6.
- Produces: the shipped data the rest of the package is tested against.

- [ ] **Step 1: Run the sync**

Run: `bun run sync:wikidata`

This queries a live SPARQL endpoint and takes about 30 seconds. Read the report it prints and check it against the spec's measured figures:

- catalogue codes removed: about 1,478, split roughly pantone 87, ral 1,374, ncs 4
- descriptive names kept on catalogue items: about 34
- dropped by the alphabet check: about 15, in `ru`, `hy`, `zh`, `mk`, `bg`, `tt`, `udm`, `sr`, `sd`, `he`, `ja`
- letters in no listed script: 0
- locales folded by the invariant rule: `bcl`, `diq`, `eml`, `map-bms`, `mhr`, `nah`, `pnb`, `sh`, `tw`

If the alphabet-check list contains anything not in the spec's table, stop and report it rather than proceeding. It means either the upstream data changed or the rule is misbehaving, and both need a human decision.

- [ ] **Step 2: Confirm the shape of the new data**

```bash
bun -e '
import { readdirSync } from "fs";
const files = readdirSync("src/data/wikidata").filter(f => f.endsWith(".js"));
let total = 0;
for (const f of files) total += (await import("./src/data/wikidata/" + f)).default.terms.length;
console.log(files.length, "chunks,", total, "terms");
const ru = (await import("./src/data/wikidata/ru.js")).default;
console.log("ru latin:", ru.terms.filter(t => /[a-zA-Z]/.test(t[1])).length);
const de = (await import("./src/data/wikidata/de.js")).default;
console.log("de capitalised:", de.terms.filter(t => t[1] !== t[1].toLocaleLowerCase("de")).length);'
```

Expected: about 298 chunks and about 8,935 terms; `ru latin: 0`; `de capitalised: 0`.

- [ ] **Step 3: Write the failing guards**

In `test/data.test.ts`, inside the `describe("wikidata data integrity", ...)` block, add:

```ts
  // These three assert the policies against shipped data rather than against
  // transform internals, so a future sync cannot regress them silently.
  it("ships no catalogue codes", async () => {
    const source = getSource("wikidata");
    const offenders: string[] = [];
    for (const locale of Object.keys(source.languages)) {
      const chunk = await loadChunk("wikidata", locale);
      if (chunk.model !== "palette") continue;
      for (const [, name] of chunk.terms) {
        if (/(^|[\s\-])(pantone|ral|ncs)([\s\-]|$)/iu.test(name)) offenders.push(`${locale}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ships every name folded under its own locale", async () => {
    const source = getSource("wikidata");
    const offenders: string[] = [];
    for (const locale of Object.keys(source.languages)) {
      const chunk = await loadChunk("wikidata", locale);
      if (chunk.model !== "palette") continue;
      for (const [term, name] of chunk.terms) {
        if (term !== name) offenders.push(`${locale}: key ${JSON.stringify(term)} != name ${JSON.stringify(name)}`);
        if (name !== fold(name, locale)) offenders.push(`${locale}: ${JSON.stringify(name)} is not folded`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ships every name in a script its locale attests", async () => {
    const source = getSource("wikidata");
    const offenders: string[] = [];
    for (const locale of Object.keys(source.languages)) {
      const chunk = await loadChunk("wikidata", locale);
      if (chunk.model !== "palette") continue;
      const allowed = attestedScripts(chunk.terms.map(entry => entry[1]));
      for (const [, name] of chunk.terms) {
        if (!isScriptConsistent(name, allowed)) offenders.push(`${locale}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no longer names Eigengrau in Russian", async () => {
    const russian = await ColorNames.load("ru", { source: "wikidata" });
    expect(russian.colorOf("Eigengrau")).toBeUndefined();
    expect(russian.colorOf("красный")).toBeDefined();
  });
```

Add to that file's imports:

```ts
import { fold } from "../scripts/sync-wikidata/transform";
import { attestedScripts, isScriptConsistent } from "../scripts/sync-wikidata/scripts";
```

- [ ] **Step 4: Adjust the existing floors to the new data**

Three assertions in `test/data.test.ts` were written against the pre-split data and will now fail or, worse, pass vacuously:

- `it("keeps at least 900 catalogued items")` asserts `wikidataMeta.itemCount >= 900`. `itemCount` is now about 710. Lower the floor to 650 and replace the comment's `900` with `650`, keeping the rest of that long comment intact since its reasoning still holds.
- `it("keeps every wikidata chunk under 140 KB")` still holds; `en` shrank. Leave it.
- `it("names yellow in languages uwdata has no data for")` still holds. Leave it.

Also update the `en` term-count expectation if any test asserts one; search with `grep -rn "897" test/`.

- [ ] **Step 5: Run the whole suite**

Run: `bun test`
Expected: PASS.

- [ ] **Step 6: Build**

Run: `bun run build`
Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/wikidata src/sources/wikidata/chunks.ts test/data.test.ts
git commit -m "feat(i18n): regenerate wikidata without catalogue codes"
```

---

### Task 10: Documentation

**Files:**
- Modify: `packages/i18n/README.md`
- Modify: `docs/guide/color-naming.md`

**Interfaces:**
- Consumes: the shipped behaviour from all prior tasks.
- Produces: nothing code depends on.

- [ ] **Step 1: Update the README source table**

Open `packages/i18n/README.md` and find its sources section. Add `pantone` and `ral` rows to whatever table lists `uwdata` and `wikidata`, matching the existing columns. Each row records the licence (MIT for both) and that the source is opt-in.

Below the table, add:

```markdown
### Catalogue sources

`pantone` and `ral` catalogue industrial colour codes rather than naming
colours in a language. `RAL 1005` is the same string in every locale, so both
sources ship a single chunk under the `und` tag and answer any requested
locale:

```ts
const codes = await ColorNames.load("ru", { source: "pantone" });
codes.of(Color.parse("#4A412A")!); // "pantone 448"
codes.colorOf("448");              // the bare code works as an alias
```

Neither source is in the default chain. A plain `ColorNames.resolve()` answers
with a word, never a code; pass `source` explicitly to reach them.

PANTONE is a trademark of Pantone LLC and RAL is a trademark of RAL gGmbH.
These sources ship factual colour values keyed by code, not the systems
themselves, and this package is neither affiliated with nor endorsed by either
company. Pantone codes carry no coated or uncoated suffix upstream, so that
distinction is not represented. RAL ships Classic only, not Design or Effect.
```

- [ ] **Step 2: Record what changed in the wikidata section**

In the same README, in the `wikidata` source description, add:

```markdown
Catalogue codes moved out of this source in v2.1. Pantone, RAL and NCS entries
are no longer named here; use the `pantone` and `ral` sources instead. NCS has
no openly licensed dataset, so those four colours are not named at all.
Descriptive names for catalogue colours stayed: German `verkehrsrot` and
Italian `rosso traffico` are ordinary colour words and remain in `wikidata`.

Every name ships lower-cased under the rules of its own locale, and names
written in a script the locale does not attest are dropped at sync time.
```

- [ ] **Step 3: Update the guide**

In `docs/guide/color-naming.md`, find the section that introduces the sources and add after it:

````markdown
## Catalogue codes

`pantone` and `ral` catalogue industrial colour codes. They are not colour
names in any language: `RAL 1005` is written the same way in every locale, so
each ships one chunk under the `und` tag and answers whatever locale is asked
for.

```ts
const codes = await ColorNames.load("ru", { source: "pantone" });
codes.of(Color.parse("#4A412A")!); // "pantone 448"
codes.colorOf("448");              // the bare code is an alias
```

Neither source is in the default chain, so an ordinary lookup answers with a
word rather than a code. Reach them by passing `source` explicitly.

| Source | Entries | Licence | Aliases |
| --- | --- | --- | --- |
| `pantone` | 1,149 PMS codes | MIT | bare code |
| `ral` | 213 RAL Classic codes | MIT | bare code, English name |

PANTONE is a trademark of Pantone LLC and RAL is a trademark of RAL gGmbH.
Both sources ship factual colour values keyed by code, not the systems
themselves, and this package is neither affiliated with nor endorsed by either
company.
````

Follow the conventions in `CLAUDE.md`: laconic and formal, no em dashes in English prose, describe the thing rather than the act of documenting it.

- [ ] **Step 4: Verify the docs build**

Run from the repository root: `bun run docs:build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/README.md docs/guide/color-naming.md
git commit -m "docs(i18n): document the catalogue sources and name hygiene"
```
