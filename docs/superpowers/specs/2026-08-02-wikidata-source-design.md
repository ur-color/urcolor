# `wikidata` — A Second Colour-Name Source for `@urcolor/i18n`

**Date:** 2026-08-02
**Status:** Approved design, not yet implemented

## Purpose

Add Wikidata as a second, independently namespaced colour-name source alongside
`uwdata`.

The two sources answer different questions and are deliberately never merged.
`uwdata` answers *"what do speakers of this language spontaneously call this
colour?"* — probabilistic, perceptual, 20 languages. `wikidata` answers *"what
is the established name of this catalogued colour in this language?"* —
categorical, editorial, 300 languages.

Wikidata's value here is **breadth**. `uwdata` has no Georgian, Cherokee,
Aymara, Amharic, or Aramaic; Wikidata does. Its weakness is the mirror image:
it has no distribution to sample, only discrete named points.

## Upstream shape

Each colour is a Wikidata item — e.g. [Q943 (yellow)](https://www.wikidata.org/wiki/Q943) —
carrying:

- **labels**: one preferred name per language (Q943 has 240)
- **aliases** (`skos:altLabel`): alternative names, e.g. English `"yellow color"`,
  `"color yellow"`; Arabic `"اللون الأصفر"`, `"الأصفر"`, `"اصفر"`
- **`P465`**: sRGB hex triplet, e.g. `FFFF00`

### Item selection

```sparql
SELECT DISTINCT ?item ?hex WHERE { ?item wdt:P31/wdt:P279* wd:Q1075 ; wdt:P465 ?hex }
```

**`SELECT DISTINCT` is mandatory, not stylistic.** The property path
`wdt:P31/wdt:P279*` can reach Q1075 by more than one route, and SPARQL returns
one solution per route. Without `DISTINCT` the item query returns 1,124 rows for
964 items and the label query inflates from 10,799 to 14,705 — every downstream
count, and any naive `.push()` into a term table, silently duplicates.

An item counts as a colour when its `instance of` / `subclass of` chain reaches
**Q1075 (colour)** *and* it carries an sRGB hex. This is the load-bearing
filter: 14,286 Wikidata items carry `P465`, but the overwhelming majority are
flags, sports clubs, political parties, and taxa that merely *have* a colour.
Including them would let nearest-centroid lookup return a football club as a
colour name.

### Measured volume (recon, 2026-08-02)

| Quantity | Count |
| --- | --- |
| Items matching the filter | 964 |
| `rdfs:label` triples | 10,799 |
| `skos:altLabel` triples | 6,163 |
| Distinct language codes | 315 |
| Items with >1 best-rank hex | 62 |
| Malformed hex values | 0 |
| Labels missing `xml:lang` | 0 |
| `(language, label)` pairs shared by 2+ items | 545 |

## Fetch strategy

Three **separate** SPARQL queries against `https://query.wikidata.org/sparql`.

Splitting is not stylistic. The obvious single query, joining labels and
aliases in one `SELECT`, cross-products them into **29.5 MB over 117 s** — close
enough to the WDQS timeout to be a liability. Split, the same data costs ~30 s:

| Query | Projection | Rows | Size | Time |
| --- | --- | --- | --- | --- |
| items | `?item ?hex ?sitelinks` | 1,049 | 362 KB | ~1 s |
| labels | `?item ?label` | 10,799 | 2.5 MB | ~24 s |
| aliases | `?item ?alias` | 6,163 | 1.4 MB | ~3 s |

(1,049 item rows for 964 items because 62 items carry more than one hex.)

`?sitelinks` (`wikibase:sitelinks`) is fetched solely to break label collisions
deterministically — see below.

**Retry with exponential backoff on 429 and 5xx.** A transient `502` occurred
during recon on a query that succeeded on the immediate retry. WDQS also rate
limits; a bare fetch is not sufficient.

A descriptive `User-Agent` identifying the project is required by WDQS policy.

## Data policies

Each of these resolves a real ambiguity in the upstream data. All are applied
in `transform.ts` and all are reported by `main.ts`.

### Language variant merging

Wikidata ships regional and orthographic variants as independent label sets,
usually far thinner than their base tag. Left alone this is a footgun:
`negotiateLocale` prefers an exact tag match, so a shipped 6-term `en-gb` chunk
would make `ColorNames.load("en-GB")` resolve to it instead of falling through
to the 897-term `en` chunk — the same language, 150× less data.

**Region-only variants merge into their base tag. On conflict, the base tag's
label wins.**

| Upstream | Ships as |
| --- | --- |
| `en-gb`, `en-ca`, `en-us` | `en` |
| `de-at`, `de-ch` | `de` |
| `pt-br` | `pt` |
| `crh-ro` | `crh` |
| `pap-aw` | `pap` |

**Script variants stay distinct**, renamed to well-formed BCP 47 script subtags
so `negotiateLocale`'s subtag-stripping behaves:

| Upstream | Ships as |
| --- | --- |
| `sr-ec` / `sr-el` | `sr-Cyrl` / `sr-Latn` |
| `tt-cyrl` / `tt-latn` | `tt-Cyrl` / `tt-Latn` |
| `aeb-arab` / `aeb-latn` | `aeb-Arab` / `aeb-Latn` |
| `isv-cyrl` / `isv-latn` | `isv-Cyrl` / `isv-Latn` |
| `ku-latn` | `ku-Latn` |
| `ms-arab` | `ms-Arab` |
| `shy-latn` | `shy-Latn` |

**Chinese** is handled as script, not region, because that is what the regional
tags actually encode: `zh-cn`, `zh-sg`, `zh-my`, `zh-hans` → **`zh`** (bare `zh`
on Wikidata is Simplified in practice, and this matches the existing `uwdata`
`zh` chunk); `zh-tw`, `zh-hk`, `zh-mo`, `zh-hant` → **`zh-Hant`**. A request for
`zh-Hans` negotiates down to `zh` correctly.

`be-tarask` and `map-bms` ship verbatim — `tarask` is a registered BCP 47
variant subtag, and `map-bms` (Banyumasan) has no ISO 639-1/3 alternative.

### Excluded pseudo-languages

`mul` (multiple languages) and `zxx` (no linguistic content) are dropped. They
are metadata tags, not languages, and would produce a chunk no locale can
legitimately negotiate to. `mul` is present in the current data (3 labels);
`zxx` is not, and is excluded defensively.

### Multiple hex values

62 items carry more than one best-rank `P465` — e.g. **Q12894641** (lilac) has
both `BF00FF` and `C8A2C8`. **Sort the hex strings and take the first**
(`BF00FF` here), so the choice is deterministic across syncs rather than
dependent on SPARQL result ordering. `main.ts` reports the affected count; a
large jump in a future sync is a signal to revisit.

### Label collisions

545 `(language, label)` pairs are shared by two or more items — two distinct
catalogued colours with the same name in one language.

That 545 counts **raw** upstream pairs: original language tags, case-sensitive.
The sync reports a different, larger number — **578** — because it counts what
actually ships: term keys within a *merged* locale, NFC-normalised and
lowercased. Merging `en-us` into `en` can create a collision that neither tag
had alone, and lowercasing collapses `White`/`white` into one key. Both figures
are correct for their own definition; 578 is the one the sync prints, and the
one to compare future syncs against.

**Both items stay in the palette.** They have different hexes and are genuinely
different colours; dropping either would lose a centroid that forward lookup
needs. The collision only affects reverse lookup, where
`ColorNames.resolveColorOf()` takes the first match.

To make "first" meaningful rather than arbitrary, **entries are ordered by
sitelink count descending, then by numeric QID ascending.** Sitelink count is a
reasonable proxy for which sense of the name is the central one; the QID
tiebreak guarantees total ordering.

The worked example, from live data: English `"white"` is the label of both
**Q23444** (183 sitelinks) and **Q62391724** (0 sitelinks). Sitelink ordering
picks Q23444 — the colour white — over an obscure homonym, which is exactly the
behaviour wanted.

### Normalisation

Every term, name, and alias is normalised to **NFC** at generation time, matching
the existing `uwdata` policy and `resolveColorOf`'s input normalisation.

## Engine changes

### `src/engine/types.ts`

`LanguageCoverage["model"]` and `ResolvedColorNamesOptions["model"]` widen from
`"full" | "hue"` to `"full" | "hue" | "palette"`. `Chunk` gains a third member.

```ts
/**
 * Discrete named colours, each with one exact sRGB value. No bins and no
 * sampled distribution — unlike the full and hue models, this source
 * catalogues named points rather than modelling how speakers name a space.
 */
export interface PaletteChunk {
  lang: string;
  model: "palette";
  /**
   * One entry per (item, label in this language). `centroid` is always
   * present — an item without a hex is filtered out upstream. `pCT` is
   * always `null`: the source carries no such signal.
   */
  terms: TermEntry[];
  /** Parallel to `terms`: `[qid, hex]` provenance for each entry. */
  provenance: [qid: string, hex: string][];
  /** NFC-normalised alias -> index into `terms`. Reverse lookup only. */
  aliases: Record<string, number>;
}
```

`NameSource` gains an optional `retrievedAt: string`. Wikidata has no commit SHA
to pin, so the reproducibility anchor is the query date plus the item count.

### `src/engine/lookup-palette.ts` (new)

Returns the existing `BinMatch`, so `ColorNames.resolve()` stays uniform.

```ts
lookupPalette(chunk: PaletteChunk, oklab: [number, number, number], options: LookupOptions): BinMatch
```

Brute-force Oklab distance across every centroid (≤897 for the largest chunk —
a few microseconds), sorted ascending, sliced to `topN`.

`coverage` is:

- `"exact"` when the nearest distance is ≤ `1e-6` — the query *is* a catalogued
  colour, which for this source is the meaningful sense of "exact"
- `"nearest"` when within `maxDistance`
- `"none"` otherwise

`binDistance` carries the true Oklab distance to the nearest centroid. The field
name is bin-centric, but its documented contract — "distance from the query to
the centre of what was actually used" — holds unchanged.

#### `Candidate.probability`

The palette model has no sampled frequency, so there is no honest probability to
report. Rather than fabricate one or make the field optional (a breaking change
for `full`/`hue` consumers), palette reports

```
probability = clamp(1 - distance / maxDistance, 0, 1)
```

documented in both the type and the README as **a proximity confidence, not a
naming frequency**. It is monotonic in distance, bounded, trivially explainable,
and `resolve()` always exposes the raw `binDistance` alongside it, so a caller
who needs the truth is never forced through the derived number.

When `maxDistance <= 0` the division is undefined; in that case only an exact
hit can match at all, and it reports `probability: 1`.

### `src/color-names.ts`

A third branch in `resolve()`. `resolveColorOf()` additionally consults
`chunk.aliases` for palette chunks, so `colorOf("color yellow")` and
`colorOf("اللون الأصفر")` resolve.

## Scraper: `scripts/sync-wikidata/`

Mirrors `scripts/sync-uwdata/` file for file, including its validation posture:
every upstream field is checked, and drift throws `SchemaError` rather than
producing quietly wrong data.

| File | Responsibility |
| --- | --- |
| `fetch.ts` | SPARQL client (UA header, retry/backoff), the three queries, strict result validators, `SchemaError` |
| `transform.ts` | Variant merge table, exclusions, hex→Oklab, collision ordering, `buildPaletteChunk`, `paletteCoverage` |
| `main.ts` | Orchestration, chunk/manifest/meta rendering, disk writes, sync report |

`main.ts` follows the existing render-everything-into-memory-before-touching-disk
discipline, so a rendering failure cannot leave `src/data/wikidata/` half-deleted
while the manifest still references it.

`package.json` gains `"sync:wikidata": "bun run scripts/sync-wikidata/main.ts"`.

### Sync report

Beyond per-chunk sizes, `main.ts` prints: items fetched, items with multiple
hexes, label collisions resolved, languages dropped by exclusion, and variant
tags merged into each base. These are the numbers that reveal upstream drift
between syncs.

## Output

**298 chunks, 10,428 entries** after merging and excluding `mul`. (`simple`,
Simple English Wikipedia's MediaWiki code rather than a language, also merges
into `en` — its sole term duplicated one `en` already had, so the merge cost
one chunk and one entry, both accounted for above.)

| Locale | Terms | | Locale | Terms |
| --- | --- | --- | --- | --- |
| `en` | 897 | | `ja` | 273 |
| `de` | 480 | | `id` | 253 |
| `it` | 468 | | `zh` | 221 |
| `es` | 452 | | `ru` | 200 |
| `fr` | 438 | | `ar` | 199 |
| `nl` | 370 | | `sl` | 182 |

248 chunks have ≥3 terms, 159 have ≥10, 68 have ≥25 — confirmed against the
generated `meta.json`. The tail reaches all the way down to single-term chunks
(`ady`, `av`, `chy`, `dag`, `din`, `dua`, `bdr`, `aeb-Latn`).

**Every language with ≥1 term ships.** A 14-term Georgian chunk cannot name an
arbitrary colour, but it answers `colorOf("ყვითელი")` correctly — which is
exactly the capability `uwdata` lacks and this source exists to add. `coverage`
tells the caller how thin it is.

`coverage` for a palette chunk is `terms / itemCount` — the fraction of
catalogued colours this language names. Measured against the generated
`meta.json`: `en` 0.9305 (897 terms), `de` 0.4979, `ja` 0.2832, `ka` 0.0145
(14 terms), `chr` 0.0041 (4 terms). The thinnest locales carry a single term.

`itemCount` is **not** a hardcoded 964. It is whatever the sync actually fetched,
recorded in `meta.json` so a later sync that grows the catalogue recomputes every
coverage figure consistently instead of silently drifting against a stale
constant.

Generated artefacts: `src/data/wikidata/<locale>.js` (298 files, lazily imported)
plus `meta.json`, and the generated manifest `src/sources/wikidata/chunks.ts`.

## Registration and docs

`src/sources/wikidata/source.ts` exports the `NameSource` descriptor;
`src/index.ts` registers it alongside `uwdata`. No changes to lookup dispatch
beyond the new branch — the source-registry design already anticipated this.

Licensing is materially better than `uwdata`'s. Wikidata is **CC0-1.0**, so the
README's "make your own assessment before redistributing" caveat does not apply
to this source. The README's source section, coverage section, and the
package-level docs are updated accordingly.

## Testing

| Test | Covers |
| --- | --- |
| `test/scripts/wikidata/fetch.test.ts` | Result validators against fixtures; schema drift throws; retry logic |
| `test/scripts/wikidata/transform.test.ts` | Variant merge (incl. base-tag-wins), exclusions, multi-hex determinism, collision ordering, hex→Oklab, coverage |
| `test/scripts/wikidata/main.test.ts` | Chunk/manifest/meta rendering |
| `test/engine/lookup-palette.test.ts` | Exact hit, nearest within/outside `maxDistance`, `topN`, empty chunk, probability derivation |
| `test/color-names.test.ts` | Palette branch in `resolve()`, alias reverse lookup, `resolvedOptions().model === "palette"` |
| `test/data.test.ts` | Shipped chunk integrity: NFC, valid centroids, manifest/data agreement |

Fixtures are trimmed real SPARQL responses, not invented shapes — including one
multi-hex item and one collision pair, so the policies above are tested against
the data that motivated them.

The existing uwdata script tests sit unqualified at `test/scripts/{fetch,
transform,main}.test.ts`. Adding a second source makes that ambiguous, so they
move to `test/scripts/uwdata/` in the same change — a pure rename, mirroring
`scripts/sync-<source>/`.

## Explicitly out of scope

- Merging or cross-referencing `uwdata` and `wikidata` results. Sources stay
  namespaced; `source` remains a required option.
- Wikidata properties beyond `P465` (CMYK `P4131`, RAL, Pantone, colour
  coordinates). Nothing in the current API consumes them.
- A curated basic-colour-term subset. The full 964-item catalogue is shipped;
  callers who want only basics can filter on `coverage` or by candidate distance.
