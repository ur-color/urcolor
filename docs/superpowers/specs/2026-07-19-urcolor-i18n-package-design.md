# `@urcolor/i18n` — Multilingual Color Naming

**Date:** 2026-07-19
**Status:** Approved design, not yet implemented

## Purpose

A localization package for urcolor covering two concerns:

1. **Color-name translations** — given a color and a language, return the term speakers of that language use for it, with probabilities. Data-driven, sourced from human colour-perception studies.
2. **Channel labels** — the hand-authored "Hue"/"Saturation"/"Lightness" strings for 77 languages, moved out of `@urcolor/core`.

The package powers a colour-naming tool and is designed so additional naming datasets can be added later without conflicting with the first one.

## Primary data source: uwdata

`https://github.com/uwdata/color-naming-in-different-languages`

Crowdsourced colour-naming judgements collected via LabInTheWild, processed into probabilistic naming models. Backing paper: Kim, Thayer, Gorsky & Heer (2019), *Color Names Across Languages: Salient Colors and Term Translation in Multilingual Color Naming Models*, EuroVis.

### What we consume

| Upstream file | Use |
| --- | --- |
| `model/binned_full_colors/full_color_names_binned_0.05.json` | Full-space model, 14 languages |
| `model/binned_hue_colors/hue_color_names_binned_72.json` | Hue-line model, remaining languages |
| `model/color_info_by_lang/basic_colors_info_<iso>.csv` | Term display names, Oklab centroids (reverse lookup) |
| `model/lang_info.csv` | Language codes and display names |

Colours are keyed by **Oklab** bins. `pTC` = P(term \| colour bin); `pCT` = P(colour bin \| term).

### Coverage

- **Full-space model, 14 languages:** `de en es fa fi fr ko nl pl pt ro ru sv zh`.
- **Hue-only model, 27 further languages:** the remainder of the 41 with modelled terms — `ar bg ca cs da el et he hi hr hu id it ja ka lt mk ms nb sk sl sr th tr uk ur vi`.

Sample volume is heavily skewed — English has ~150k full-colour judgements, Romanian ~243. The API reports coverage rather than hiding it.

### Upstream hazards

- **No license.** No `LICENSE` file; the GitHub API reports `license: null`. The README requests citation only. See *Licensing gate* below.
- **No versioning of current data.** The only tags point at the 2019 paper snapshot; modern data lands as rolling commits to `master` (last: `f0d3e30`, 2026-05-21). We pin a commit SHA.
- **Schema drift is real.** March 2026 commits added `lowRes/medRes/highRes` blur columns and removed `rank`. The sync script validates schema and fails loudly.
- **Same column names, different colour spaces.** `hue_colors_info.csv` uses CIELAB for `avgL/A/B`; `full_colors_info.csv` and `basic_colors_info*.csv` use Oklab (L in 0–1). Encode this in the transform, not in reader assumptions.
- **Maintainers' disclaimer** (from `model/README.md`), which we surface in our own README and in the source descriptor:

  > We represent the color labels provided by the participants in our study, which may include misspellings, but also whatever racial biases they have (e.g., the color 'skin'). This is not meant to be a prescriptive definition of what colors fit what labels.

## Package structure

```
packages/i18n/
  src/
    index.ts              # public API
    color-names.ts        # ColorNames class (Intl.DisplayNames-shaped)
    channel-names.ts      # ChannelNames class
    engine/
      lookup-full.ts      # Oklab-cube bin resolution, nearest-bin search
      lookup-hue.ts       # hue-circle projection and bin resolution
      locale.ts           # BCP 47 negotiation, supportedLocalesOf
      registry.ts         # source registry, chunk cache, result tagging
      types.ts
    channels/             # moved verbatim from packages/core/src/i18n (77 langs)
      en.ts … index.ts
    sources/
      uwdata/
        source.ts         # descriptor: id, license, citation, coverage
        chunks.ts         # generated lazy-import manifest
    data/uwdata/          # generated, committed to git
      meta.json
      <locale>.js         # one ES module per language, 41 total
  scripts/sync-uwdata/
    fetch.ts              # download + schema validation
    transform.ts          # upstream records -> chunks
    main.ts               # CLI: fetch -> transform -> write -> report
```

Each unit has one job: the lookup engines know about Oklab bins and probability distributions but nothing about uwdata; `sources/uwdata` knows about the upstream schema but nothing about lookup; `channels/` is static data with no dependencies.

### Dependency direction

The engine needs `Color` and Oklab conversion from `@urcolor/core`, so `@urcolor/i18n` depends on `@urcolor/core`. Core therefore **cannot** re-export from this package.

Consequence: **core drops `src/i18n/` outright.** This is a breaking change (`chore!:`), consistent with the pre-1.0 cleanup already underway on `release/v1`. Consumers migrate:

```diff
- import { getChannelLabel } from "@urcolor/core";
- getChannelLabel("Hue", locale);
+ import { ChannelNames } from "@urcolor/i18n";
+ new ChannelNames(locale).of("hue");
```

`packages/vue` and `packages/react` are updated in the same change, along with any docs references.

## Source registry

Every naming dataset is namespaced and self-describing. Results are always tagged with their source. There is no implicit merging, ranking, or fallback between sources — different datasets use different methodologies (crowdsourced perception vs. curated lists), so blending them would produce answers no source actually supports.

```ts
interface NameSource {
  id: string;                 // "uwdata"
  title: string;
  url: string;
  commitSha?: string;         // pinned upstream revision
  license: string;
  citation: string;
  disclaimer?: string;
  languages: Record<string, {
    model: "full" | "hue";
    terms: number;
    coverage: number;         // fraction of the colour space with data
  }>;
}
```

`ColorNames` requires an explicit `source` option. Adding a source (xkcd, CSS keywords, Pantone) means a new directory under `sources/` and `data/` — no changes to the engine.

## Public API

The API is modelled on the ECMAScript `Intl` classes so that multilingual colour naming reads like a native platform capability. `ColorNames` is shaped after `Intl.DisplayNames`: same constructor signature, same `of()`, same `resolvedOptions()`, same static `supportedLocalesOf()`.

```ts
import { ColorNames, ChannelNames } from "@urcolor/i18n";
import { Color } from "@urcolor/core";

const names = await ColorNames.load("ko", { source: "uwdata" });

names.of(Color.parse("#3b82f6")!);   // "파란색" | undefined
names.colorOf("파랑");                // Color | undefined
names.resolve(color);                // full record — see below
names.resolvedOptions();
// { locale: "ko", source: "uwdata", model: "full", style: "long",
//   fallback: "nearest", binSize: 0.05, coverage: 0.71 }

ColorNames.supportedLocalesOf(["ko-KR", "xh"], { source: "uwdata" });  // ["ko-KR"]
```

### Construction and loading

`Intl` constructors are synchronous, but language data here is a lazily loaded chunk. Both paths exist:

- `await ColorNames.load(locales, options)` — resolves the locale, loads its chunk, returns an instance. The primary path.
- `new ColorNames(locales, options)` — synchronous, valid once the chunk is loaded by a prior `load()`. Throws if the data is absent, naming the loader. No silent async.

Loading is cached and idempotent.

### Options

Option vocabulary follows `Intl` conventions.

| Option | Values | Default | Meaning |
| --- | --- | --- | --- |
| `source` | source id | *required* | Which dataset answers. No default — provenance is never implicit. |
| `style` | `"long"` \| `"short"` | `"long"` | `commonName` ("파란색") vs `simplifiedName` ("파랑"). |
| `fallback` | `"nearest"` \| `"none"` | `"nearest"` | Mirrors `Intl.DisplayNames`. `"none"` makes `of()` return `undefined` on any bin miss. |
| `maxDistance` | number | `0.075` | Oklab search radius when `fallback: "nearest"`. |
| `topN` | number | `5` | Candidate count returned by `resolve()`. |

### Locale negotiation

Accepts a string or an array, resolved by BCP 47 lookup with fallback: `"ko-KR"` → `"ko"`, `"zh-Hans"` → `"zh"`. `resolvedOptions().locale` reports the tag actually matched. `supportedLocalesOf()` filters a requested list against the source's coverage, as in `Intl`.

### `resolve()` — the probability escape hatch

`Intl` has no analogue for probabilistic results, so richer data lives on a separate method rather than distorting `of()`.

```ts
names.resolve(Color.parse("#3b82f6")!);
// {
//   name: "파란색",         // per `style`
//   term: "파랑",           // simplifiedName — matching key
//   probability: 0.61,      // pTC of the winning term in this bin
//   candidates: [{ name, term, probability }, …],   // sorted desc, topN
//   model: "full",
//   source: "uwdata",
//   coverage: "exact",      // "exact" | "nearest" | "none"
//   binDistance: 0,         // Oklab distance to the bin actually used
// }
```

`of()` is `resolve(color).name`, or `undefined` when `coverage` is `"none"` — or when coverage is `"nearest"` and `fallback` is `"none"`.

### Resolution

1. Convert the colour to Oklab.
2. Quantize to the source's bin size (0.05 for the uwdata full model).
3. **Exact hit** → return the bin's distribution, `coverage: "exact"`.
4. **Miss** → search neighbouring bins outward up to `maxDistance` (default `0.075`, roughly 1.5 bins). Return the nearest populated bin with `coverage: "nearest"` and the actual `binDistance`.
5. **Still nothing** → `coverage: "none"`, `name: null`, `candidates: []`.

The engine never fabricates a name. Sparse languages return `"none"` often; that is the correct answer, and it is why coverage is part of the return value rather than a thrown error.

### Hue model

Hue-only languages are valid only for saturated colours. The engine projects the input onto the hue circle and returns `model: "hue"` plus `hueProjectionDistance`. Greys and pastels — far from the hue line — return `coverage: "none"`.

### Reverse lookup

```ts
names.colorOf("파랑");         // Color (Oklab centroid) | undefined
names.resolveColorOf("파랑");  // { color, term, name, pCT: 0.34 } | undefined
```

Matches `simplifiedName` first, then `commonName`.

### Introspection

`listSources()`, `getSource("uwdata")` return source descriptors including license, citation, and disclaimer, so a naming UI can render attribution without hardcoding it. Per-instance coverage is on `resolvedOptions()`.

### Channel labels

`ChannelNames` takes the same shape, and is the closest direct analogue of `Intl.DisplayNames`:

```ts
const channels = new ChannelNames("ko");
channels.of("hue");            // "색상"
channels.resolvedOptions();    // { locale: "ko" }
ChannelNames.supportedLocalesOf(["ko", "xh"]);
```

Synchronous, no loading, no `source` — the strings are hand-authored, not derived from a dataset. 77 locales, moved from core unchanged.

## Data delivery

Per-language lazy chunks. The engine index stays around 6 KB; a language loads on demand.

Chunk format: a term string-table plus flat index arrays, gzip-friendly.

```jsonc
{
  "lang": "ko",
  "model": "full",
  "binSize": 0.05,
  "terms": [{ "term": "파랑", "name": "파란색", "centroid": [0.52, -0.04, -0.17] }],
  "bins": { /* packed bin key -> [termIndex, pTC] pairs */ }
}
```

Estimated shipped sizes: `en` ~280 KB, `ko` ~90 KB, hue-model languages ~10–25 KB each.

Chunks are generated as ES modules under `src/data/uwdata/`, reached through a generated static lazy-import manifest (`locale -> () => import(...)`). A static import map is what lets bundlers code-split reliably; an arbitrary dynamic path would not. The package is built with `bun build --splitting` so the chunks stay out of the main bundle.

Upstream does not document whether bin indices are `floor(value / binSize)` or `round(value / binSize)`. The quantisation rule is determined empirically during implementation, by checking which rule lands each term's own average colour in a bin that actually contains that term, and is then locked in by test.

## Sync pipeline

`bun run sync:uwdata`:

1. Fetch the pinned SHA from `raw.githubusercontent.com` for the four upstream files listed above.
2. **Validate schema.** Any changed, missing, or renamed column fails the run with a non-zero exit that names the column. Never write partial output.
3. Transform to per-language chunks, applying the correct colour space per file (Oklab vs. CIELAB).
4. Write `data/uwdata/meta.json`: new SHA, generation date, per-language model, term count, coverage fraction.
5. Print a diff summary — terms added/removed, coverage deltas, chunk size changes.

A human reviews the generated diff and commits. A weekly GitHub Action re-runs the sync against upstream `master` and opens a PR containing the regenerated data plus the diff summary; merging is manual.

## Errors

| Condition | Behaviour |
| --- | --- |
| Unknown source | Throw, listing valid source ids |
| Locale not supported by the source | Throw `RangeError`, as `Intl` does; use `supportedLocalesOf()` to check first |
| `new ColorNames(…)` before the chunk is loaded | Throw, pointing at `ColorNames.load()` — no silent async |
| No data near the requested colour | `of()` returns `undefined`; `resolve()` returns `coverage: "none"` — not an error |
| Sync script hits schema drift | Non-zero exit naming the changed columns; no files written |

## Testing

`bun test`.

- Golden fixtures: ~50 known colour→term pairs per model, frozen from the pinned SHA.
- Both models, exact and nearest-bin resolution, bin-boundary cases, no-coverage cases.
- Reverse lookup, including unknown terms.
- Hue-model rejection of desaturated input.
- Sync script tested against checked-in fixtures of the upstream files, so schema validation is proven without network access.
- Chunk-size regression assertion, so a data update cannot silently multiply the bundle.

## Licensing gate

The upstream dataset carries no license. Before the first npm publish:

1. Open an issue on `uwdata/color-naming-in-different-languages` asking the maintainers (Kyle Thayer is actively committing) to add an explicit license — CC-BY-4.0 for data, MIT/BSD for code.
2. The package is built, tested, and documented in the meantime; **publishing is blocked until an answer lands.**
3. If a license is granted, record it in the source descriptor and ship the generated data.
4. If it is refused, fall back to an engine-only package that fetches data from the maintainers' own site at runtime.

The package README and the docs page carry the citation and the maintainers' bias disclaimer regardless of outcome.

## Out of scope

- Translation loss between language pairs (`model/translation_loss/`).
- SOM colour patches (`colorSOMPatches.json`).
- Colour-scheme naming (`scheme_color_names.json`).
- Merging or weighting across sources.
- Additional sources beyond uwdata — the registry supports them; none are implemented in this work.
