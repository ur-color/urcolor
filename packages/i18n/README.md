# @urcolor/i18n

Multilingual colour naming and channel-label translations for urcolor.

```ts
import { ColorNames, ChannelNames } from "@urcolor/i18n";
import { Color } from "@urcolor/core";

// Default chain: uwdata where it has the locale, wikidata for the rest.
const ko = await ColorNames.load("ko");
ko.of(Color.parse("#3b82f6")!);          // "파랑색"  (uwdata)
const ka = await ColorNames.load("ka");
ka.resolvedOptions().source;             // "wikidata"

// Pin to one source when provenance must be fixed.
const names = await ColorNames.load("ko", { source: "uwdata" });
names.resolve(Color.parse("#3b82f6")!);
// { name, term, probability, candidates, model, source, coverage, binDistance,
//   hueProjectionDistance }  // only set for hue-model locales

new ChannelNames("ko").of("hue"); // "색조"
```

The API follows the ECMAScript `Intl` classes: `of()`, `resolvedOptions()`, and
`supportedLocalesOf()` behave as they do on `Intl.DisplayNames`.

## Coverage

Colour-name data comes from four independent sources. `uwdata` and `wikidata`
name colours in a language and answer the default chain. `pantone` and `ral`
catalogue industrial codes, are language-neutral, and are opt-in only.

### uwdata

The `uwdata` source covers **20 languages**.
Fourteen have a full-colour-space model (`de en es fa fi fr ko nl pl pt ro ru
sv zh`); six more have a hue-circle model that only describes saturated
colours (`ar da el hu it tr`). Upstream's raw files list dozens of additional
languages, but at the pinned commit only these 20 actually have the binned
naming data this package's lookup depends on — the rest have term centroids
only, with no distribution to sample from, so they aren't shipped.

Sample volume is heavily skewed — English has roughly two orders of magnitude
more data than Romanian — so `resolvedOptions().coverage` (the fraction of
sRGB-reachable Oklab space that has data) varies widely: en 96.0%, ko 83.5%,
zh 73.4%, ru 21.9%, ro 4.4%. `resolve()` reports a per-lookup `coverage`
(`"exact"`, `"nearest"`, `"none"`) rather than inventing a name.

### A caveat worth knowing

With the default `fallback: "nearest"`, colours near the achromatic
extremes — very light, very dark, near-grey — can come back with a wrong but
confident-looking answer. Those regions sit at the edge of the sampled space,
where little or no data exists, so the nearest populated bin can be a
noticeable perceptual distance away. For example, pure white (`#ffffff`)
resolves to `연분홍색` ("light pink", 36% probability, `binDistance` 0.050) in
Korean, and to `浅蓝色` ("light blue", 22%, `binDistance` 0.071) in Chinese.

The default is intentional — most callers want *an* answer rather than
`undefined` — but if you need to know whether an answer came from real data
or a reach, check `coverage` and `binDistance` on `resolve()` (which always
reports the true values, regardless of `fallback`). Pass `fallback: "none"`
if you'd rather get `undefined` than a nearest-bin guess.

This only matters for the 14 full-model languages. The 6 hue-model ones
(`ar da el hu it tr`) either land in a populated hue bin or report no
coverage at all — there's no neighbouring-bin fallback for `fallback: "none"`
to have an opinion about, so it's a no-op there. `resolve()` on a hue-model
locale also returns `hueProjectionDistance`, the Oklab distance from the
query to the fully saturated colour at the same hue.

### wikidata

The `wikidata` source covers **298 languages** with a discrete-palette model:
730 catalogued colours, each with one exact sRGB value, named in whatever
languages Wikidata editors have supplied. This is where the long tail lives —
Georgian, Cherokee, Aymara, Amharic, and Aramaic have colour names here and
none in `uwdata`.

It answers a different question from `uwdata`. Where `uwdata` models how
speakers *spontaneously name* a region of colour space, `wikidata` records the
*established name of a catalogued colour*. There is no sampled distribution, so
`resolve()` reports `probability` as a **proximity confidence, not a naming
frequency** — read `binDistance` for the underlying Oklab distance.

Coverage is `terms / 730`: `en` 88%, `de` 37%, `ja` 37%, `ka` 1.9%. Thin
languages are shipped rather than pruned — Georgian's 14-term chunk (32 other
locales carry just a single term) can't name an arbitrary colour, but it
resolves `colorOf("ყვითელი")` correctly.

Wikidata is **CC0-1.0**. The "no license declared upstream, make your own
assessment" caveat in [Licensing](#licensing) below is about `uwdata`
specifically — it does not apply here.

Three sync-time policies shape what this source ships.

**Catalogue codes moved out.** Pantone, RAL and NCS entries are no longer named
here. Use the `pantone` and `ral` sources below; NCS has no openly licensed
dataset, so those colours are not named at all. Items are identified by QID,
not by matching label text, because Wikidata localises the codes: `Q24885519`
is `Pantone 448 C` in English and `彩通448C` in Chinese. Only code-shaped
labels are dropped, so descriptive names on catalogue items survive: German
`verkehrsrot` and Italian `rosso traffico` are ordinary colour words and stay.

**Names are lower-cased under their own locale.** `Rot` ships as `rot`, and
Turkish `İ` folds to a bare `i` rather than to `i` plus a combining dot. The
lookup key and the display name are therefore the same string.

**Names in the wrong script are dropped.** A script counts as valid for a
locale when it is attested in at least `max(3, 5%)` of that locale's own terms.
This is what removed `Eigengrau` from the Russian chunk, `umber` from Cyrillic
Serbian, and single-character typos such as `Cиньо-зелен`, whose `C` is Latin.
Japanese keeps its katakana names, because katakana clears the threshold there.

### pantone and ral

Two catalogue sources, opt-in and language-neutral. `RAL 1005` is written the
same way in every locale, so each ships one chunk under the `und` tag and
answers whatever locale is requested:

```ts
const codes = await ColorNames.load("ru", { source: "pantone" });
codes.of(Color.parse("#0F4C81")!); // "pantone classic blue"
codes.colorOf("19-4052");          // reachable by TCX number too
```

| Source | Entries | Upstream | Aliases |
| --- | --- | --- | --- |
| `pantone` | 2,310 Fashion, Home + Interiors (TCX/TPG) colours | [Margaret2/pantone-colors](https://github.com/Margaret2/pantone-colors) | TCX number, spaced name, hyphenated slug |
| `ral` | 215 RAL Classic codes | [ieskudero/ral-colors](https://github.com/ieskudero/ral-colors) | bare code, English name |

Neither is in the default chain, so an ordinary lookup answers with a word
rather than a code. Both report `coverage: 1`, since a catalogue names its own
catalogue entirely.

`pantone` is the Fashion, Home + Interiors collection, **not** the Pantone
Matching System: it answers to TCX numbers such as `19-4052`, not to PMS codes
such as `448 C`. RAL publishes no authoritative sRGB renderings and two
conventions circulate; these values match Wikipedia's *List of RAL colours*.
RAL Design and RAL Effect are not included.

Read [Licensing](#licensing) before redistributing `pantone`.

### Default source chain

Omitting `source` walks the default chain — `uwdata` first, then `wikidata`.
`uwdata` answers the 20 locales it covers, `wikidata` answers the other 278,
and `resolvedOptions().source` always names whichever one actually did while
`resolvedOptions().sources` reports the whole chain that was considered. The
catalogue sources are registered but deliberately absent from this chain: an
ordinary lookup must answer with a word, never with `ral 6018`.
Call `getDefaultSources()` to read that chain directly, without constructing
a `ColorNames` instance first:

```ts
import { getDefaultSources } from "@urcolor/i18n";

getDefaultSources(); // ["uwdata", "wikidata"]
```

A tag one source has exactly outranks a tag another source only reaches by
stripping subtags: `load("zh-Hant")` resolves to `wikidata`'s Traditional
Chinese chunk rather than falling back to `uwdata`'s Simplified `zh` chunk.
`load("zh")` still resolves to `uwdata`.

`uwdata` covers 20 locales but several of them thinly — Romanian has 4 terms,
Finnish 11, Swedish 16 — where `wikidata` has 65, 65, and 170. Because the
rule is locale-level, `load("ro")` stays on `uwdata`'s 4 terms. That is
deliberate: the two sources answer different questions, and switching between
them on a coverage threshold would return perceptual data for one language and
catalogue data for another with no defensible cutoff. Pass
`{ source: ["wikidata"] }` if you want breadth over perceptual fidelity.

## Data source and attribution

Sources are never merged. Exactly one source answers an entire `ColorNames`
instance — chosen at load time and fixed thereafter, so two colours resolved
from the same instance always come from the same dataset. Omitting `source`
lets the package pick using the default chain (`uwdata`, then `wikidata`);
provenance is then implicit in the *request* but still explicit in the
*result*, since `resolve().source` and `resolvedOptions().source` always name
the dataset that answered. Passing a single id pins the instance and throws if
that source lacks the locale.

Attribution below is scoped the same way: each source's provenance is stated
separately, because the two caveats do not transfer between them.

### uwdata

Colour-name data is derived from
[Color Naming in Different Languages](https://github.com/uwdata/color-naming-in-different-languages),
pinned at commit `f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5`.

> Kim, Y., Thayer, K., Silva Gorsky, G., & Heer, J. (2019). Color Names Across
> Languages: Salient Colors and Term Translation in Multilingual Color Naming
> Models. EuroVis.

The dataset authors' own caveat, which applies to every name `uwdata` returns
(not to `wikidata`):

> We represent the color labels provided by the participants in our study, which
> may include misspellings, but also whatever racial biases they have (e.g., the
> color 'skin'). This is not meant to be a prescriptive definition of what colors
> fit what labels.

### wikidata

Colour-name data is derived from [Wikidata](https://www.wikidata.org/), items
whose instance-of/subclass-of chain reaches
[Q1075 (colour)](https://www.wikidata.org/wiki/Q1075) and which carry a
[P465](https://www.wikidata.org/wiki/Property:P465) sRGB hex triplet —
exactly the `citation` and `disclaimer` exposed on `getSource("wikidata")`:

> Wikidata contributors. Wikidata, the free knowledge base.
> https://www.wikidata.org/ — content available under CC0 1.0.

> Names are editorial labels contributed by Wikidata editors, not measured
> naming behaviour. Coverage is uneven across languages, and a name's
> presence does not imply it is the term speakers would actually choose.

### pantone and ral

`pantone` derives from
[Margaret2/pantone-colors](https://github.com/Margaret2/pantone-colors), the
Fashion, Home + Interiors (TCX/TPG) collection. `ral` derives from
[ieskudero/ral-colors](https://github.com/ieskudero/ral-colors), RAL Classic.
Both expose their `citation` and `disclaimer` on `getSource()`, and both
disclaimers name the trademark holder and state that this package ships colour
values rather than the colour system. See [Licensing](#licensing).

## Licensing

`uwdata`'s upstream repository declares no license file. Its README asks only
that the paper be cited, which this package does — in the source, in this
README, and in the documentation. Downstream users redistributing the data
should make their own assessment.

`wikidata` content is **CC0-1.0** — no such caveat applies to names from that
source.

`ral` comes from an **MIT**-licensed repository. RAL is a trademark of RAL
gGmbH; this package ships factual colour values keyed by code, not the RAL
system itself, and is neither affiliated with nor endorsed by RAL gGmbH.

`pantone` needs the closest reading of the four. Its upstream repository
declares **no license**, and its README states that the colour names are
Pantone copyright while the hex values are published freely on pantone.com.
PANTONE is a trademark of Pantone LLC, and this package is neither affiliated
with nor endorsed by Pantone LLC. Make your own assessment before
redistributing this source, and note that it is opt-in: a consumer who never
passes `{ source: "pantone" }` never loads its chunk.

The obvious MIT-licensed Pantone alternative was evaluated and rejected on
accuracy rather than licensing. Its values are a naive CMYK to RGB conversion
rather than Pantone's published sRGB renderings, and are wrong throughout: it
gives 185 as `#FF173D` against a published `#E4002B`, and 354 as `#33FF1A`
against `#00B140`.

## Adding a source

Sources are namespaced and never merged. A new dataset means a new directory
under `src/sources/`, a `NameSource` descriptor, and generated chunks — no
changes to the lookup engine. Every result carries the `source` that produced
it, so a caller can never get an answer without knowing where it came from,
whether they named that source explicitly or let the default chain pick.
