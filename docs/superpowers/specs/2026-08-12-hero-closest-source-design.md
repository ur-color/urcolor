# Hero Name Panel: Answer From Whichever Source Is Closer

**Date:** 2026-08-12
**Status:** Approved design, not yet implemented

## Purpose

The hero's name readout picks one dataset per language and keeps it for every
colour. `uwdata` wins whenever it covers the language, `wikidata` answers the
rest. That rule is correct at the language level and wrong at the colour
level: `uwdata`'s sampled data is dense in the middle of the space and thin or
absent near the achromatic extremes, which is exactly where `wikidata`'s
catalogue is precise.

The panel should answer from whichever source is closer to the picked colour,
per colour, not per language.

## What the current rule gets wrong

Measured against the shipped data:

| Locale | Colour | `uwdata` | `wikidata` | Shown today |
| --- | --- | --- | --- | --- |
| `zh` | `#ffffff` | 浅蓝色, `nearest`, 0.0707 | 白色, `exact`, 0 | 浅蓝色 |
| `ru` | `#ffffff` | no data, ∞ | белый, `exact`, 0 | — |
| `ru` | `#000000` | no data, ∞ | чёрный, `exact`, 0 | — |
| `ru` | `#fffdd0` | no data, ∞ | кремовый цвет, `exact`, 0 | — |
| `ru` | `#808000` | оливковый, `nearest`, 0.0368 | оливковый, `exact`, 0 | оливковый |
| `ru` | `#87ceeb` | голубой, `nearest`, 0.0561 | голубой, `nearest`, 0.0076 | голубой |

Chinese white reads "light blue". Russian white, black and cream read as no
data at all, because the panel commits to `uwdata` at load time and never
consults the source that has the answer.

The rule is right where it is right. English `uwdata` returns `exact` with
distance 0 for every probe colour tried, so English never changes. Saturated
colours in every locale stay with `uwdata`: `zh #ff00c8` keeps 粉色 (`exact`,
0) over `wikidata`'s 洋紅色 (`nearest`, 0.0819).

## The rule

Resolve the colour against every source that covers the language. Discard any
result with `coverage: "none"`. Of the rest, take the one with the smallest
`binDistance`. Ties go to the earlier source in the chain, so `uwdata` wins a
0-against-0 tie.

`binDistance` is the only number comparable across the two models, and the
package documents it as such: *"`binDistance` below always carries the raw
distance regardless of model, so it's the honest number to read when this
distinction matters."* `probability` is not comparable — it is a sampled
naming frequency for `uwdata`'s full model and a proximity confidence for
`wikidata`'s palette model, so a 40% naming frequency is not worse than a 0.9
proximity score.

Two properties make the comparison work without special cases:

- `lookupFull` returns `binDistance: 0` on an exact bin hit, so `uwdata` wins
  automatically wherever it has real data for the queried bin.
- Both lookups return `Number.POSITIVE_INFINITY` when nothing matches, so
  "this source has nothing to say" loses every comparison by arithmetic rather
  than by a branch.

## Where the logic lives

In `docs/.vitepress/components/hero/SatName.vue`. `@urcolor/i18n` is not
touched.

The package states a hard invariant: *"Sources are never merged: exactly one
answers an entire instance, chosen at load time and fixed thereafter, so two
colours resolved from the same instance always come from the same dataset."*
That invariant is load-time by construction — `ColorNames` resolves its chain
in the constructor and stores a single `#chunk`. Making a lookup pick between
datasets would ripple into `resolvedOptions()`, the source-chain engine and the
package's tests, and would invalidate a documented guarantee that other
consumers may rely on.

The hero holds one `ColorNames` instance per covering source and chooses
between their resolutions. Each instance keeps the package's guarantee intact;
the component, not the package, is the thing that consults two of them.

## Component changes

`SatName.vue`, in the order the file reads:

1. **`pickNames` becomes `loadNames`.** It filters `["uwdata", "wikidata"]` by
   `getSource(source).languages[l]`, loads each survivor with
   `ColorNames.load(l, { source })`, and resolves them with `Promise.all`.
   Returns `ColorNames[]`, empty when the language has no source at all.
2. **`names` becomes `shallowRef<ColorNames[]>([])`.** The `whenIdle`
   deferral, the `token` staleness guard and the `catch` that clears the panel
   all keep their present shape; only the payload type changes.
3. **`resolution` picks a winner.** Map each instance through `resolve(color)`,
   drop entries whose `coverage` is `"none"` or whose `name` is undefined,
   return the minimum by `binDistance`, or `undefined` when nothing survives.
4. **`name` and `meta` are unchanged.** Both already read a single
   `ColorNameResolution`. `meta`'s `r.source` names the winner, and its
   existing `r.model === "palette"` branch already renders `wikidata`'s
   proximity as "closest catalogued" rather than a misleading percentage.

No template change, no style change, no new i18n strings.

## Loading

Both chunks load in parallel, at idle, under the existing 1.5s Safari
fallback. `ja` loads one chunk, the other six locales load two. The added
weight is the smaller of the pair: `wikidata` ships 27K for `zh` and 32K for
`ru` uncompressed, against `uwdata`'s 633K for `en`. The panel holds its
placeholder until both land, so the displayed name never changes on its own
after first paint.

## Testing

`docs/test/SatName.test.ts` runs against the real data, not fixtures, so the
probe results above are directly assertable.

- Existing tests stand. The opening magenta in English still resolves through
  `uwdata`, and the meta line still contains `uwdata`.
- New: a colour where `wikidata` wins reports `wikidata` in its meta line.
- New: a colour where `uwdata` covers the bin keeps `uwdata` even though
  `wikidata` also has an answer, confirming the tie and the near-miss ordering.
- New: a `ja` colour resolves from `wikidata` alone, confirming the
  single-source path still works.

The default English locale under `bun test` means a locale-specific case needs
the language switched through `useDocsLang`, matching how the existing suite
stubs the client surface.

## Known trade-offs

These are consequences of the rule, accepted rather than fixed:

- **Catalogue quirks surface.** `ru #0a0f2c` resolves to "Eigengrau", a German
  term sitting in a Russian readout, because that is the label `wikidata`
  carries. It only appears where `uwdata` had nothing closer.
- **Script variants mix.** `wikidata`'s Chinese labels arrive Traditional
  (淺藍色, 洋紅色) while `uwdata`'s are Simplified (浅蓝色, 粉色). A colour whose
  winner flips as the user drags will flip script with it.
- **The two models answer different questions.** `uwdata` models how speakers
  spontaneously name a region of colour space; `wikidata` catalogues named
  colours with exact values. Alternating between them per colour means the
  panel alternates between those two questions. The meta line names the source
  every time, which is what keeps that honest rather than hidden.
