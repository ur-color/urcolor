# Color Naming

`@urcolor/i18n` answers "what does this colour get called?" in a given
language, from either of two independent sources: `uwdata`, crowdsourced
colour-perception data that models how speakers spontaneously name a region
of colour space, or `wikidata`, an editorial catalogue of discrete named
colours contributed by Wikidata editors. They answer different questions —
see [Sources](#sources) below. By default `uwdata` answers the 20 locales it
covers and `wikidata` answers the rest; whichever one answered is always
named by `resolvedOptions().source`.

## Basic usage

```ts
import { ColorNames } from "@urcolor/i18n";
import { Color } from "@urcolor/core";

const names = await ColorNames.load("ko", { source: "uwdata" });
names.of(Color.parse("#3b82f6")!); // "파랑색"
```

The API deliberately mirrors the built-in `Intl` classes, so it should feel like
native platform localization: a constructor that takes locales and options,
`of()` for the common case, `resolvedOptions()` to see what was negotiated, and a
static `supportedLocalesOf()`.

## Loading

Language data ships as lazily loaded chunks, so construction is asynchronous:

```ts
const names = await ColorNames.load(["ko-KR", "en"], { source: "uwdata" });
names.resolvedOptions().locale; // "ko" — negotiated by BCP 47 lookup
```

Once a language is loaded, the synchronous constructor works for it:

```ts
new ColorNames("ko", { source: "uwdata" }); // fine — chunk is cached
new ColorNames("ru", { source: "uwdata" }); // throws — call load() first
```

## Probabilities and confidence

For `uwdata`'s full and hue models, colour naming is not deterministic:
`resolve()` exposes the sampled distribution of what study participants
actually called a colour.

```ts
names.resolve(Color.parse("#3b82f6")!);
// {
//   name: "파랑색",
//   term: "파랑",
//   probability: 0.79,
//   candidates: [{ name, term, probability }, …],
//   model: "full",
//   source: "uwdata",
//   coverage: "exact",
//   binDistance: 0,
// }
```

`wikidata`'s palette model is different: it has no sampled distribution at
all, just a catalogue of discrete colours. There, `probability` is a
**proximity confidence** derived from Oklab distance to the nearest
catalogued colour — not a naming frequency — and `candidates` ranks the
nearest few catalogued colours rather than the most commonly used terms.
`binDistance` is always the underlying Oklab distance, for either model, so
it's the number to read when you need ground truth rather than a
model-dependent score.

`coverage` is the honest bit either way. `"exact"` means the colour matched
real data — a populated bin for `uwdata`, or (within a tiny epsilon) a
catalogued hex for `wikidata`. `"nearest"` means the answer came from
nearby — a neighbouring bin, or the closest catalogued colour within
`maxDistance`. `"none"` means the dataset has nothing to say — `of()` returns
`undefined` rather than guessing. `resolve()` always reports the *true*
`coverage` and `binDistance`, regardless of the `fallback` option —
`fallback` only changes what `of()` does with a `"nearest"` result, so you
can always tell whether a nearby answer exists even when `of()` is
configured to withhold it.

For hue-model locales (`ar da el hu it tr`), `resolve()` also returns
`hueProjectionDistance`: the Oklab distance from the query colour to the fully
saturated colour at the same hue. The hue model only describes that saturated
ring, so a large value means the model has nothing meaningful to say about
this particular colour. It's `undefined` for full-model locales. Unlike the
full model, the hue model can't fall back to a neighbouring bin — a lookup
either lands in a populated bin (`"exact"`) or misses (`"none"`) — so it never
reports `"nearest"`, and `fallback: "none"` is a no-op for these 6 locales.

::: warning Achromatic extremes are unreliable (uwdata full model)
Colours near the edges of the sampled space — very light, very dark,
near-grey — have little or no direct data, so a `"nearest"` answer there can
be a real perceptual distance from what a speaker would actually say, while
still reporting a plausible-looking probability. This is specific to
`uwdata`'s full model — `wikidata`'s palette lookup has no bins to run out
of data near, though a `"nearest"` answer there can still be far from the
query colour if `maxDistance` is generous; check `binDistance`.

For example, pure white (`#ffffff`) resolves to `연분홍색` ("light pink", 36%
probability, `binDistance` 0.050) in Korean, and to `浅蓝色` ("light blue",
22%, `binDistance` 0.071) in Chinese — both wrong, both confident-looking.

Check `coverage` and `binDistance` on `resolve()` to detect this, or pass
`fallback: "none"` if you'd rather get `undefined` than a nearest-bin guess
near those extremes.
:::

## Options

| Option | Values | Default | Meaning |
| --- | --- | --- | --- |
| `source` | source id, or an array of them | `["uwdata", "wikidata"]` | Which dataset(s) answer, in priority order. A single id pins the instance and throws if that source lacks the locale |
| `style` | `"long"` \| `"short"` | `"long"` | Display name vs. matching key |
| `fallback` | `"nearest"` \| `"none"` | `"nearest"` | Whether a `"nearest"` result is withheld by `of()`. Meaningfully filters full-model results; a no-op for hue-model locales (see above); highly consequential for `wikidata`'s palette locales, where almost every query reports `"nearest"` |
| `maxDistance` | number | `0.075` (full/hue), `0.15` (palette) | Oklab search radius used at lookup time — unconditionally, not only when `fallback` is `"nearest"`. Wider by default for `wikidata` because 964 catalogued colours leave real gaps a bin-tuned radius would miss |
| `topN` | number | `5` | Candidates returned by `resolve()` |

## Reverse lookup

```ts
names.colorOf("파랑"); // Color — the term's average colour
names.resolveColorOf("파랑");
// { color, term: "파랑", name: "파랑색", pCT: 0.025 }
```

`pCT` is upstream's "how strongly this term identifies its own colour"
signal — the maximum across the term's bins, since that's the bin where the
term is the *most* distinctive label for its colour. It's `null` when the
source data doesn't carry that signal for this term's model at all — which is
always the case for `wikidata`: the palette model has no per-term bin data of
any kind, so every `resolveColorOf()` result from that source has `pCT: null`
unconditionally, not as a per-term gap.

## Coverage by language

Colour-name data comes from two independent sources.

`uwdata` spans **20 languages**: 14 with a full-colour-space model (`de en es
fa fi fr ko nl pl pt ro ru sv zh`) and 6 with a hue-circle model that only
describes saturated colours (`ar da el hu it tr`). Sample volume differs by
orders of magnitude between languages — English alone accounts for hundreds
of terms, while languages like Romanian have only a handful — so
`resolvedOptions().coverage` (the fraction of sRGB-reachable Oklab space that
has data) ranges from about 96% (en) down to single digits (ro).

`wikidata` spans **298 languages** with a discrete-palette model: 964
catalogued colours, each with one exact sRGB value, named in whatever
languages Wikidata editors have supplied. This is where the long tail
lives — languages like Georgian and Cherokee have colour names here and none
in `uwdata`. `resolvedOptions().coverage` there means `terms / itemCount`
instead — the fraction of the *catalogue* this language names, not of Oklab
space — and ranges from 93% (en, 897 terms) down to a single term for the
thinnest locales; Georgian's 14-term chunk (coverage 1.45%) can't name an
arbitrary colour, but it resolves `colorOf("ყვითელი")` correctly, which is
exactly the capability `uwdata` lacks there.

## Sources

Datasets are namespaced and never merged, because they use different
methodologies and blending them would produce answers no source actually
supports. Exactly one source answers an entire `ColorNames` instance, chosen
at load time and fixed thereafter.

Omitting `source` walks the default chain — `uwdata` first, then `wikidata`.
Provenance is then implicit in the *request* but still explicit in the
*result*: `resolve().source` and `resolvedOptions().source` always name the
dataset that answered, and `resolvedOptions().sources` reports the whole chain
that was considered. `getDefaultSources()` reads that chain directly —
`["uwdata", "wikidata"]` — without constructing a `ColorNames` instance first.

Requesting a tag one source has exactly beats a tag another only reaches by
stripping subtags, so `load("zh-Hant")` gets `wikidata`'s Traditional Chinese
rather than `uwdata`'s Simplified `zh`. `load("zh")` still gets `uwdata`.

```ts
import { listSources, getSource } from "@urcolor/i18n";

getSource("uwdata").citation; // attribution text to display
getSource("uwdata").disclaimer;
getSource("wikidata").citation; // same shape, different provenance
getSource("wikidata").disclaimer;
```

Please surface the citation and disclaimer in any UI built on this data.

`uwdata` covers 20 locales but several thinly — Romanian has 4 terms, Finnish
11, Swedish 16, where `wikidata` has 65, 65, and 170. The chain is
locale-level, so `load("ro")` stays on `uwdata`'s 4 terms. That is deliberate:
switching sources on a coverage threshold would return perceptual data for one
language and catalogue data for another with no defensible cutoff. Pass
`{ source: ["wikidata"] }` when you want breadth over perceptual fidelity.

## Channel labels

```ts
import { ChannelNames } from "@urcolor/i18n";

new ChannelNames("ko").of("hue"); // "색조"
```

77 locales, synchronous, no source concept — these strings are hand-authored
rather than derived from a dataset. See [Internationalized](/guide/features#languages)
for the full list.
