# Default Source Chain for `@urcolor/i18n`

**Date:** 2026-08-02
**Status:** Approved design, not yet implemented

## Purpose

Make `uwdata` the default colour-name source, with `wikidata` answering the
locales `uwdata` does not cover.

Today `source` is a required option on `ColorNames`. A caller who wants
Georgian must know in advance that `uwdata` has no Georgian and that
`wikidata` does. That is a reasonable thing to demand of a library author and
an unreasonable thing to demand of an application developer, who mostly wants
"name this colour in the user's language, using the best data available".

## Relationship to the "sources are never merged" rule

The existing design states that sources are never merged and that `source` is
required because *"provenance is never implicit"*. This change keeps the first
half and narrows the second.

**Sources still never merge.** Exactly one source answers an entire
`ColorNames` instance. It is chosen once, at load time, and never varies per
lookup — two colours resolved from the same instance always come from the same
dataset.

What changes is that provenance may now be **implicit in the request** while
remaining **explicit in the result**. `resolve().source` and
`resolvedOptions().source` always name the dataset that actually answered. The
README line claiming provenance is never implicit is reworded to say this
precisely, rather than left standing as a claim the code no longer honours.

## Measured locale sets

| | Locales |
| --- | --- |
| `uwdata` | 20 — `ar da de el en es fa fi fr hu it ko nl pl pt ro ru sv tr zh` |
| `wikidata` | 298 |
| Union | 298 |
| In `uwdata` but not `wikidata` | **none** |

`uwdata`'s locale set is a strict subset of `wikidata`'s, so "the locales
`uwdata` doesn't cover" is cleanly the other 278. There is no locale for which
the chain fails but a single source would have succeeded.

### The one tag collision

`wikidata` ships exactly one variant tag whose base tag `uwdata` also has:

| Tag | `wikidata` | `uwdata` via subtag stripping |
| --- | --- | --- |
| `zh-Hant` | 111 terms, exact match | `zh`, 90 terms (Simplified) |

Every other `wikidata` script/variant tag (`sr-Cyrl`, `tt-Cyrl`, `aeb-Arab`,
`be-tarask`, `map-bms`, …) has no `uwdata` base to collide with.

## Resolution algorithm

For each requested tag, walk that tag's BCP 47 stripping ladder; at each rung,
try every source in chain order. First hit wins.

```
for tag of requestedTags:
  for rung of ladder(tag):          // "zh-Hant" -> "zh"
    for source of chain:            // "uwdata" -> "wikidata"
      if source has rung: return { source, locale: rung }
return undefined
```

This is `Intl`'s own lookup algorithm with the source chain as the inner loop.
It is one pass, not two phases, and it produces the intended
exact-beats-stripped behaviour as a consequence of the ladder rather than as a
special case:

| Request | Resolves to | Why |
| --- | --- | --- |
| `ka` | `wikidata` / `ka` | `uwdata` has no `ka` |
| `en` | `uwdata` / `en` | chain order; both have it |
| `zh` | `uwdata` / `zh` | exact match in the first source |
| `zh-Hant` | `wikidata` / `zh-Hant` | exact rung beats `uwdata`'s stripped `zh` |
| `de-AT` | `uwdata` / `de` | neither has `de-AT`; `de` resolves in chain order |
| `["zh-Hant", "en"]` | `wikidata` / `zh-Hant` | requested-tag order dominates |

Keeping the requested tag as the outer loop matters: it preserves `Intl`
semantics, where an earlier requested locale's fallback outranks a later
locale's exact match. Inverting the loops would make `["ro", "en"]` resolve to
English whenever Romanian only matched by stripping — surprising, and not what
`Intl.DisplayNames` does.

`localeLadder(tag): string[]` is extracted from the existing `negotiateLocale`
in `src/engine/locale.ts` so both use one implementation of the ladder.

## Where the default lives

`src/color-names.ts` is currently source-agnostic — it never names a dataset.
Hardcoding `["uwdata", "wikidata"]` there would couple the lookup layer to the
particular datasets this package happens to ship.

Instead `src/engine/registry.ts` gains:

```ts
export function setDefaultSources(ids: readonly string[]): void;
export function getDefaultSources(): readonly string[];
```

`setDefaultSources` copies and freezes its argument, and `getDefaultSources`
returns that frozen array. This follows the existing `registerSource`
precedent, which freezes the descriptor and its `languages` map for exactly
this reason: a caller holding a reference to shared registry state must not be
able to mutate locale negotiation for every subsequent consumer.

and `src/index.ts` calls `setDefaultSources(["uwdata", "wikidata"])` after
registering both — the same place composition already happens. Adding a third
source later is a one-line change in one file, and `color-names.ts` stays
ignorant of which datasets exist.

## API

```ts
export interface ColorNamesOptions {
  /**
   * Which dataset(s) answer, in priority order. Omit for the package
   * default chain. A single id pins the instance to that source and throws
   * if it has no data for the locale — unchanged from before.
   */
  source?: string | readonly string[];
  // ... style, fallback, maxDistance, topN unchanged
}
```

| Call | Behaviour |
| --- | --- |
| `load("ka")` | Default chain → `wikidata` |
| `load("ka", { source: "uwdata" })` | `RangeError` — **unchanged** |
| `load("ka", { source: ["uwdata", "wikidata"] })` | Explicit chain → `wikidata` |
| `load("en", { source: ["wikidata", "uwdata"] })` | Reversed chain → `wikidata` |

Every existing call site keeps its exact current meaning: passing a single
string still pins to that source and still throws when unsupported. The change
is purely additive.

`resolvedOptions()` keeps `source: string` — the dataset that answered — and
gains `sources: string[]`, the chain that was considered. Callers reading
`resolvedOptions().source` today are unaffected.

`ColorNames.supportedLocalesOf(locales, options?)` takes an optional
`source: string | readonly string[]`; with a chain it filters against the union
of the chain's locale sets.

### Errors

- No source in the chain covers the locale → `RangeError` naming the requested
  locale(s) and every source tried, not just the first.
- An unknown source id anywhere in a chain → throws immediately at resolution,
  rather than being silently skipped so that a typo degrades into a
  fallback. `getSource` already throws for unknown ids; chain resolution must
  not swallow that.
- An empty chain (`source: []`) → `RangeError`. It is a caller mistake, not a
  request for the default.

## A caveat this makes easier to hit

`uwdata` covers 20 locales, but several thinly. Romanian has 4 terms at 4.4%
coverage; Finnish 11, Swedish 16, Polish 19, Dutch 22. `wikidata` has 65, 65,
170, 114, and 370 respectively.

Because the rule is locale-level, `load("ro")` resolves to `uwdata` and its 4
terms — the thin perceptual dataset wins over a broader catalogue. This is
deliberate: the two sources answer different questions, and silently switching
between them based on a coverage threshold would mean the same call returns
perceptual data for one language and catalogue data for another, with no
threshold anyone can justify from first principles.

The documentation states this plainly and tells callers who want breadth over
perceptual fidelity to pass `{ source: ["wikidata"] }` or
`{ source: ["wikidata", "uwdata"] }`.

## Files

| File | Change |
| --- | --- |
| `src/engine/locale.ts` | Extract `localeLadder(tag)`; `negotiateLocale` uses it |
| `src/engine/source-chain.ts` | **New.** `resolveSourceChain(locales, chain)` |
| `src/engine/registry.ts` | `setDefaultSources` / `getDefaultSources` |
| `src/color-names.ts` | Optional `source`, chain resolution in constructor + `load` + `supportedLocalesOf`, `resolvedOptions().sources` |
| `src/index.ts` | `setDefaultSources(["uwdata", "wikidata"])` |
| `README.md`, `docs/guide/color-naming.md` | Document the chain, the reworded provenance claim, and the thin-locale caveat |

## Testing

| Test | Covers |
| --- | --- |
| `test/engine/source-chain.test.ts` | The resolution table above; requested-tag order dominance; empty chain; unknown id; no-match |
| `test/engine/locale.test.ts` | **New file** — there is no direct test for `locale.ts` today. Covers `localeLadder` directly, and pins `negotiateLocale`'s existing behaviour so the extraction is provably behaviour-preserving |
| `test/engine/registry.test.ts` | Default-sources get/set |
| `test/color-names.test.ts` | `load` with no `source`; single-source unchanged incl. the throw; explicit and reversed chains; `resolvedOptions().source`/`.sources`; `supportedLocalesOf` union |
| `test/data.test.ts` | The shipped default chain resolves `ka`→wikidata, `en`→uwdata, `zh`→uwdata, `zh-Hant`→wikidata against real data |

The `zh-Hant` case is tested against the real shipped chunks, not fixtures — it
is the only tag where the ladder and the chain interact, so a fixture that
invented the collision could drift from the data that actually ships.

## Out of scope

- Per-lookup fallback (retrying a `coverage: "none"` result against the next
  source). Considered and rejected: it would let two sources answer within one
  locale, making provenance vary per call and forcing both chunks to load.
- Coverage-threshold-based source selection. Rejected: the threshold is
  unjustifiable, and `coverage` is not comparable across models — hue-model
  locales all report `1.000`.
- Merging or blending results from two sources. Explicitly still forbidden.
