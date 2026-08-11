# `pantone` and `ral` Sources, and Name Hygiene for `wikidata`

**Date:** 2026-08-12
**Status:** Approved design, not yet implemented

## Purpose

Three changes to `@urcolor/i18n`, all of them consequences of one observation:
the `wikidata` source currently mixes two unlike things. It carries linguistic
colour names, which is what it exists for, and it carries industrial catalogue
codes, which are not names in any language and do not belong in a chunk keyed
by locale.

1. Split Pantone, RAL and NCS codes out of `wikidata`. Pantone and RAL become
   their own sources, fetched from openly licensed upstreams. NCS is dropped
   with no replacement.
2. Fold every shipped name to lower case using the rules of its own locale,
   matching what `uwdata` already ships.
3. Drop names written in a script the locale does not use, which is how
   `Eigengrau` came to sit in the Russian chunk.

## Measured outcome

All figures are simulated against the currently shipped `src/data/wikidata/`,
298 chunks and 10,428 term entries.

| Stage | Terms |
| --- | --- |
| Shipped today | 10,428 |
| Catalogue code labels removed | −1,478 |
| Alphabet check removes | −15 |
| **Shipped after this change** | **8,935** |

A further 34 labels sit on catalogue items but are ordinary colour words, not
codes, and are deliberately kept. See the code-shape rule below.

Chunk count stays 298. No locale is emptied.

Catalogue codes are 28% of the largest chunk: `en` has 897 terms of which 255
carry digits, 253 of those being RAL, Pantone or NCS. The six locales carrying
the full RAL set lose the most, `en` 897 to 644 and `nl` 370 to 157. `kl`
(Greenlandic) is the extreme case at 14 terms to 1, because 13 of its 14 were
RAL.

`itemCount` falls from 964 to roughly 710, so every `coverage` figure in
`meta.json` is recomputed. `en` becomes 644/710, about 0.907.

## Part 1: the catalogue split

### Items are identified by QID, never by label

The obvious filter, a `^pantone` test on the label, is wrong. Wikidata
localises catalogue names: `Q24885519` is `Pantone 448 C` in English,
`彩通448C` in Chinese, `פנטון 448c` in Hebrew, `แพนโทน 448 ซี` in Thai and
`بانتون 448 سي` in Arabic. A regex written in English keeps every one of the
others. Measured, the label regex misses 39 entries the QID set catches.

Identification therefore runs on the item, in the SPARQL layer, where one
statement covers every language at once.

| Catalogue | Discriminator | Items |
| --- | --- | --- |
| Pantone | `wdt:P31 wd:Q104919542` (Pantone color) | ~39 |
| RAL | `wdt:P31 wd:Q17421658` (RAL classic color) | ~211 |
| NCS | `wdt:P361 wd:Q1503197` (part of: Natural Color System) | 4 |

NCS uses `P361` rather than `P31` because its four items carry only
`P31 wd:Q1075`, the generic colour class, and are distinguished solely by what
they are part of.

254 items match in total.

### Not every label on a catalogue item is a code

Identifying the *item* is not the same as condemning all of its *labels*. Some
languages label a RAL item with its descriptive name rather than its code:
German `Verkehrsrot` for RAL 3020, English `traffic red`, Italian
`rosso traffico`, Japanese `シグナルレッド`, plus ten Estonian, eight Indonesian
and five Czech names. Those are ordinary colour words and belong in `wikidata`.

A label on a catalogue item is treated as a code, and dropped, when either
holds:

- it contains a decimal digit (`\p{Nd}`), which covers `RAL 5010`,
  `Pantone 448 C`, `彩通448C` and Persian `پنتون ۴۴۸ سی` alike; or
- it contains a catalogue marker as a whole word or hyphen-separated part:
  `pantone`, `ral`, `ncs`, `彩通`, `פנטון`, `แพนโทน`, `پنتون`, `بانتون`.

The marker list exists only for the 15 digit-free codes in the data:
`Pantone Reflex Blue` in three locales, and `NCS red/green/yellow/blue` in
English, Venetian (`NCS roso`) and Frisian (`NCS-read`). Every one of the 49
digit-free labels on catalogue items was inspected by hand; the rule keeps 34
and drops 15, matching that classification exactly.

The rule fails in the safe direction. An unrecognised marker leaves a
code-shaped label in `wikidata`, where it is visible and curatable, rather than
destroying a real name.

### `pantone`

Source data is [adonald/Pantone-CMYK-RGB-Hex](https://github.com/adonald/Pantone-CMYK-RGB-Hex),
1,149 PMS codes with CMYK, RGB and hex, under MIT. It is the only cleanly
licensed Pantone dataset found. [Margaret2/pantone-colors](https://github.com/Margaret2/pantone-colors)
is larger at 2,310 TCX entries but carries no licence at all, and its own
README states that the names are Pantone copyright.

Terms ship as `pantone 100`, `pantone process yellow`. `provenance` carries the
raw upstream code in place of a QID.

The Wikidata Pantone entries are not carried across. The split deletes them and
adonald replaces the set wholesale, which loses the coated and uncoated
distinction: adonald has no `C` or `U` suffix, so `Pantone 448 C` and
`Pantone 567 U` both become bare numbers. This is an accepted loss. The
alternative, merging two Pantone sets with different conventions, produces a
catalogue that matches neither upstream.

`license` is `MIT`, with a `disclaimer` recording that PANTONE is a trademark of
Pantone LLC, that the shipped values are factual colour data rather than the
Pantone system itself, and that this package is not affiliated with or endorsed
by Pantone.

### `ral`

Source data is [ieskudero/ral-colors](https://github.com/ieskudero/ral-colors),
MIT, carrying RAL Classic (213), RAL Design and RAL Effect. RAL Classic ships;
Design and Effect are left for a later change.

It is preferred over [juliuste/ral-to-hex](https://github.com/juliuste/ral-to-hex),
also MIT and also 213 entries, for two reasons. It carries English names
alongside the codes, and its hex values agree with Wikidata's where juliuste's
do not: RAL 1000 is `CDBA88` in both ieskudero and Wikidata, and `BEBD7F` in
juliuste. Agreeing with the data being replaced keeps this a move rather than a
silent revaluation.

### NCS is dropped

NCS Colour AB holds the Natural Colour System as proprietary, and no open
dataset exists. The community packages are algorithmic approximators, not
catalogues. The four code labels are removed from `wikidata` and nothing
replaces them.

### Both new sources are language-neutral

`RAL 1005` is the label in all six locales that carry it, and `Pantone 448 C`
is the same string in most of the thirteen that carry it. These are codes, not
names, so shipping them under a locale would misrepresent what they are.

`NameSource` gains `languageNeutral?: boolean`. When set, `negotiateLocale`
returns the source's single `und` chunk for any requested locale rather than
matching subtags. The flag is declared on the source rather than inferred from
a one-key chunk map, so a genuinely linguistic source that happens to cover one
locale never acquires the behaviour by accident.

`coverage` for these chunks is 1: a catalogue names its own catalogue entirely.

Neither source joins the default chain. `setDefaultSources(["uwdata",
"wikidata"])` is unchanged, so a plain `ColorNames.resolve()` can never answer
with `ral 6018` where a word was wanted. Callers opt in with
`{ source: "pantone" }`.

## Part 2: locale-aware lower case

`uwdata` ships every display name in lower case in every language it covers,
German included: `altrosa`, `blassgrün`, `dunkelblau`. `wikidata` does not.
417 of 480 German terms are capitalised, and Azerbaijani is inconsistent inside
one chunk, `qırmızı` beside `Sarı`.

Display name, term key and every alias are folded:

```ts
const fold = (s: string, lang: string) =>
  s.normalize("NFC").toLocaleLowerCase(lang).normalize("NFC");
```

Both normalisation passes are load-bearing. Turkish `İ` folds to `i` under
`tr`, but under the invariant rule it folds to `i` followed by a combining dot
above, which is a different string and a different lookup key. Normalising
after the fold collapses that back to NFC.

`toLocaleLowerCase` throws on tags `Intl` rejects. Nine appear in this data:
`sh`, `nah`, `bcl`, `map-bms`, `diq`, `eml`, `mhr`, `tw` and `pnb`. The call is
wrapped and falls back to `toLowerCase()`, and `main.ts` lists the locales that
took the fall-back so the set does not grow unnoticed.

The reported label-collision count will rise well above the current 578,
because folding German collapses pairs that previously differed only in case.
Both entries still ship. Only reverse lookup is affected, and its first-match
choice is already settled by sitelink salience ordering.

## Part 3: the alphabet check

### Why the obvious approaches fail

Three were measured against the shipped data before settling on the fourth.

**CLDR likely subtags.** `new Intl.Locale(lang).maximize().script` drops 97
terms, most of them wrong. CLDR maximises `grc` to Cypriot, so every polytonic
Greek term is foreign to its own locale; it maximises `lad` to Hebrew and `crh`
to Cyrillic, both contradicted by the actual labels. It returns no script at
all for the nine locales listed above.

**Majority script of the chunk.** Drops 120, including 110 legitimate Japanese
terms. Japanese is written in three scripts, so pure katakana entries such as
`ピンク` and `シアン` read as foreign against a Han majority.

**Wholly-foreign terms only.** Catches `Eigengrau`, `umber` and `Amaranth`, but
leaves every mixed-script typo in place, and still needs a hand-maintained
multi-script table to avoid gutting Japanese.

### The rule

A script is valid for a locale when it is attested in at least
`max(3, 5% of terms)` of that locale's own terms. A term is dropped when it
contains any letter outside the valid set.

```ts
attestedScripts(terms): Set<string>
isScriptConsistent(name, allowed): boolean
```

The threshold is self-calibrating, needs no per-language table, and works for
all 298 locales including the nine `Intl` cannot classify. Japanese attests
katakana in 40% of its terms, so katakana is valid there. Russian attests Latin
in 3 terms of 197, so Latin is not.

Letters whose script is Common or Inherited are ignored. This is what keeps
Hawaiian `ʻulaʻula` and Uzbek `koʻk`: the ʻokina is `U+02BB`, category `Lm`,
script Common, and a naive letter test flags it as foreign to both.

When `attestedScripts` returns empty, the chunk is too thin to calibrate and
ships unchecked. That failsafe is why `bug` (Buginese, 3 terms) keeps `Lotong`.
It is deliberate: a three-term chunk cannot distinguish a foreign name from its
own orthography.

### What it removes

15 terms across 11 locales, measured after the catalogue split has already run.

| Locale | Dropped |
| --- | --- |
| `ru` | `Eigengrau`, `International Klein Blue`, `rосмический латте` |
| `hy` | `Eigengrau`, `UCLA կապույտ` |
| `zh` | `Eigengrau`, `olive drab` |
| `mk` | `полноќнoсина` |
| `bg` | `Cиньо-зелен` |
| `tt` | `kөрәнсу кызыл төс` |
| `udm` | `тöдьы` |
| `sr` | `umber` |
| `sd` | `Amaranth` |
| `he` | `YInMn Blue` |
| `ja` | `YInMnブルー` |

Two kinds of fault are caught. Names in the wrong language, which is
`Eigengrau` in Russian and `umber` in a Cyrillic Serbian chunk. And
single-character typos, where `rосмический латте` opens with a Latin `r`,
`полноќнoсина` hides a Latin `o` and `Cиньо-зелен` a Latin `C`.

Homoglyph repair is not attempted. `r` is a keyboard slip for `к`, not a
homoglyph of it, so no single rule repairs all three, and a partial rule would
leave the set inconsistent. Every fault drops.

One false positive is accepted. `UCLA կապույտ` is correct Armenian containing a
proper noun in Latin. It costs one term out of 8,935, and the floor of 3 that
lets it through is the same floor that catches `Eigengrau` in that same chunk.

A floor of 4 was measured and rejected: it drops Chechen `Iаьржа`, `кiайн` and
`беса-цiениг`, where the Latin letters stand in for the palochka by ordinary
convention.

### The one sharp edge

JavaScript has no script-of-character API, so the check tests against an
enumerated list of `\p{Script_Extensions=…}` names. A character in a script
missing from that list matches nothing and is treated as Common.

This fails **open**. An unlisted script never causes a wrong drop, it causes a
skipped check. To keep the gap visible, `main.ts` reports the count of letters
matching no listed script, so a script arriving in a future sync appears as a
number rather than as silence.

## Order of operations

Inside `transform.ts`, per chunk:

1. Catalogue items identified by QID; their code-shaped labels dropped, their
   descriptive labels kept.
2. Alphabet check, against the surviving terms.
3. Locale-aware fold, applied to name, key and aliases.

The alphabet check runs before the fold because case does not affect script,
and reading the report against upstream spelling is easier than against folded
spelling. It runs after the split so that catalogue codes, which are foreign to
almost every locale by construction, do not distort the attested-script tallies.

## New and changed files

| Path | Change |
| --- | --- |
| `scripts/sync-wikidata/fetch.ts` | catalogue-membership query (`P31`, `P361`) |
| `scripts/sync-wikidata/transform.ts` | catalogue split, code-shape rule, `attestedScripts`, `isScriptConsistent`, `fold` |
| `scripts/sync-wikidata/main.ts` | four new report sections |
| `scripts/sync-pantone/{fetch,transform,main}.ts` | new |
| `scripts/sync-ral/{fetch,transform,main}.ts` | new |
| `src/sources/pantone/{source,chunks}.ts` | new |
| `src/sources/ral/{source,chunks}.ts` | new |
| `src/data/pantone/`, `src/data/ral/` | generated `und.js` and `meta.json` |
| `src/engine/types.ts` | `NameSource.languageNeutral?: boolean` |
| `src/engine/locale.ts` | honour `languageNeutral` in negotiation |
| `src/index.ts` | register both sources, default chain unchanged |
| `package.json` | `sync:pantone`, `sync:ral` |

Both new sync scripts mirror `sync-uwdata`'s three-file split and its
validation posture: upstream shape drift throws `SchemaError` rather than
shipping quiet garbage, and everything renders into memory before any file is
touched, so a rendering failure cannot leave a data directory half-written
while the manifest still references it.

## Sync report additions

`sync-wikidata` gains four figures, each of them the signal that upstream has
drifted:

- catalogue items matched, per catalogue, and code labels dropped
- descriptive labels spared on catalogue items
- terms dropped by the alphabet check, listed in full given how few there are
- letters matching no listed script, and locales that took the `toLowerCase`
  fall-back

## Testing

| Test | Covers |
| --- | --- |
| `test/scripts/wikidata/transform.test.ts` | catalogue identification by `P31` and `P361`; code-shape rule on digits, markers and hyphen-separated markers; a descriptive label spared; `attestedScripts` at the threshold and at the floor; Common-script letters ignored; empty-attested failsafe; `fold` including Turkish `İ` and the invalid-tag fall-back |
| `test/scripts/wikidata/main.test.ts` | the four new report sections |
| `test/scripts/pantone/*`, `test/scripts/ral/*` | fetch validators, schema drift, chunk and manifest rendering |
| `test/engine/locale.test.ts` | `languageNeutral` negotiation returns `und` for any requested locale, and is not applied to ordinary sources |
| `test/color-names.test.ts` | `{ source: "pantone" }` resolves; catalogue sources absent from the default chain |
| `test/data.test.ts` | every shipped term is NFC, equal to its own locale's fold of itself, and script-consistent |

The `data.test.ts` additions are the real guard. They assert the three policies
against shipped data rather than against transform internals, so a future sync
cannot regress them without a test failing.

Fixtures are trimmed real upstream responses. The Wikidata fixtures include one
catalogue item carrying both a code label and a descriptive label, since that
is the case the code-shape rule exists for. The Pantone fixture includes a word
code (`Process Yellow`) rather than only numbers, since that is the case a
numeric parser gets wrong.

## Documentation

`packages/i18n/README.md` gains both sources in its source table, with the
Pantone trademark disclaimer and the note that catalogue sources are opt-in.
`docs/guide/color-naming.md` gains the opt-in usage. The `wikidata` section
records that catalogue codes moved out, that descriptive names for those
colours stayed, and that NCS was dropped.

## Explicitly out of scope

- RAL Design and RAL Effect. RAL Classic ships; the other two are a later
  change against the same source.
- Homoglyph repair of the mixed-script typos. They drop.
- An NCS source. No open dataset exists to build one from.
- Applying the fold or the alphabet check to `uwdata`. Its data is already
  lower case and already script-consistent.
- Merging catalogue sources into the default chain, or into each other.
