# Wikidata Colour-Name Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Wikidata as a second, independently namespaced colour-name source in `@urcolor/i18n`, covering 299 languages via a new discrete-palette lookup model.

**Architecture:** A third `Chunk` kind — `PaletteChunk` — holds discrete named colours with exact Oklab centroids. `lookupPalette` does brute-force nearest-centroid search and returns the existing `BinMatch`, so `ColorNames.resolve()` stays uniform. A `scripts/sync-wikidata/` scraper mirrors `scripts/sync-uwdata/` file-for-file: three SPARQL queries, strict validation, generated per-locale chunk modules plus a manifest.

**Tech Stack:** TypeScript, Bun (`bun test`, `bun run`), `@urcolor/core` for Oklab conversion, Wikidata Query Service (SPARQL).

**Spec:** `docs/superpowers/specs/2026-08-02-wikidata-source-design.md`

## Global Constraints

- **Runtime is Bun.** `bun test` to run tests, `bun run <script>` for scripts. Never `npm`/`node`/`vitest`/`jest`.
- **Code style, matching the existing package:** 2-space indent, double-quoted strings, semicolons, `export function` over `export const fn =`, explicit return types on exported functions. ESLint enforces this; `bun run lint` from the repo root.
- **All shipped strings are NFC-normalised** (`.normalize("NFC")`) at generation time. Matches the existing uwdata policy.
- **`SELECT DISTINCT` on every SPARQL query.** `wdt:P31/wdt:P279*` reaches Q1075 by multiple routes; without `DISTINCT` the label query inflates from 10,799 to 14,705 rows.
- **Descriptive `User-Agent` on every WDQS request** — required by Wikidata's policy. Exact value: `urcolor-i18n (https://github.com/ur-color/urcolor)`.
- **Sources are never merged.** Nothing in this work may read from or write to `uwdata` data, and `source` stays a required option.
- **Wikidata is CC0-1.0.** The `uwdata` "no license declared" caveat must not be copied onto this source.
- **Test files live under `packages/i18n/test/`, fixtures under `packages/i18n/test/fixtures/<source>/`.** Fixtures are trimmed *real* API responses.
- Every path below is relative to `packages/i18n/` unless it starts with `docs/`.

---

### Task 1: Namespace the existing uwdata script tests

Pure rename. Doing it first stops Task 5's `main.test.ts` from colliding with the existing one.

**Files:**
- Move: `test/scripts/fetch.test.ts` → `test/scripts/uwdata/fetch.test.ts`
- Move: `test/scripts/transform.test.ts` → `test/scripts/uwdata/transform.test.ts`
- Move: `test/scripts/main.test.ts` → `test/scripts/uwdata/main.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Frees the names `test/scripts/{fetch,transform,main}.test.ts`.

- [ ] **Step 1: Confirm the tests pass before touching them**

Run: `cd packages/i18n && bun test test/scripts/`
Expected: PASS. Note the test count — it must be identical after the move.

- [ ] **Step 2: Move the files**

```bash
cd packages/i18n
mkdir -p test/scripts/uwdata
git mv test/scripts/fetch.test.ts test/scripts/uwdata/fetch.test.ts
git mv test/scripts/transform.test.ts test/scripts/uwdata/transform.test.ts
git mv test/scripts/main.test.ts test/scripts/uwdata/main.test.ts
```

- [ ] **Step 3: Fix the relative import depth**

Each moved file gained one directory level. Every `../../` pointing at `src/`, `scripts/`, or `test/fixtures/` becomes `../../../`. In all three files, replace:

- `"../../scripts/sync-uwdata/fetch"` → `"../../../scripts/sync-uwdata/fetch"`
- `"../../scripts/sync-uwdata/transform"` → `"../../../scripts/sync-uwdata/transform"`
- `"../../scripts/sync-uwdata/main"` → `"../../../scripts/sync-uwdata/main"`
- `"../../src/engine/types"` → `"../../../src/engine/types"`
- `` `${import.meta.dir}/../fixtures/uwdata/` `` → `` `${import.meta.dir}/../../fixtures/uwdata/` ``

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/scripts/`
Expected: PASS, with the exact same test count as Step 1.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/test/scripts
git commit -m "test: namespace uwdata script tests under test/scripts/uwdata"
```

---

### Task 2: `PaletteChunk` type and `lookupPalette`

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/lookup-palette.ts`
- Test: `test/engine/lookup-palette.test.ts`

**Interfaces:**
- Consumes: `TermEntry`, `LanguageCoverage`, `Chunk` from `src/engine/types.ts`; `BinMatch`, `Candidate`, `LookupOptions` from `src/engine/lookup-full.ts`.
- Produces:
  - `PaletteChunk` (interface, exported from `src/engine/types.ts`)
  - `lookupPalette(chunk: PaletteChunk, oklab: [number, number, number], options: LookupOptions): BinMatch`
  - `EXACT_EPSILON: number` (exported from `src/engine/lookup-palette.ts`)

- [ ] **Step 1: Write the failing test**

Create `test/engine/lookup-palette.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { EXACT_EPSILON, lookupPalette } from "../../src/engine/lookup-palette";
import type { PaletteChunk } from "../../src/engine/types";

/**
 * Three widely separated Oklab points so nearest-centroid ordering is
 * unambiguous. Values are plausible Oklab coordinates, not derived from a
 * conversion, because this unit tests the search, not the colour maths.
 */
const chunk: PaletteChunk = {
  lang: "en",
  model: "palette",
  terms: [
    ["yellow", "yellow", [0.968, -0.071, 0.198], null],
    ["white", "white", [1, 0, 0], null],
    ["black", "black", [0, 0, 0], null],
  ],
  provenance: [["Q943", "FFFF00"], ["Q23444", "FFFFFF"], ["Q23445", "000000"]],
  aliases: { "yellow color": 0, "color yellow": 0 },
};

const options = { topN: 5, maxDistance: 0.5 };

describe("lookupPalette", () => {
  it("reports an exact hit when the query is a catalogued colour", () => {
    const match = lookupPalette(chunk, [0.968, -0.071, 0.198], options);
    expect(match.coverage).toBe("exact");
    expect(match.binDistance).toBeCloseTo(0, 10);
    expect(match.candidates[0]?.term).toBe("yellow");
    expect(match.candidates[0]?.probability).toBeCloseTo(1, 10);
  });

  it("reports nearest with the true Oklab distance", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], options);
    expect(match.coverage).toBe("nearest");
    expect(match.candidates[0]?.term).toBe("white");
    expect(match.binDistance).toBeCloseTo(0.1, 10);
  });

  it("orders every candidate by ascending distance", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], options);
    expect(match.candidates.map(c => c.term)).toEqual(["white", "yellow", "black"]);
  });

  it("derives probability as clamped proximity, not a frequency", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], options);
    // distance 0.1, maxDistance 0.5 -> 1 - 0.1/0.5 = 0.8
    expect(match.candidates[0]?.probability).toBeCloseTo(0.8, 10);
  });

  it("honours topN", () => {
    const match = lookupPalette(chunk, [0.9, 0, 0], { topN: 2, maxDistance: 0.5 });
    expect(match.candidates).toHaveLength(2);
  });

  it("reports none when the nearest centroid is beyond maxDistance", () => {
    const match = lookupPalette(chunk, [0.5, 0.3, -0.3], { topN: 5, maxDistance: 0.01 });
    expect(match.coverage).toBe("none");
    expect(match.candidates).toEqual([]);
    expect(match.binDistance).toBe(Number.POSITIVE_INFINITY);
  });

  it("still matches an exact hit when maxDistance is zero", () => {
    const match = lookupPalette(chunk, [1, 0, 0], { topN: 5, maxDistance: 0 });
    expect(match.coverage).toBe("exact");
    expect(match.candidates[0]?.term).toBe("white");
    expect(match.candidates[0]?.probability).toBe(1);
  });

  it("reports none for an empty chunk", () => {
    const empty: PaletteChunk = {
      lang: "xx", model: "palette", terms: [], provenance: [], aliases: {},
    };
    expect(lookupPalette(empty, [0.5, 0, 0], options).coverage).toBe("none");
  });

  it("treats a sub-epsilon distance as exact", () => {
    const match = lookupPalette(chunk, [1, 0, EXACT_EPSILON / 2], options);
    expect(match.coverage).toBe("exact");
  });

  it("skips entries with a null centroid rather than throwing", () => {
    const withNull: PaletteChunk = {
      lang: "en",
      model: "palette",
      terms: [["ghost", "ghost", null, null], ["white", "white", [1, 0, 0], null]],
      provenance: [["Q1", "000000"], ["Q23444", "FFFFFF"]],
      aliases: {},
    };
    const match = lookupPalette(withNull, [1, 0, 0], options);
    expect(match.candidates.map(c => c.term)).toEqual(["white"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/engine/lookup-palette.test.ts`
Expected: FAIL — cannot resolve `../../src/engine/lookup-palette`.

- [ ] **Step 3: Add `PaletteChunk` to `src/engine/types.ts`**

Widen `LanguageCoverage["model"]` — replace this line:

```ts
  model: "full" | "hue";
```

with:

```ts
  model: "full" | "hue" | "palette";
```

Append the new interface after `HueChunk`. **Do not touch the `Chunk` union in
this task** — adding `PaletteChunk` to it makes `color-names.ts` stop
type-checking (its `resolve()` ternary would pass a `PaletteChunk` to
`lookupHue`) until Task 3 adds the matching branch. Task 3 widens the union and
adds the branch together, so no commit is ever left type-broken.

```ts
/**
 * Discrete named colours, each with one exact sRGB value. Unlike the full and
 * hue models, this catalogues named points rather than modelling how speakers
 * name a space — so there are no bins and no sampled distribution.
 */
export interface PaletteChunk {
  lang: string;
  model: "palette";
  /**
   * One entry per (item, label in this language), ordered by the source's
   * salience ranking so that a first-match reverse lookup is deterministic.
   * `centroid` is always present in generated data — an item without a colour
   * value is filtered out at sync time. `pCT` is always `null`: this source
   * carries no "probability the colour is named this term" signal at all.
   */
  terms: TermEntry[];
  /** Parallel to `terms`: `[qid, hex]` provenance for each entry. */
  provenance: [qid: string, hex: string][];
  /** NFC-normalised, lowercased alias -> index into `terms`. Reverse lookup only. */
  aliases: Record<string, number>;
}
```

Leave `export type Chunk = FullChunk | HueChunk;` exactly as it is.

Also add `retrievedAt` to `NameSource`, after `commitSha`:

```ts
  /**
   * When the shipped data was retrieved, for sources with no pinnable
   * revision (a live query endpoint rather than a git repo).
   */
  retrievedAt?: string;
```

- [ ] **Step 4: Write `src/engine/lookup-palette.ts`**

```ts
import type { BinMatch, Candidate, LookupOptions } from "./lookup-full";
import type { PaletteChunk } from "./types";

/**
 * Oklab distance below which a query counts as *being* a catalogued colour
 * rather than merely near one. Well under any perceptible difference, so it
 * only ever fires for a genuine round-trip of the source's own hex value.
 */
export const EXACT_EPSILON = 1e-6;

const EMPTY: BinMatch = { candidates: [], coverage: "none", binDistance: Number.POSITIVE_INFINITY };

/**
 * Proximity confidence in [0, 1] — **not** a naming frequency. The palette
 * model has no sampled distribution to report, so rather than fabricate one,
 * this reports how close the match is relative to the search radius. Callers
 * who need the underlying truth read `binDistance`, which is always exact.
 *
 * With `maxDistance <= 0` only an exact hit can match at all, so the ratio is
 * undefined and irrelevant; such a match reports full confidence.
 */
function proximity(distance: number, maxDistance: number): number {
  if (!(maxDistance > 0)) return 1;
  return Math.min(1, Math.max(0, 1 - distance / maxDistance));
}

/**
 * Nearest-centroid search over every entry in the chunk.
 *
 * Brute force is the right choice here, not a concession: the largest shipped
 * chunk holds 897 entries, so a full scan is a few microseconds — cheaper than
 * building and traversing a spatial index, and immune to the correctness traps
 * that come with one.
 */
export function lookupPalette(
  chunk: PaletteChunk,
  oklab: [number, number, number],
  options: LookupOptions,
): BinMatch {
  const [l, a, b] = oklab;

  const scored: { candidate: Candidate; distance: number }[] = [];
  for (const entry of chunk.terms) {
    const centroid = entry[2];
    if (centroid === null) continue;
    const distance = Math.hypot(centroid[0] - l, centroid[1] - a, centroid[2] - b);
    scored.push({ candidate: { term: entry[0], name: entry[1], probability: 0 }, distance });
  }

  if (scored.length === 0) return EMPTY;
  scored.sort((x, y) => x.distance - y.distance);

  const nearest = scored[0]!;
  const exact = nearest.distance <= EXACT_EPSILON;
  if (!exact && !(nearest.distance <= options.maxDistance)) return EMPTY;

  const candidates = scored.slice(0, options.topN).map(({ candidate, distance }) => ({
    ...candidate,
    probability: proximity(distance, options.maxDistance),
  }));

  return {
    candidates,
    coverage: exact ? "exact" : "nearest",
    binDistance: nearest.distance,
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `cd packages/i18n && bun test test/engine/lookup-palette.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Verify nothing else broke**

Run: `cd packages/i18n && bun test` then `cd /Users/grandmagus/Documents/Projects/urcolor && bun run lint`
Expected: both PASS. This task is purely additive — a new interface, a widened
`LanguageCoverage["model"]`, a new optional `NameSource` field, and a new
module nothing imports yet. If lint fails, you widened the `Chunk` union; undo
that (see Step 3).

- [ ] **Step 7: Commit**

```bash
git add packages/i18n/src/engine packages/i18n/test/engine/lookup-palette.test.ts
git commit -m "feat(i18n): add palette chunk model and nearest-centroid lookup"
```

---

### Task 3: Wire the palette model into `ColorNames`

**Files:**
- Modify: `src/engine/types.ts` (widen the `Chunk` union — deferred from Task 2)
- Modify: `src/color-names.ts`
- Test: `test/color-names.test.ts` (append)

**Interfaces:**
- Consumes: `lookupPalette`, `PaletteChunk` from Task 2.
- Produces: `ColorNames.resolve()` handling `model === "palette"`; `resolveColorOf()` consulting `chunk.aliases`.

- [ ] **Step 1: Write the failing test**

Append to `test/color-names.test.ts`. Note it registers its own throwaway source — it must not depend on generated Wikidata data, which does not exist until Task 6.

```ts
describe("palette model", () => {
  const paletteChunk: PaletteChunk = {
    lang: "en",
    model: "palette",
    terms: [
      ["yellow", "yellow", [...Color.parse("#FFFF00")!.to("oklab").coords] as [number, number, number], null],
      ["white", "white", [...Color.parse("#FFFFFF")!.to("oklab").coords] as [number, number, number], null],
    ],
    provenance: [["Q943", "FFFF00"], ["Q23444", "FFFFFF"]],
    aliases: { "color yellow": 0, "yellow color": 0 },
  };

  beforeAll(() => {
    registerSource(
      {
        id: "test-palette",
        title: "Test Palette",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Test",
        languages: { en: { model: "palette", terms: 2, coverage: 1 } },
      },
      { en: () => Promise.resolve({ default: paletteChunk }) },
    );
  });

  it("names an exact catalogued colour", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.of(Color.parse("#FFFF00")!)).toBe("yellow");
    expect(names.resolve(Color.parse("#FFFF00")!).coverage).toBe("exact");
  });

  it("reports the palette model in resolvedOptions with no binSize", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.resolvedOptions().model).toBe("palette");
    expect(names.resolvedOptions().binSize).toBeUndefined();
  });

  it("falls back to the nearest catalogued colour", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    const result = names.resolve(Color.parse("#FFFEF0")!);
    expect(result.coverage).toBe("nearest");
    expect(result.name).toBe("white");
    expect(result.binDistance).toBeGreaterThan(0);
  });

  it("withholds a nearest match when fallback is none", async () => {
    const names = await ColorNames.load("en", { source: "test-palette", fallback: "none" });
    expect(names.of(Color.parse("#FFFEF0")!)).toBeUndefined();
    // resolve() still reports the truth regardless of fallback.
    expect(names.resolve(Color.parse("#FFFEF0")!).name).toBe("white");
  });

  it("reverse-looks-up by term", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    // Oklab round-trips exactly for these values; verified against @urcolor/core.
    expect(names.colorOf("yellow")?.toString("hex")).toBe("#ffff00");
  });

  it("reverse-looks-up by alias", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.resolveColorOf("color yellow")?.term).toBe("yellow");
    expect(names.resolveColorOf("YELLOW COLOR")?.term).toBe("yellow");
  });

  it("returns undefined for an unknown alias", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.resolveColorOf("not a colour")).toBeUndefined();
  });
});
```

Ensure the file's imports include `beforeAll` from `bun:test`, `registerSource` from `../src/engine/registry`, and `type PaletteChunk` from `../src/engine/types`. Add them to the existing import statements rather than duplicating.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/color-names.test.ts`
Expected: FAIL — palette lookups produce no candidates because `resolve()` has no palette branch.

- [ ] **Step 3: Add the palette branch to `resolve()`**

First widen the `Chunk` union in `src/engine/types.ts` — Task 2 deliberately
left it alone so that no commit sat in a type-broken state. Replace:

```ts
export type Chunk = FullChunk | HueChunk;
```

with:

```ts
export type Chunk = FullChunk | HueChunk | PaletteChunk;
```

Then in `src/color-names.ts`, add the import:

```ts
import { lookupPalette } from "./engine/lookup-palette";
```

Add the palette default beside the existing constants:

```ts
/**
 * The palette model's default search radius is wider than the binned models'.
 * 964 catalogued colours spread across Oklab leave real gaps — a radius tuned
 * for a dense 0.05 bin grid would report "none" for ordinary colours.
 */
const DEFAULT_PALETTE_MAX_DISTANCE = 0.15;
```

In the constructor, replace:

```ts
      maxDistance: options.maxDistance ?? DEFAULT_MAX_DISTANCE,
```

with:

```ts
      maxDistance: options.maxDistance
        ?? (chunk.model === "palette" ? DEFAULT_PALETTE_MAX_DISTANCE : DEFAULT_MAX_DISTANCE),
```

In `resolve()`, replace the two-way ternary:

```ts
    const match = this.#chunk.model === "full"
      ? lookupFull(this.#chunk, oklabOf(color), { topN, maxDistance })
      : lookupHue(this.#chunk, color, { topN, maxHueDistance: MAX_HUE_DISTANCE });
```

with an explicit switch, so a future fourth model is a compile error rather than a silent fall-through:

```ts
    let match: BinMatch | HueMatch;
    switch (this.#chunk.model) {
      case "full":
        match = lookupFull(this.#chunk, oklabOf(color), { topN, maxDistance });
        break;
      case "hue":
        match = lookupHue(this.#chunk, color, { topN, maxHueDistance: MAX_HUE_DISTANCE });
        break;
      case "palette":
        match = lookupPalette(this.#chunk, oklabOf(color), { topN, maxDistance });
        break;
    }
```

- [ ] **Step 4: Teach `resolveColorOf` about aliases**

In `src/color-names.ts`, replace the body of `resolveColorOf` between the `normalizedTerm` line and the `const [key, name, centroid, pCT] = entry;` line with:

```ts
    const normalizedTerm = term.normalize("NFC");
    let entry = this.#chunk.terms.find(([key, name]) => key === normalizedTerm || name === normalizedTerm);

    // Palette chunks carry the source's alternative names separately. Only
    // consult them after a direct term/name miss, so a real term never loses
    // to another entry's alias.
    if (entry === undefined && this.#chunk.model === "palette") {
      const index = this.#chunk.aliases[normalizedTerm.toLowerCase()];
      if (index !== undefined) entry = this.#chunk.terms[index];
    }

    if (entry === undefined) return undefined;
```

Also widen `binSize` in `resolvedOptions()` — it currently reads `this.#chunk.model === "full" ? this.#chunk.binSize : undefined`, which already yields `undefined` for palette. Leave it as is; the test asserts that behaviour.

Add `BinMatch` and `HueMatch` to the existing type imports if not already present.

- [ ] **Step 5: Run the tests**

Run: `cd packages/i18n && bun test test/color-names.test.ts`
Expected: PASS, including the 7 new palette tests.

- [ ] **Step 6: Type-check**

Run: `cd /Users/grandmagus/Documents/Projects/urcolor && bun run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/i18n/src/color-names.ts packages/i18n/test/color-names.test.ts
git commit -m "feat(i18n): resolve palette chunks and alias reverse lookup in ColorNames"
```

---

### Task 4: Scraper fetch layer

**Files:**
- Create: `scripts/sync-wikidata/fetch.ts`
- Create: `test/fixtures/wikidata/items.json`
- Create: `test/fixtures/wikidata/labels.json`
- Create: `test/fixtures/wikidata/aliases.json`
- Test: `test/scripts/wikidata/fetch.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `class SchemaError extends Error { readonly status?: number }`
  - `interface RawItemRow { qid: string; hex: string; sitelinks: number }`
  - `interface RawLabelRow { qid: string; lang: string; value: string }`
  - `type RawAliasRow = RawLabelRow`
  - `ENDPOINT`, `USER_AGENT`, `ITEMS_QUERY`, `LABELS_QUERY`, `ALIASES_QUERY` (all `string`)
  - `parseItems(json: string): RawItemRow[]`
  - `parseLabels(json: string): RawLabelRow[]`
  - `parseAliases(json: string): RawAliasRow[]`
  - `runQuery(query: string, options?: RunQueryOptions): Promise<string>`
  - `interface RunQueryOptions { fetchImpl?: typeof fetch; retries?: number; delayMs?: number }`

- [ ] **Step 1: Create the fixtures**

`test/fixtures/wikidata/items.json` — real rows, including the genuine multi-hex item Q12894641 (lilac) and the genuine `"white"` collision pair Q23444 / Q62391724:

```json
{
  "head": { "vars": [ "item", "hex", "sitelinks" ] },
  "results": {
    "bindings": [
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "hex": { "type": "literal", "value": "FFFF00" }, "sitelinks": { "type": "literal", "datatype": "http://www.w3.org/2001/XMLSchema#integer", "value": "189" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q23444" }, "hex": { "type": "literal", "value": "FFFFFF" }, "sitelinks": { "type": "literal", "datatype": "http://www.w3.org/2001/XMLSchema#integer", "value": "183" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q62391724" }, "hex": { "type": "literal", "value": "FFFFFF" }, "sitelinks": { "type": "literal", "datatype": "http://www.w3.org/2001/XMLSchema#integer", "value": "0" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q12894641" }, "hex": { "type": "literal", "value": "C8A2C8" }, "sitelinks": { "type": "literal", "datatype": "http://www.w3.org/2001/XMLSchema#integer", "value": "38" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q12894641" }, "hex": { "type": "literal", "value": "BF00FF" }, "sitelinks": { "type": "literal", "datatype": "http://www.w3.org/2001/XMLSchema#integer", "value": "38" } }
    ]
  }
}
```

`test/fixtures/wikidata/labels.json` — covers a base tag, a region variant to merge, two script variants to keep, an excluded pseudo-language, a thin-tail language, and the collision pair:

```json
{
  "head": { "vars": [ "item", "label" ] },
  "results": {
    "bindings": [
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "en", "type": "literal", "value": "yellow" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "en-us", "type": "literal", "value": "yellow (US)" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "ru", "type": "literal", "value": "жёлтый" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "ka", "type": "literal", "value": "ყვითელი" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "sr-ec", "type": "literal", "value": "жута" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "sr-el", "type": "literal", "value": "žuta" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "label": { "xml:lang": "mul", "type": "literal", "value": "FFFF00" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q23444" }, "label": { "xml:lang": "en", "type": "literal", "value": "white" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q62391724" }, "label": { "xml:lang": "en", "type": "literal", "value": "white" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q12894641" }, "label": { "xml:lang": "en-us", "type": "literal", "value": "lilac" } }
    ]
  }
}
```

`test/fixtures/wikidata/aliases.json`:

```json
{
  "head": { "vars": [ "item", "alias" ] },
  "results": {
    "bindings": [
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "alias": { "xml:lang": "en", "type": "literal", "value": "yellow color" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "alias": { "xml:lang": "en", "type": "literal", "value": "color yellow" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q943" }, "alias": { "xml:lang": "ru", "type": "literal", "value": "жёлтый цвет" } },
      { "item": { "type": "uri", "value": "http://www.wikidata.org/entity/Q23444" }, "alias": { "xml:lang": "en", "type": "literal", "value": "White" } }
    ]
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `test/scripts/wikidata/fetch.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  ALIASES_QUERY,
  ITEMS_QUERY,
  LABELS_QUERY,
  SchemaError,
  parseAliases,
  parseItems,
  parseLabels,
  runQuery,
} from "../../../scripts/sync-wikidata/fetch";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

function sparqlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "application/sparql-results+json" } });
}

describe("queries", () => {
  it("every query uses SELECT DISTINCT", () => {
    // Without DISTINCT the P31/P279* path yields duplicate solutions.
    for (const query of [ITEMS_QUERY, LABELS_QUERY, ALIASES_QUERY]) {
      expect(query).toContain("SELECT DISTINCT");
    }
  });
});

describe("parseItems", () => {
  it("parses rows and extracts the QID from the entity URI", async () => {
    const rows = parseItems(await fixture("items.json"));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ qid: "Q943", hex: "FFFF00", sitelinks: 189 });
  });

  it("keeps both rows of a multi-hex item", async () => {
    const rows = parseItems(await fixture("items.json"));
    expect(rows.filter(r => r.qid === "Q12894641").map(r => r.hex).sort())
      .toEqual(["BF00FF", "C8A2C8"]);
  });

  it("throws SchemaError on a malformed hex", () => {
    const bad = JSON.stringify({
      head: { vars: ["item", "hex", "sitelinks"] },
      results: { bindings: [{
        item: { type: "uri", value: "http://www.wikidata.org/entity/Q1" },
        hex: { type: "literal", value: "ZZZ" },
        sitelinks: { type: "literal", value: "1" },
      }] },
    });
    expect(() => parseItems(bad)).toThrow(SchemaError);
    expect(() => parseItems(bad)).toThrow(/hex/);
  });

  it("throws SchemaError on a non-entity URI", () => {
    const bad = JSON.stringify({
      head: { vars: ["item", "hex", "sitelinks"] },
      results: { bindings: [{
        item: { type: "uri", value: "http://example.invalid/nope" },
        hex: { type: "literal", value: "FFFFFF" },
        sitelinks: { type: "literal", value: "1" },
      }] },
    });
    expect(() => parseItems(bad)).toThrow(SchemaError);
  });

  it("throws SchemaError when bindings is missing", () => {
    expect(() => parseItems(JSON.stringify({ head: { vars: [] } }))).toThrow(SchemaError);
  });
});

describe("parseLabels", () => {
  it("parses the language tag from xml:lang", async () => {
    const rows = parseLabels(await fixture("labels.json"));
    expect(rows).toHaveLength(10);
    expect(rows[0]).toEqual({ qid: "Q943", lang: "en", value: "yellow" });
    expect(rows.find(r => r.lang === "ka")?.value).toBe("ყვითელი");
  });

  it("throws SchemaError when xml:lang is absent", () => {
    const bad = JSON.stringify({
      head: { vars: ["item", "label"] },
      results: { bindings: [{
        item: { type: "uri", value: "http://www.wikidata.org/entity/Q1" },
        label: { type: "literal", value: "orphan" },
      }] },
    });
    expect(() => parseLabels(bad)).toThrow(SchemaError);
    expect(() => parseLabels(bad)).toThrow(/xml:lang/);
  });
});

describe("parseAliases", () => {
  it("parses alias rows", async () => {
    const rows = parseAliases(await fixture("aliases.json"));
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ qid: "Q943", lang: "en", value: "yellow color" });
  });
});

describe("runQuery", () => {
  it("sends a descriptive User-Agent and requests SPARQL JSON", async () => {
    const seen: Request[] = [];
    const fetchImpl = ((input: string | URL | Request, init?: RequestInit) => {
      seen.push(new Request(input as string, init));
      return Promise.resolve(sparqlResponse("{}"));
    }) as unknown as typeof fetch;

    await runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl });
    expect(seen).toHaveLength(1);
    expect(seen[0]!.headers.get("user-agent")).toContain("urcolor-i18n");
    expect(seen[0]!.headers.get("accept")).toContain("sparql-results+json");
  });

  it("retries on 502 and succeeds", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(calls === 1 ? sparqlResponse("nope", 502) : sparqlResponse("{\"ok\":1}"));
    }) as unknown as typeof fetch;

    const body = await runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl, delayMs: 0 });
    expect(calls).toBe(2);
    expect(body).toBe("{\"ok\":1}");
  });

  it("retries on 429", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(calls < 3 ? sparqlResponse("slow down", 429) : sparqlResponse("{}"));
    }) as unknown as typeof fetch;

    await runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl, delayMs: 0 });
    expect(calls).toBe(3);
  });

  it("gives up after the retry budget and reports the status", async () => {
    const fetchImpl = (() => Promise.resolve(sparqlResponse("down", 503))) as unknown as typeof fetch;
    const attempt = runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl, retries: 2, delayMs: 0 });
    await expect(attempt).rejects.toThrow(SchemaError);
    await expect(attempt).rejects.toThrow(/503/);
  });

  it("does not retry a 400 — a malformed query will never succeed", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(sparqlResponse("bad query", 400));
    }) as unknown as typeof fetch;

    await expect(runQuery("nonsense", { fetchImpl, delayMs: 0 })).rejects.toThrow(SchemaError);
    expect(calls).toBe(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/scripts/wikidata/fetch.test.ts`
Expected: FAIL — cannot resolve `../../../scripts/sync-wikidata/fetch`.

- [ ] **Step 4: Write `scripts/sync-wikidata/fetch.ts`**

```ts
/**
 * Raised when the Wikidata Query Service response no longer matches what the
 * transform expects, or when a request itself fails. `status` is set only for
 * HTTP failures, letting callers distinguish a retryable outage from real
 * schema drift.
 */
export class SchemaError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SchemaError";
    this.status = status;
  }
}

export const ENDPOINT = "https://query.wikidata.org/sparql";

/** WDQS policy requires a descriptive agent identifying the client. */
export const USER_AGENT = "urcolor-i18n (https://github.com/ur-color/urcolor)";

/**
 * `SELECT DISTINCT` throughout is load-bearing. `wdt:P31/wdt:P279*` can reach
 * Q1075 by more than one route and SPARQL returns one solution per route, so
 * without it the item query returns 1,124 rows for 964 items and the label
 * query inflates from 10,799 rows to 14,705.
 *
 * The three queries are deliberately separate. Joining labels and aliases in
 * one SELECT cross-products them into ~29.5 MB over ~117 s, close enough to
 * the WDQS timeout to be a liability; split, the same data costs ~30 s.
 */
const COLOUR_ITEM = "?item wdt:P31/wdt:P279* wd:Q1075 ; wdt:P465 ?hex";

export const ITEMS_QUERY =
  `SELECT DISTINCT ?item ?hex ?sitelinks WHERE { ${COLOUR_ITEM} ; wikibase:sitelinks ?sitelinks }`;

export const LABELS_QUERY =
  `SELECT DISTINCT ?item ?label WHERE { ${COLOUR_ITEM} . ?item rdfs:label ?label }`;

export const ALIASES_QUERY =
  `SELECT DISTINCT ?item ?alias WHERE { ${COLOUR_ITEM} . ?item skos:altLabel ?alias }`;

export interface RawItemRow {
  qid: string;
  /** Six hex digits, no leading `#`, exactly as upstream stores it. */
  hex: string;
  sitelinks: number;
}

export interface RawLabelRow {
  qid: string;
  /** BCP 47-ish tag exactly as Wikidata spells it, e.g. `sr-ec`. */
  lang: string;
  value: string;
}

export type RawAliasRow = RawLabelRow;

export interface RunQueryOptions {
  /** Injected in tests; defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Attempts after the first. Default 3. */
  retries?: number;
  /** Base backoff delay in ms, doubled per attempt. Default 1000. */
  delayMs?: number;
}

/** 429 and 5xx are transient; 4xx (other than 429) never becomes valid on retry. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * POSTs a query and returns the raw response body.
 *
 * Retries with exponential backoff: WDQS rate limits, and a transient 502 was
 * observed during development on a query that succeeded on immediate retry.
 * A bare fetch here would make syncs flaky for no reason.
 */
export async function runQuery(query: string, options: RunQueryOptions = {}): Promise<string> {
  const { fetchImpl = fetch, retries = 3, delayMs = 1000 } = options;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Accept": "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({ query }).toString(),
    });

    if (response.ok) return response.text();

    lastStatus = response.status;
    if (!isRetryable(response.status)) break;
    if (attempt < retries) await sleep(delayMs * 2 ** attempt);
  }

  throw new SchemaError(`WDQS query failed: HTTP ${lastStatus}`, lastStatus);
}

function requireObject(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SchemaError(`WDQS schema drift in ${where}: expected an object, got ${JSON.stringify(value)}.`);
  }
  return value as Record<string, unknown>;
}

/** The `bindings` array, validated. Every parser starts here. */
function bindingsOf(json: string, where: string): Record<string, unknown>[] {
  const root = requireObject(JSON.parse(json) as unknown, where);
  const results = requireObject(root.results, `${where}.results`);
  if (!Array.isArray(results.bindings)) {
    throw new SchemaError(`WDQS schema drift in ${where}: results.bindings is not an array.`);
  }
  return results.bindings.map((binding, index) => requireObject(binding, `${where}.bindings[${index}]`));
}

function cellValue(binding: Record<string, unknown>, field: string, where: string): string {
  const cell = requireObject(binding[field], `${where}.${field}`);
  const value = cell.value;
  if (typeof value !== "string" || value.length === 0) {
    throw new SchemaError(`WDQS schema drift in ${where}: ${field}.value must be a non-empty string.`);
  }
  return value;
}

function cellLanguage(binding: Record<string, unknown>, field: string, where: string): string {
  const cell = requireObject(binding[field], `${where}.${field}`);
  const lang = cell["xml:lang"];
  if (typeof lang !== "string" || lang.length === 0) {
    throw new SchemaError(`WDQS schema drift in ${where}: ${field} is missing xml:lang.`);
  }
  return lang;
}

const ENTITY_PREFIX = "http://www.wikidata.org/entity/";
const QID_PATTERN = /^Q[1-9][0-9]*$/;
const HEX_PATTERN = /^[0-9a-fA-F]{6}$/;

function qidOf(uri: string, where: string): string {
  if (!uri.startsWith(ENTITY_PREFIX)) {
    throw new SchemaError(`WDQS schema drift in ${where}: "${uri}" is not a Wikidata entity URI.`);
  }
  const qid = uri.slice(ENTITY_PREFIX.length);
  if (!QID_PATTERN.test(qid)) {
    throw new SchemaError(`WDQS schema drift in ${where}: "${qid}" is not a well-formed QID.`);
  }
  return qid;
}

export function parseItems(json: string): RawItemRow[] {
  return bindingsOf(json, "items").map((binding, index) => {
    const where = `items.bindings[${index}]`;
    const hex = cellValue(binding, "hex", where);
    if (!HEX_PATTERN.test(hex)) {
      throw new SchemaError(`WDQS schema drift in ${where}: hex "${hex}" is not six hex digits.`);
    }
    const sitelinks = Number(cellValue(binding, "sitelinks", where));
    if (!Number.isFinite(sitelinks)) {
      throw new SchemaError(`WDQS schema drift in ${where}: sitelinks is not a number.`);
    }
    return { qid: qidOf(cellValue(binding, "item", where), where), hex, sitelinks };
  });
}

/** Shared by labels and aliases — the two differ only in the projected variable name. */
function parseLangRows(json: string, field: string, where: string): RawLabelRow[] {
  return bindingsOf(json, where).map((binding, index) => {
    const at = `${where}.bindings[${index}]`;
    return {
      qid: qidOf(cellValue(binding, "item", at), at),
      lang: cellLanguage(binding, field, at),
      value: cellValue(binding, field, at),
    };
  });
}

export function parseLabels(json: string): RawLabelRow[] {
  return parseLangRows(json, "label", "labels");
}

export function parseAliases(json: string): RawAliasRow[] {
  return parseLangRows(json, "alias", "aliases");
}
```

- [ ] **Step 5: Run the tests**

Run: `cd packages/i18n && bun test test/scripts/wikidata/fetch.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/scripts/sync-wikidata/fetch.ts packages/i18n/test/fixtures/wikidata packages/i18n/test/scripts/wikidata/fetch.test.ts
git commit -m "feat(i18n): add wikidata SPARQL fetch layer with strict validation"
```

---

### Task 5: Scraper transform layer

**Files:**
- Create: `scripts/sync-wikidata/transform.ts`
- Test: `test/scripts/wikidata/transform.test.ts`

**Interfaces:**
- Consumes: `RawItemRow`, `RawLabelRow`, `RawAliasRow` from Task 4; `PaletteChunk`, `LanguageCoverage`, `TermEntry` from Task 2.
- Produces:
  - `LANGUAGE_MERGE: Readonly<Record<string, string>>`
  - `EXCLUDED_LANGUAGES: ReadonlySet<string>`
  - `normalizeLanguage(tag: string): string | undefined`
  - `pickHex(hexes: readonly string[]): string`
  - `interface ColorItem { qid: string; hex: string; sitelinks: number; centroid: [number, number, number] }`
  - `buildItems(rows: readonly RawItemRow[]): ColorItem[]`
  - `groupLabels(rows: readonly RawLabelRow[]): Map<string, Map<string, string>>`
  - `groupAliases(rows: readonly RawAliasRow[]): Map<string, { qid: string; value: string }[]>`
  - `buildPaletteChunk(lang, items, labels, aliases): PaletteChunk`
  - `paletteCoverage(chunk: PaletteChunk, itemCount: number): LanguageCoverage`

- [ ] **Step 1: Write the failing test**

Create `test/scripts/wikidata/transform.test.ts`:

```ts
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
    const decomposed = "же́";        // же + combining acute
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/scripts/wikidata/transform.test.ts`
Expected: FAIL — cannot resolve `../../../scripts/sync-wikidata/transform`.

- [ ] **Step 3: Write `scripts/sync-wikidata/transform.ts`**

```ts
import { Color } from "@urcolor/core";
import type { LanguageCoverage, PaletteChunk, TermEntry } from "../../src/engine/types";
import type { RawAliasRow, RawItemRow, RawLabelRow } from "./fetch";

/**
 * Wikidata pseudo-languages. `mul` ("multiple languages") is present in the
 * live data; `zxx` ("no linguistic content") is not, and is excluded
 * defensively. Neither is a language a locale could negotiate to.
 */
export const EXCLUDED_LANGUAGES: ReadonlySet<string> = new Set(["mul", "zxx"]);

/**
 * Wikidata ships regional and orthographic variants as independent label sets,
 * usually far thinner than their base tag. Shipping them verbatim is a footgun:
 * `negotiateLocale` prefers an exact tag match, so a 6-term `en-gb` chunk would
 * beat the 897-term `en` chunk for a caller asking for "en-GB".
 *
 * Region-only variants therefore fold into their base tag, while genuine script
 * variants stay distinct under well-formed BCP 47 script subtags. Chinese
 * regional tags are treated as script tags because that is what they encode in
 * practice; bare `zh` on Wikidata is Simplified, matching the uwdata `zh` chunk.
 */
export const LANGUAGE_MERGE: Readonly<Record<string, string>> = {
  "en-ca": "en", "en-gb": "en", "en-us": "en",
  "de-at": "de", "de-ch": "de",
  "pt-br": "pt",
  "crh-ro": "crh",
  "pap-aw": "pap",
  "zh-cn": "zh", "zh-sg": "zh", "zh-my": "zh", "zh-hans": "zh",
  "zh-tw": "zh-Hant", "zh-hk": "zh-Hant", "zh-mo": "zh-Hant", "zh-hant": "zh-Hant",
  "sr-ec": "sr-Cyrl", "sr-el": "sr-Latn",
  "tt-cyrl": "tt-Cyrl", "tt-latn": "tt-Latn",
  "aeb-arab": "aeb-Arab", "aeb-latn": "aeb-Latn",
  "isv-cyrl": "isv-Cyrl", "isv-latn": "isv-Latn",
  "ku-latn": "ku-Latn",
  "ms-arab": "ms-Arab",
  "shy-latn": "shy-Latn",
};

/** The locale a Wikidata tag ships under, or `undefined` if it must be dropped. */
export function normalizeLanguage(tag: string): string | undefined {
  const lower = tag.toLowerCase();
  if (EXCLUDED_LANGUAGES.has(lower)) return undefined;
  return LANGUAGE_MERGE[lower] ?? lower;
}

/**
 * 62 items carry more than one best-rank `P465` — e.g. Q12894641 (lilac) has
 * both `BF00FF` and `C8A2C8`. Sorting and taking the first makes the choice
 * depend on the data rather than on SPARQL result ordering, so re-syncing an
 * unchanged catalogue produces byte-identical output.
 */
export function pickHex(hexes: readonly string[]): string {
  return [...hexes].sort()[0]!;
}

export interface ColorItem {
  qid: string;
  hex: string;
  sitelinks: number;
  centroid: [number, number, number];
}

const qidNumber = (qid: string) => Number(qid.slice(1));

/**
 * Collapses the raw rows into one entry per item and orders them by salience.
 *
 * Ordering is what makes reverse lookup deterministic. 545 (language, label)
 * pairs are shared by two or more items — English "white" labels both Q23444
 * (183 sitelinks) and Q62391724 (0) — and `resolveColorOf` takes the first
 * match. Sitelink count is a reasonable proxy for the central sense of a name;
 * the QID tiebreak guarantees a total order.
 */
export function buildItems(rows: readonly RawItemRow[]): ColorItem[] {
  const hexes = new Map<string, string[]>();
  const sitelinks = new Map<string, number>();

  for (const row of rows) {
    const bucket = hexes.get(row.qid);
    if (bucket === undefined) hexes.set(row.qid, [row.hex]);
    else bucket.push(row.hex);
    sitelinks.set(row.qid, row.sitelinks);
  }

  const items: ColorItem[] = [];
  for (const [qid, values] of hexes) {
    const hex = pickHex(values);
    const [l, a, b] = Color.parse(`#${hex}`)!.to("oklab").coords;
    items.push({ qid, hex, sitelinks: sitelinks.get(qid) ?? 0, centroid: [l!, a!, b!] });
  }

  items.sort((x, y) => y.sitelinks - x.sitelinks || qidNumber(x.qid) - qidNumber(y.qid));
  return items;
}

/**
 * Buckets labels by shipping locale, one label per item.
 *
 * The `lang === target` guard implements base-tag-wins without needing two
 * passes or a stable row order: a base-tag row always overwrites, while a
 * variant row only fills a gap the base tag left.
 */
export function groupLabels(rows: readonly RawLabelRow[]): Map<string, Map<string, string>> {
  const byLang = new Map<string, Map<string, string>>();

  for (const row of rows) {
    const target = normalizeLanguage(row.lang);
    if (target === undefined) continue;

    let bucket = byLang.get(target);
    if (bucket === undefined) {
      bucket = new Map<string, string>();
      byLang.set(target, bucket);
    }
    if (!bucket.has(row.qid) || row.lang.toLowerCase() === target.toLowerCase()) {
      bucket.set(row.qid, row.value);
    }
  }

  return byLang;
}

/** Aliases are many-per-item, so they bucket into a list rather than a map. */
export function groupAliases(rows: readonly RawAliasRow[]): Map<string, { qid: string; value: string }[]> {
  const byLang = new Map<string, { qid: string; value: string }[]>();

  for (const row of rows) {
    const target = normalizeLanguage(row.lang);
    if (target === undefined) continue;
    const bucket = byLang.get(target);
    if (bucket === undefined) byLang.set(target, [{ qid: row.qid, value: row.value }]);
    else bucket.push({ qid: row.qid, value: row.value });
  }

  return byLang;
}

export function buildPaletteChunk(
  lang: string,
  items: readonly ColorItem[],
  labels: ReadonlyMap<string, string>,
  aliases: readonly { qid: string; value: string }[],
): PaletteChunk {
  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const indexByQid = new Map<string, number>();

  // `items` is already in salience order, so the emitted entries inherit it.
  for (const item of items) {
    const label = labels.get(item.qid);
    if (label === undefined) continue;

    const name = label.normalize("NFC");
    indexByQid.set(item.qid, terms.length);
    terms.push([name.toLowerCase(), name, item.centroid, null]);
    provenance.push([item.qid, item.hex]);
  }

  const aliasIndex: Record<string, number> = {};
  for (const alias of aliases) {
    const index = indexByQid.get(alias.qid);
    if (index === undefined) continue;
    const key = alias.value.normalize("NFC").toLowerCase();
    // First wins, and `items` order means "first" is the most-linked item.
    if (!(key in aliasIndex)) aliasIndex[key] = index;
  }

  return { lang, model: "palette", terms, provenance, aliases: aliasIndex };
}

/**
 * The fraction of the catalogue this language names. `itemCount` is passed in
 * rather than hardcoded so that a later sync which grows the catalogue
 * recomputes every figure consistently instead of drifting against a stale
 * constant.
 */
export function paletteCoverage(chunk: PaletteChunk, itemCount: number): LanguageCoverage {
  return {
    model: "palette",
    terms: chunk.terms.length,
    coverage: itemCount > 0 ? chunk.terms.length / itemCount : 0,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/scripts/wikidata/transform.test.ts`
Expected: PASS, 24 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/scripts/sync-wikidata/transform.ts packages/i18n/test/scripts/wikidata/transform.test.ts
git commit -m "feat(i18n): add wikidata transform with variant merging and salience ordering"
```

---

### Task 6: Scraper orchestration

**Files:**
- Create: `scripts/sync-wikidata/main.ts`
- Modify: `package.json` (add the `sync:wikidata` script)
- Test: `test/scripts/wikidata/main.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 4 and 5.
- Produces:
  - `interface SyncMeta { source: "wikidata"; retrievedAt: string; itemCount: number; languages: Record<string, LanguageCoverage> }`
  - `interface SyncOutput { chunks: Map<string, PaletteChunk>; meta: SyncMeta; multiHexItems: string[]; collisions: number }`
  - `buildOutput(itemRows: readonly RawItemRow[], labelRows: readonly RawLabelRow[], aliasRows: readonly RawAliasRow[], retrievedAt: string): SyncOutput`
    — takes **raw rows**, not grouped structures, so it can report `multiHexItems` (only visible before `buildItems` collapses duplicate rows) and so the whole pipeline is exercised by one call.
  - `renderChunkModule(chunk: PaletteChunk): string`
  - `renderManifest(locales: string[]): string`
  - `main(): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `test/scripts/wikidata/main.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseAliases, parseItems, parseLabels } from "../../../scripts/sync-wikidata/fetch";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/scripts/wikidata/main.test.ts`
Expected: FAIL — cannot resolve `../../../scripts/sync-wikidata/main`.

- [ ] **Step 3: Write `scripts/sync-wikidata/main.ts`**

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import type { LanguageCoverage, PaletteChunk } from "../../src/engine/types";
import {
  ALIASES_QUERY,
  ITEMS_QUERY,
  LABELS_QUERY,
  parseAliases,
  parseItems,
  parseLabels,
  runQuery,
  type RawAliasRow,
  type RawItemRow,
  type RawLabelRow,
} from "./fetch";
import {
  buildItems,
  buildPaletteChunk,
  groupAliases,
  groupLabels,
  paletteCoverage,
} from "./transform";

const DATA_DIR = new URL("../../src/data/wikidata/", import.meta.url);
const MANIFEST_PATH = new URL("../../src/sources/wikidata/chunks.ts", import.meta.url);

const ATTRIBUTION = [
  "// Generated by scripts/sync-wikidata. Do not edit by hand.",
  "//",
  "// Colour names derived from Wikidata (https://www.wikidata.org/), items whose",
  "// instance-of/subclass-of chain reaches Q1075 (colour) and which carry a P465",
  "// sRGB hex triplet.",
  "//",
  "// Wikidata content is released under CC0-1.0.",
];

export interface SyncMeta {
  source: "wikidata";
  retrievedAt: string;
  /** Catalogue size — the denominator every coverage figure is computed against. */
  itemCount: number;
  languages: Record<string, LanguageCoverage>;
}

export interface SyncOutput {
  chunks: Map<string, PaletteChunk>;
  meta: SyncMeta;
  /** Items that carried more than one best-rank hex, for the sync report. */
  multiHexItems: string[];
  /** Count of (locale, name) pairs claimed by more than one item. */
  collisions: number;
}

/**
 * Takes raw rows rather than grouped structures for two reasons: only the raw
 * rows still show which items carried more than one hex (`buildItems` collapses
 * them), and a single entry point means the sync report and the tests exercise
 * exactly the same pipeline.
 */
export function buildOutput(
  itemRows: readonly RawItemRow[],
  labelRows: readonly RawLabelRow[],
  aliasRows: readonly RawAliasRow[],
  retrievedAt: string,
): SyncOutput {
  const items = buildItems(itemRows);
  const labels = groupLabels(labelRows);
  const aliases = groupAliases(aliasRows);

  const hexesByQid = new Map<string, Set<string>>();
  for (const row of itemRows) {
    const bucket = hexesByQid.get(row.qid);
    if (bucket === undefined) hexesByQid.set(row.qid, new Set([row.hex]));
    else bucket.add(row.hex);
  }
  const multiHexItems = [...hexesByQid]
    .filter(([, values]) => values.size > 1)
    .map(([qid]) => qid)
    .sort();

  const chunks = new Map<string, PaletteChunk>();
  const languages: Record<string, LanguageCoverage> = {};
  let collisions = 0;

  for (const [lang, labelMap] of labels) {
    const chunk = buildPaletteChunk(lang, items, labelMap, aliases.get(lang) ?? []);
    // A locale whose every labelled item fell outside the catalogue would
    // produce a chunk that can answer nothing; don't ship one.
    if (chunk.terms.length === 0) continue;

    const seen = new Set<string>();
    for (const entry of chunk.terms) {
      if (seen.has(entry[0])) collisions++;
      else seen.add(entry[0]);
    }

    chunks.set(lang, chunk);
    languages[lang] = paletteCoverage(chunk, items.length);
  }

  return {
    chunks,
    meta: { source: "wikidata", retrievedAt, itemCount: items.length, languages },
    multiHexItems,
    collisions,
  };
}

export function renderChunkModule(chunk: PaletteChunk): string {
  return [...ATTRIBUTION, `export default ${JSON.stringify(chunk)};`, ""].join("\n");
}

export function renderManifest(locales: string[]): string {
  const entries = [...locales]
    .sort()
    .map(locale => (
      `  "${locale}": () => import("../../data/wikidata/${locale}.js") as unknown as Promise<{ default: Chunk }>,`
    ))
    .join("\n");

  return [
    ...ATTRIBUTION,
    "//",
    "// The chunk .js files below come from this same script's validated transform,",
    "// so asserting their shape here (rather than trusting allowJs inference, which",
    "// widens literal/tuple types) is honest and keeps the manifest type-checking.",
    "import type { Chunk, ChunkLoaders } from \"../../engine/types\";",
    "",
    "export const wikidataChunks: ChunkLoaders = {",
    entries,
    "};",
    "",
  ].join("\n");
}

export async function main(): Promise<void> {
  console.log("Querying Wikidata Query Service…");
  const [itemsJson, labelsJson, aliasesJson] = await Promise.all([
    runQuery(ITEMS_QUERY),
    runQuery(LABELS_QUERY),
    runQuery(ALIASES_QUERY),
  ]);

  const itemRows = parseItems(itemsJson);
  const labelRows = parseLabels(labelsJson);
  const aliasRows = parseAliases(aliasesJson);
  console.log(`  ${itemRows.length} item rows, ${labelRows.length} labels, ${aliasRows.length} aliases`);

  const output = buildOutput(itemRows, labelRows, aliasRows, new Date().toISOString());

  // Render everything into memory before touching disk, so a rendering failure
  // cannot leave DATA_DIR half-deleted while the manifest still references it.
  const chunkSources = new Map<string, string>();
  for (const [lang, chunk] of output.chunks) chunkSources.set(lang, renderChunkModule(chunk));
  const manifestSource = renderManifest([...output.chunks.keys()]);
  const metaSource = `${JSON.stringify(output.meta, null, 2)}\n`;

  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(new URL("../../src/sources/wikidata/", import.meta.url), { recursive: true });

  let total = 0;
  for (const [lang, source] of chunkSources) {
    await writeFile(new URL(`${lang}.js`, DATA_DIR), source, "utf8");
    total += Buffer.byteLength(source, "utf8");
  }
  await writeFile(new URL("meta.json", DATA_DIR), metaSource, "utf8");
  await writeFile(MANIFEST_PATH, manifestSource, "utf8");

  const ranked = [...output.chunks.entries()].sort((a, b) => b[1].terms.length - a[1].terms.length);
  console.log(`\nWrote ${ranked.length} chunks, ${(total / 1024).toFixed(0)} KB total.`);
  console.log("Largest:");
  for (const [lang, chunk] of ranked.slice(0, 12)) {
    const coverage = output.meta.languages[lang]!.coverage;
    console.log(`  ${lang.padEnd(8)} ${String(chunk.terms.length).padStart(4)} terms  ${(coverage * 100).toFixed(1)}%`);
  }

  console.log(`\nCatalogue: ${output.meta.itemCount} items`);
  console.log(`Items with multiple hex values (lowest sorted value kept): ${output.multiHexItems.length}`);
  console.log(`Name collisions resolved by sitelink ranking: ${output.collisions}`);
  console.log(`Retrieved at: ${output.meta.retrievedAt}`);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/scripts/wikidata/main.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Add the sync script to `package.json`**

In `packages/i18n/package.json`, after the `"sync:uwdata"` line in `"scripts"`:

```json
    "sync:wikidata": "bun run scripts/sync-wikidata/main.ts"
```

Remember the trailing comma on the preceding line.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/scripts/sync-wikidata/main.ts packages/i18n/test/scripts/wikidata/main.test.ts packages/i18n/package.json
git commit -m "feat(i18n): add wikidata sync orchestration and chunk rendering"
```

---

### Task 7: Run the sync, register the source, document it

The first task that touches the network for real. Everything before it is testable offline.

**Files:**
- Create: `src/sources/wikidata/source.ts`
- Generated: `src/data/wikidata/*.js`, `src/data/wikidata/meta.json`, `src/sources/wikidata/chunks.ts`
- Modify: `src/index.ts`
- Modify: `README.md`
- Test: `test/data.test.ts` (append)

**Interfaces:**
- Consumes: `main()` from Task 6; `NameSource` from Task 2.
- Produces: `wikidataSource: NameSource`, registered under the id `"wikidata"`.

- [ ] **Step 1: Run the sync**

```bash
cd packages/i18n && bun run sync:wikidata
```

Expected, within a small drift from live Wikidata: ~1,049 item rows, ~10,799 labels, ~6,163 aliases; **299 chunks**; catalogue **964 items**; **62** multi-hex items; **545** collisions. `en` ≈ 897 terms at ≈ 93% coverage.

If the counts differ by more than ~5%, stop and report before continuing — upstream changed, and the spec's numbers need revisiting rather than silent acceptance.

- [ ] **Step 2: Write `src/sources/wikidata/source.ts`**

```ts
import type { NameSource } from "../../engine/types";
import meta from "../../data/wikidata/meta.json";

/** Catalogue size the shipped coverage figures were computed against. */
export const WIKIDATA_ITEM_COUNT = meta.itemCount;

export const wikidataSource: NameSource = {
  id: "wikidata",
  title: "Wikidata",
  url: "https://www.wikidata.org/",
  retrievedAt: meta.retrievedAt,
  license: "CC0-1.0",
  citation:
    "Wikidata contributors. Wikidata, the free knowledge base. "
    + "https://www.wikidata.org/ — content available under CC0 1.0.",
  disclaimer:
    "Names are editorial labels contributed by Wikidata editors, not measured "
    + "naming behaviour. Coverage is uneven across languages, and a name's "
    + "presence does not imply it is the term speakers would actually choose.",
  languages: meta.languages as NameSource["languages"],
};
```

- [ ] **Step 3: Register it in `src/index.ts`**

Add beside the uwdata imports and registration:

```ts
import { wikidataSource } from "./sources/wikidata/source";
import { wikidataChunks } from "./sources/wikidata/chunks";

registerSource(wikidataSource, wikidataChunks);
```

- [ ] **Step 4: Write the failing integrity test**

Append to `test/data.test.ts`:

```ts
describe("wikidata data integrity", () => {
  it("registers the source with CC0 licensing", () => {
    const source = getSource("wikidata");
    expect(source.license).toBe("CC0-1.0");
    expect(source.retrievedAt).toBeTruthy();
  });

  it("ships a chunk for every language in the descriptor", async () => {
    const source = getSource("wikidata");
    for (const locale of Object.keys(source.languages)) {
      const chunk = await loadChunk("wikidata", locale);
      expect(chunk.model).toBe("palette");
      expect(chunk.lang).toBe(locale);
    }
  });

  it("keeps terms, provenance, and centroids consistent", async () => {
    const chunk = await loadChunk("wikidata", "en");
    if (chunk.model !== "palette") throw new Error("expected a palette chunk");

    expect(chunk.terms.length).toBe(chunk.provenance.length);
    for (const [index, entry] of chunk.terms.entries()) {
      const [term, name, centroid, pCT] = entry;
      expect(term).toBe(term.normalize("NFC"));
      expect(name).toBe(name.normalize("NFC"));
      expect(pCT).toBeNull();
      expect(centroid).not.toBeNull();
      expect(centroid!.every(Number.isFinite)).toBe(true);
      expect(chunk.provenance[index]![0]).toMatch(/^Q[1-9][0-9]*$/);
      expect(chunk.provenance[index]![1]).toMatch(/^[0-9a-fA-F]{6}$/);
    }
  });

  it("points every alias at a real term index", async () => {
    const chunk = await loadChunk("wikidata", "en");
    if (chunk.model !== "palette") throw new Error("expected a palette chunk");
    for (const [alias, index] of Object.entries(chunk.aliases)) {
      expect(alias).toBe(alias.normalize("NFC").toLowerCase());
      expect(chunk.terms[index]).toBeDefined();
    }
  });

  it("names yellow in languages uwdata has no data for", async () => {
    const georgian = await ColorNames.load("ka", { source: "wikidata" });
    expect(georgian.colorOf("ყვითელი")).toBeDefined();

    const english = await ColorNames.load("en", { source: "wikidata" });
    expect(english.of(Color.parse("#FFFF00")!)).toBe("yellow");
  });

  it("keeps the two sources independent", () => {
    const ids = listSources().map(source => source.id).sort();
    expect(ids).toEqual(["uwdata", "wikidata"]);
  });
});
```

Ensure `test/data.test.ts` imports `getSource`, `listSources`, `loadChunk`, `ColorNames`, and `Color` — add to the existing import statements as needed.

- [ ] **Step 5: Run the tests**

Run: `cd packages/i18n && bun test`
Expected: PASS, all suites.

- [ ] **Step 6: Verify the build and lint**

```bash
cd packages/i18n && bun run build
cd /Users/grandmagus/Documents/Projects/urcolor && bun run lint
```

Expected: both clean. `bun run build` must emit `dist/` chunks for the new data without error.

- [ ] **Step 7: Update `README.md`**

Rewrite the `## Coverage` opening line to name both sources, and add a `### wikidata` subsection after the existing uwdata coverage prose:

```markdown
### wikidata

The `wikidata` source covers **299 languages** with a discrete-palette model:
964 catalogued colours, each with one exact sRGB value, named in whatever
languages Wikidata editors have supplied. This is where the long tail lives —
Georgian, Cherokee, Aymara, Amharic, and Aramaic have colour names here and
none in `uwdata`.

It answers a different question from `uwdata`. Where `uwdata` models how
speakers *spontaneously name* a region of colour space, `wikidata` records the
*established name of a catalogued colour*. There is no sampled distribution, so
`resolve()` reports `probability` as a **proximity confidence, not a naming
frequency** — read `binDistance` for the underlying Oklab distance.

Coverage is `terms / 964`: `en` 93%, `de` 50%, `ja` 28%, `ka` 0.3%. Thin
languages are shipped rather than pruned — a three-term Georgian chunk cannot
name an arbitrary colour, but it resolves `colorOf("ყვითელი")` correctly.

Wikidata is **CC0-1.0**, so the licensing caveat above does not apply to this
source.
```

Also update the `## Adding a source` section's closing line if it claims only one source exists.

- [ ] **Step 8: Run the full test suite one more time**

Run: `cd /Users/grandmagus/Documents/Projects/urcolor && bun test && bun run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/i18n/src packages/i18n/test/data.test.ts packages/i18n/README.md
git commit -m "feat(i18n): ship wikidata colour-name source across 299 languages"
```

---

## Verification

After Task 7, this must all hold:

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
bun test          # every suite passes
bun run lint      # eslint + vue-tsc clean
cd packages/i18n && bun run build   # dist/ emits
```

And this must work from a consumer's point of view:

```ts
import { Color } from "@urcolor/core";
import { ColorNames, listSources } from "@urcolor/i18n";

listSources().map(s => s.id);                        // ["uwdata", "wikidata"]

const ka = await ColorNames.load("ka", { source: "wikidata" });
ka.colorOf("ყვითელი");                                // Color for #FFFF00

const en = await ColorNames.load("en", { source: "wikidata" });
en.of(Color.parse("#FFFF00")!);                      // "yellow"
en.resolveColorOf("color yellow")?.term;             // "yellow"
en.resolvedOptions().model;                          // "palette"
```
