# `@urcolor/ncs`: NCS Notation for `@urcolor/core`

**Date:** 2026-08-12
**Status:** Approved design, not yet implemented

## Purpose

Teach `Color.parse()` the Natural Colour System notation, and serialise a colour
back to it. An opt-in parser plugin in the shape of `@urcolor/relative`, not
part of core.

```ts
import { Color } from "@urcolor/core";
import { registerNcsColor, toNcs } from "@urcolor/ncs";

registerNcsColor();
Color.parse("S 1050-Y90R");
toNcs(Color.parse("#eb7f7a")!); // "S 1050-Y90R"
```

This also closes a gap opened by the catalogue split in
[the catalogue-sources design](./2026-08-12-catalogue-sources-and-name-hygiene-design.md):
NCS was removed from `@urcolor/i18n`'s `wikidata` source with no replacement,
because no openly licensed NCS *dataset* exists. A notation parser is a
different thing from a dataset, and is the form the system actually wants.

## Why an approximation, stated up front

NCS Colour AB holds the Natural Colour System as proprietary and publishes no
open notation-to-sRGB mapping. Every implementation, including this one, is an
approximation. The package says so in its README, in the `registerNcsColor`
docblock, and in the guide, and directs anyone matching physical paint to an
official fan deck.

Two prior attempts were measured and rejected as the basis for this work.

[m90/ncs-color](https://github.com/m90/ncs-color) (MIT, the de-facto community
implementation) uses per-channel circular-arc heuristics. It returns `#F15045`
for `S 1050-Y90R` where published references cluster around `#EB7F7A`, so its
green channel is out by roughly 47/255.

[Zache/ncs-color](https://github.com/Zache/ncs-color) (MIT) interpolates HSV
between the four unique hues, which is the better idea, but it is broken as
published: it assigns `res` and then reads an undefined `result`. Its hue
interpolation is also linear across a circle where red sits at 345 degrees, so
the `Y` to `R` arc runs the wrong way round.

Reimplementing rather than vendoring therefore costs little and leaves the
package MIT-clean with no third-party licence question.

### A wrong turn worth recording

The first prototype anchored the model on Wikipedia's four NCS "elementary
hue" hex values (`#FFD300`, `#C40233`, `#009F6B`, `#0087BD`). Those are the
*concept* colours of the unique hues, not the sRGB renderings of the
corresponding notations, and anchoring on them produced `#B65C69` for
`S 1050-Y90R`, a dusty pink where the answer is a strong red.

The lesson generalises: validate against published values for the *exact
notation being converted*, never against a related-looking figure.

## Grammar

`src/notation.ts` owns the string form and nothing else. It has no colour
maths, so it is exactly specified and exactly testable, while the uncertain
part of the package stays quarantined in `src/model.ts`.

Accepted case-insensitively:

| Form | Meaning |
| --- | --- |
| `S 1050-Y90R` | blackness 10, chromaticness 50, hue 90% from Y toward R |
| `1050-Y90R` | the same, prefix omitted |
| `NCS S 1050-Y90R` | the same, full prefix |
| `NCS 1050-Y90R` | the same, `NCS` without `S` |
| `S 0500-N` | neutral: blackness 05, chromaticness 00 |
| `ncs(1050-Y90R)` | functional wrapper around any of the above |

The functional form exists because it fits core's `name(` dispatch and reads
naturally beside `oklch(...)`. The bare forms exist because that is how NCS is
written everywhere outside this package. Supporting both costs one branch.

Two rules return `null` rather than a wrong colour:

- **`blackness + chromaticness <= 100`**, which NCS requires. `S 6050-Y` is not
  a colour, and answering with one would be an invention.
- **Hue pairs must name adjacent hues.** The circle is `Y -> R -> B -> G -> Y`,
  and NCS holds that no hue resembles both members of an opponent pair, so
  `Y90R` and `B50G` are legal while `R90G` and `Y50B` are not.

`S` denotes the NCS 1950 standard edition. It is accepted and ignored: this
package models one edition, and silently discarding the marker is better than
rejecting the notation most users will paste.

## The conversion model

`src/model.ts` holds the approximation, forward and inverse.

NCS defines a colour by blackness `s`, chromaticness `c`, and whiteness
`w = 100 - s - c`. Working backwards from published values shows a consistent
structure:

| Notation | Published | HSV | Implies |
| --- | --- | --- | --- |
| `S 0580-Y` | `#FFD200` | v 100, s 100, h 49 | |
| `S 1050-Y90R` | `#EB7F7A` | v 92.2, s 48.1, h 2.6 | value ceiling ~103 |
| `S 2030-Y90R` | `#D39089` | v 82.7, s 35.1, h 5.7 | value ceiling ~103 |
| `S 4030-B50G` | `#3A8383` | v 51.4, s 55.7, h 180 | value ceiling ~86 |
| `S 0500-N` | `#F1EFEB` | v 94.5, s 2.5 | |

Value is `(1 - blackness/100)` times a per-hue ceiling. The two `Y90R` samples
independently imply 102.4 and 103.4, which is the model agreeing with itself
across two different blackness values rather than being fitted to one point.
Saturation tracks `c / (c + w)`, the chromaticness share of the non-black part,
scaled by a per-hue factor.

The forward model is therefore:

```
h = H(hue)
s = c / (c + w) * S(hue)
v = (1 - blackness / 100) * V(hue)
```

evaluated in core's registered `hsv` space, with `H`, `S` and `V` each
interpolated between four per-primary constants around the `Y -> R -> B -> G`
circle. Interpolation is done on the circle with correct wrapping, which is the
bug that makes Zache's `Y90R` land in magenta.

The inverse solves the same three equations for blackness, chromaticness and
hue fraction. It is analytic, not a nearest-neighbour search over samples, so
serialisation round-trips by construction.

### Neutrals

The `-N` axis bypasses the hue machinery entirely: chromaticness is zero, so
`v = 100 - blackness` and saturation is zero. `S 0500-N` becomes `#F2F2F2`.

Published neutral references carry a slight warm tint, `#F1EFEB` for
`S 0500-N`, which this model does not reproduce. That is deliberate. The tint
is a paper-white simulation rather than a property of the notation, and
reproducing it would put a colour cast on every grey the package returns. The
deviation is about ΔE00 1.5, comfortably inside the budget below, and the
neutral tests assert a pure grey rather than the published tint.

Symmetrically, `toNcs()` emits the `-N` form when the input's chromaticness
solves to zero, so achromatic colours round-trip as neutrals rather than
acquiring an arbitrary hue.

### The twelve constants are fitted

`H`, `S` and `V` at each of the four primaries are fitted against the reference
set below, minimising ΔE00, rather than being read off any single colour. The
fit is the thing the accuracy tests check, and the fitted values ship as
documented constants with the reference figures that produced them.

## Serialisation

`toNcs(color: Color): string` returns exact two-digit values, unsnapped, for
example `S 1347-Y83R`.

Unsnapped is the honest choice. NCS standard samples sit on a coarse grid, so
snapping would make every output orderable as real paint, but it would also
move the colour silently and break round-tripping, and the standard sample list
is NCS Colour AB's copyrighted data. Exact output round-trips through `parse()`
and claims nothing it cannot back. The docs state plainly that an arbitrary
output does not necessarily name a real NCS sample.

Out-of-gamut colours are **clamped**, and the function always returns a
notation. Blackness and chromaticness are clamped into range and the
`s + c <= 100` constraint is honoured, so every output re-parses. The README
notes that a colour far outside what NCS can express still receives a
confident-looking notation, and points at the round-trip check as the way to
detect it.

## Package layout

Mirrors `packages/relative` file for file.

| Path | Responsibility |
| --- | --- |
| `src/notation.ts` | NCS string to and from `{ blackness, chromaticness, hue }`. Grammar only |
| `src/model.ts` | The approximation, forward and inverse, plus the fitted constants |
| `src/parse.ts` | The `ColorParser` handed to `registerParser` |
| `src/index.ts` | `registerNcsColor()`, `toNcs()`, and the public types |

`package.json` matches `@urcolor/relative`: `@urcolor/core` as the only
dependency, `bun build --external @urcolor/core`, `files: ["dist"]`,
`publishConfig.access: "public"`. `tsconfig.build.json` is copied unchanged
apart from the package name.

Registration is not a side effect. `registerNcsColor()` returns an idempotent
dispose function, matching `registerRelativeColor()`, so test teardown and
hot-reload behave. Without it, `Color.parse("S 1050-Y90R")` returns `null` like
any other unrecognised string.

Registered parsers run after every built-in, so this package cannot shadow or
slow a standard notation. Nothing here throws; every failure path returns
`null`.

## Accuracy posture

`test/fixtures/reference.json` holds published notation and sRGB pairs: at
least 24, with at least four in each quadrant of the hue circle (`Y..R`,
`R..B`, `B..G`, `G..Y`), at least four on the neutral axis, and a spread of
blackness and chromaticness rather than one row of each. They are test fixtures
only. `files: ["dist"]` excludes them, so no third-party colour data reaches
the published package.

Pinned as tests:

- every chromatic reference colour within **ΔE00 ≤ 5** of its published value
- **mean ΔE00 ≤ 3** across the chromatic set
- round-trip `parse -> toNcs -> parse` stable within **ΔE00 ≤ 1**
- the neutral axis is pure grey, `r === g === b`, with `v = 100 - blackness`

If the fit cannot reach those numbers, that gets reported rather than the
threshold quietly loosened. A hidden accuracy failure is the same defect as the
Pantone dataset this project already rejected once.

Core exports `deltaE(a, b, "2000")`, so the tests measure rather than eyeball.

## Testing

| Test | Covers |
| --- | --- |
| `test/notation.test.ts` | All four prefix forms, the functional wrapper, neutrals, case-insensitivity, and both rejection rules |
| `test/model.test.ts` | Forward against the reference set with ΔE00 thresholds, the analytic inverse, out-of-gamut clamping, and the `s + c <= 100` constraint on output |
| `test/parse.test.ts` | Registration, dispose idempotence, `null` before registration, and that registering never shadows a built-in notation |
| `test/roundtrip.test.ts` | `parse -> toNcs -> parse` stability across a generated sweep of the notation space |

## Monorepo wiring

- Root `package.json` `build` script gains `bun run --cwd packages/ncs build`,
  ordered after `packages/core`.
- `docs/guide/ncs-colors.md` is added alongside `relative-colors.md` and
  registered in the `docs/.vitepress/config.ts` sidebar, per `CLAUDE.md`.
- The guide page opens with a mermaid diagram of the parse and serialise paths,
  per the diagram convention in `CLAUDE.md`.

## Explicitly out of scope

- Registering an `ncs` colour *space* in core. The model targets `hsv` and
  converts from there; a space would imply NCS coordinates are a colour space
  core can interpolate in, which they are not.
- Snapping output to the NCS standard sample grid. It needs NCS Colour AB's
  copyrighted sample list and breaks round-tripping.
- NCS editions other than the 1950 standard.
- Restoring the four NCS entries to `@urcolor/i18n`. This package supersedes
  that need: `S 0580-Y` parses, so the colour is reachable by notation.
