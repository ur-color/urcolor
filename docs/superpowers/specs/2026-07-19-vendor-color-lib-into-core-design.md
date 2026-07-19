# Vendor a color library into `@urcolor/core`

**Date:** 2026-07-19
**Status:** Approved

## Goal

Remove the `internationalized-color` dependency from the repository. Replace it with a
zero-dependency color library vendored into `packages/core`, based on
`../urvis/packages/color`.

## Motivation

`internationalized-color` is a culori-backed package supplying three things:

1. A `Color` class (culori `mode` strings, nullable conversions).
2. Color *naming* across 74 locales (`nameColor`, `useLocale`, `nearestColors`).
3. A `/css` side-effect import that registers culori color-space modes.

Only the `Color` class is load-bearing. `packages/core` itself uses it in one file
(`gradient.ts`); `packages/vue`, `packages/react`, and the docs use it widely. The naming
feature appears in two docs demos. Carrying culori plus 74 locale dictionaries for one
class is disproportionate, and the culori mode ids (`rgb`, `p3`, `a98`) diverge from the
CSS Color 4 ids the project otherwise targets.

`../urvis/packages/color` is a pure-TypeScript, zero-dependency CSS Color 4 toolkit with a
functional core and an immutable `Color` facade. It is a better base.

## Decisions

- **Full replace.** `@urcolor/core` exports its own `Color`. `packages/vue`,
  `packages/react`, and the docs migrate to it. This is a breaking public API change.
- **Drop color naming.** No naming, no locale dictionaries, no k-d tree. Docs claims and
  the two demos that use it are rewritten.
- **Adopt CSS Color 4 space ids** and add a non-CSS `hsv` working space.
- **Vendored code lives in `packages/core/src/color/`**, re-exported flat from the package
  root.
- **Port the upstream test suite.**

Note: `packages/core/src/i18n/` holds *channel-label* translations (74 languages). That is
a separate feature from color naming and stays untouched.

## Architecture

### File layout

```
packages/core/src/
  color/                     vendored from ../urvis/packages/color
    types.ts                 SpaceId, Coords, ColorObject, SpaceDef
    registry.ts              SPACES map, spaceDef, hueIndexOf
    matrix.ts  polar.ts  components.ts
    spaces/                  srgb, srgbLinear, hsl, hsv (new), hwb, lab, lch,
                             oklab, oklch, p3, a98, prophoto, rec2020, xyz,
                             rgbSpace, colorFn
    parse.ts  serialize.ts  convert.ts
    gamut.ts  interpolate.ts  manipulate.ts  deltaE.ts  contrast.ts
    named.ts                 CSS named colors (required by parse)
    color.ts                 Color class
    index.ts                 barrel
  gradient.ts  geometry.ts  color-spaces.ts  i18n/     existing
  index.ts                   re-exports color/* alongside existing exports
```

Also ported: `tagged.ts` — it is 28 lines of compile-time-only space tagging, and both
`convert.ts` (`ColorIn`) and `gamut.ts` (`OklchColor`) depend on its types. It is kept as an
internal module; only its types are re-exported from the package root, not its `color()`
helper.

Not ported from urvis: `random.ts` — unused by urcolor.
Not ported from `internationalized-color`: `naming.ts`, `kdtree.ts`, `locales/`,
`bootstrap/css.ts`.

Build artifacts are not copied: the upstream `src/` directory contains stale `.js`,
`.js.map`, and `.d.ts` files beside its sources. Only `.ts` sources move. The equivalent
stale `.d.ts` files already sitting in `packages/core/src/` (`index.d.ts`, `gradient.d.ts`,
`geometry.d.ts`, `color-spaces.d.ts`, `env.d.ts`) are deleted.

### Package manifests

- `packages/core/package.json` — `dependencies` becomes empty.
- Root `package.json` — drop `internationalized-color`.
- `docs/.vitepress/config.ts` — remove `internationalized-color` from `resolve.dedupe` and
  `optimizeDeps.include`.

### Public surface

`@urcolor/core` re-exports, alongside its existing gradient / geometry / color-space /
i18n exports:

```ts
export { Color, type ColorPatch } from "./color/color";
export { parse, tryParse } from "./color/parse";
export { serialize, type ColorFormat } from "./color/serialize";
export { convert } from "./color/convert";
export { gamutMap, inGamut } from "./color/gamut";
export { interpolate, mix, type HueMethod, type InterpolateOptions, type MixOptions } from "./color/interpolate";
export { alpha, complement, darken, desaturate, lighten, negate, rotateHue, saturate } from "./color/manipulate";
export { deltaE, deltaEOK, type DeltaEMethod } from "./color/deltaE";
export { contrast, type ContrastAlgorithm, type ContrastOptions } from "./color/contrast";
export { NAMED_COLORS, parseNamed } from "./color/named";
export { SPACES, spaceDef, hueIndexOf } from "./color/registry";
export type { ColorObject, Coords, SpaceDef, SpaceId } from "./color/types";
```

## `Color` API

The upstream `Color` class is taken as-is, with two additions urcolor requires.

### Addition 1 — nullable `parse`

```ts
static parse(input: string): Color | null
```

Wraps `tryParse`. `Color.from()` keeps throwing. Downstream has 34 call sites that treat
parse failure as a value (`Color.parse(v) ?? undefined`), so a nullable static is needed.

### Addition 2 — `with()` accepts a target space

```ts
with(patch: { space?: SpaceId } & Record<string, number>): Color
```

When `patch.space` is present, the color is converted to that space first, then the channel
values are applied. Without `space`, behaviour is unchanged.

This exists because eight downstream files call
`.set({ mode: colorSpace, ...channelUpdates })` — a convert-and-set in one step. `with({
space, ...channels })` carries that over 1:1. Channel names are validated against the
*target* space; an unknown channel throws `RangeError`, matching existing `with()`
behaviour.

### Migration table

| `internationalized-color` | `@urcolor/core` | approx. sites |
| --- | --- | --- |
| `Color.parse(v)` → `Color \| undefined` | `Color.parse(v)` → `Color \| null` | 34 |
| `.set({ mode, ...channels })` | `.with({ space, ...channels })` | 20 |
| `.set({ alpha: n })` | `.withAlpha(n)` | 10 |
| `.to("rgb")` → nullable | `.to("srgb")` → non-null | 12 |
| `.toHex()` → nullable | `.toString("hex")` → `string` | 3 |
| `.mode` | `.space` | 1 |
| `.alpha` | `.alpha` (unchanged) | — |
| `import "internationalized-color/css"` | delete the line | 25 |

`.to()` and `.toString("hex")` returning non-nullable values removes the surrounding `?.`
and `??` fallbacks at every call site.

### Space id renames

`packages/core/src/color-spaces.ts` currently keys its `colorSpaces` config by culori mode
strings. Those become CSS Color 4 ids:

| old | new |
| --- | --- |
| `rgb` | `srgb` |
| `p3` | `display-p3` |
| `a98` | `a98-rgb` |
| `prophoto` | `prophoto-rgb` |
| `rec2020` | `rec2020` (unchanged) |
| `hsl`, `hsv`, `hwb`, `lab`, `lch`, `oklab`, `oklch` | unchanged |

The `ColorSpaceConfig.mode` field is renamed to `space` and typed `SpaceId` rather than
`string`, so a bad id is a compile error. Every downstream `color-space` prop default,
Storybook arg, and docs literal using the old ids is updated.

Three more names in that module still say "culori" and become inaccurate once culori is
gone. They are renamed with it, in the same breaking change:

| old | new |
| --- | --- |
| `displayToCulori()` | `displayToNative()` |
| `culoriToDisplay()` | `nativeToDisplay()` |
| `ChannelConfig.culoriMin` / `.culoriMax` | `.nativeMin` / `.nativeMax` |

## The `hsv` space

`hsv` is absent from the upstream library but required by `color-spaces.ts` and the
picker components.

`packages/core/src/color/spaces/hsv.ts` defines it: channels `["h", "s", "v"]`,
`hueIndex: 0`, hue in degrees, `s` and `v` in `0..1`. It bridges through sRGB via
`toSrgb`/`fromSrgb`, mirroring `hwb.ts`. It is registered in `SPACES` and added to the
`SpaceId` union.

`hsv` is not a CSS Color 4 space and has no valid CSS notation. Therefore:

- `parse()` does not accept `hsv(...)` — it is not CSS syntax.
- `serialize()` / `toString()` with no explicit format converts an `hsv` color to `srgb`
  and emits `rgb(...)`. Concretely, `SERIALIZERS.hsv` is
  `(c) => serializeRgb(convert(c, "srgb"))`, so the `Record<SpaceId, Serializer>` in
  `serialize.ts` stays total after `hsv` joins `SpaceId`.
- `hsv` is not a valid *output* format. `ColorFormat` narrows to
  `Exclude<SpaceId, "hsv"> | "hex"`, making `toString("hsv")` a compile error.
- `hsv` is reachable only as a working space, via `.to("hsv")`, `Color.fromHsv()`, or
  `new Color("hsv", …)`.

## Documentation changes

The naming feature disappears, so:

- `docs/.vitepress/components/HeroDemo.vue` — drop the color-name readout and the
  `nameColor` / `useLocale` / `allLocales` imports.
- `docs/components/vue/demo/FullPreview.vue` — same, including its locale selector.
- `docs/guide/features.md` — the page currently leads with "74 languages powered by
  `internationalized-color`". Rewrite it around the surviving i18n feature: the 74-language
  **channel labels** in `packages/core/src/i18n/`.
- `docs/guide/index.md`, `README.md`, `packages/core/README.md` — drop
  `internationalized-color` attribution; describe core as a zero-dependency color library.
- All demo and story files — delete `import "internationalized-color/css";`, and change
  `import { Color } from "internationalized-color"` to `from "@urcolor/core"`.
- `CLAUDE.md` — the documented demo-component import order names
  `import "internationalized-color/css"`. Update that convention to the new import.

## Testing

The upstream test suite is ported to `packages/core/test/color/`, adapted to CSS space ids,
minus `random.test.ts` (whose module is not ported). Ported files: `parse`, `convert`,
`serialize`, `gamut`, `deltaE`, `contrast`, `interpolate`, `manipulate`, `named`, `color`,
`tagged`, and the per-space tests (`spaces/hsl`, `hwb`, `lab`, `lch`, `oklab`, `srgb`,
`xyz`, `colorFn`, `wideGamut`).

Import specifiers in the vendored sources are rewritten to drop their `.ts` extensions,
matching the existing `packages/core/src` convention. This is not cosmetic: core's
`build:types` runs `tsc --emitDeclarationOnly`, which would otherwise emit `.d.ts` files
containing `from "./types.ts"` specifiers that resolve to nothing in `dist/`.

New tests:

- `hsv` round-trip — `srgb → hsv → srgb` within `1e-6`, covering the hue 0/360 boundary,
  achromatic input (`s = 0`), and black (`v = 0`).
- `hsv` serialization falls back to `rgb(...)`.
- `with({ space, ...channels })` converts before applying, and throws `RangeError` on a
  channel that does not exist in the target space.
- `Color.parse` returns `null` for unparseable input.

The four existing core test files (`color-spaces`, `geometry`, `gradient`, `i18n`) are
updated for the renamed space ids and continue to pass.

## Verification

All four gates must pass before the work is considered complete:

1. `bun test` — core test suite green.
2. `bun run lint` — eslint plus `vue-tsc --noEmit` clean.
3. `bun run docs:build` — builds all three packages, VitePress, and Storybook.
4. `grep -ri internationalized-color` across the repo returns matches only in `bun.lock`
   and historical `CHANGELOG.md` entries.

## Risks

**Conversion math drift.** culori and the vendored library are independent implementations.
Values will differ in the last few decimal places, and gamut mapping differs in kind:
culori clips channels, whereas the vendored `gamutMap` reduces Oklch chroma and returns an
Oklch color. Wide-gamut gradients may render subtly differently. This is accepted; the
ported test suite is the safety net, and the Oklch approach is the more correct one.

**Breaking API.** Consumers of `@urcolor/vue` and `@urcolor/react` who construct `Color`
themselves must migrate. This is intentional and lands in the `release/v1` branch, where a
breaking change is appropriate. All three package CHANGELOGs document the migration table
above.
