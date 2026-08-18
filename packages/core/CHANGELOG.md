# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [2.0.1] - 2026-08-19

### Fixed

- The published tarball now carries `src`. The `bun` export condition points
  at `./src/index.ts`, but `files` listed only `dist`, so `import ... from
  "@urcolor/core"` under Bun failed with `Cannot find module`. Node and
  bundlers were unaffected: they resolve the `import` condition.

## [2.0.0] - 2026-08-03

### Added

- `channelIndexOf` — the general form of `hueIndexOf`, now exported from
  `src/index.ts` rather than staying an internal of the space registry. It
  became part of the public surface because `@urcolor/shared`'s gradient
  renderer needs it now that the renderer no longer lives inside core.

### Removed

- **BREAKING:** Every rendering and picker-UI export is removed. Nothing here
  was color math — it moves to `@urcolor/shared`, unchanged:
  - **Gradient:** `drawGradient`, `drawLinearGradient`, `interpolateStops`,
    `sampleBilinearGrid`, `sampleChannelGrid`, `sampleTriangleGrid`,
    `samplePolarGrid`, `sampleConicRing`
  - **Geometry:** `polarToCartesian`, `cartesianToPolar`, `clampToCircle`,
    `normalizeAngle`, `triangleVertices`, `barycentricCoords`,
    `barycentricToCartesian`, `pointInTriangle`, `clampToTriangle`,
    `insetTriangle`, and the `Point`/`PolarCoord` types
  - **Space config:** `colorSpaces`, `getChannelConfig`, `displayToNative`,
    `nativeToDisplay`, and the `ChannelConfig`/`ColorSpaceConfig` types

  `@urcolor/core` is a color library now — parse, convert, serialize, gamut,
  mix, deltaE, contrast, named colors, the space registry — and nothing that
  paints a canvas or lays out a wheel.

### Migration

An import of any of the names above moves from `@urcolor/core` to
`@urcolor/shared`:

```diff
-import { drawGradient, insetTriangle, colorSpaces } from "@urcolor/core";
+import { drawGradient, insetTriangle, colorSpaces } from "@urcolor/shared";
```

## [1.0.0] - 2026-08-03

### Changed

- **`Color` instances are no longer `Object.freeze`d.** Immutability is now
  structural: `space` and `alpha` are `readonly`, the coordinate tuple lives in
  a private field, and `coords` returns a copy. Every method still returns a new
  `Color` and nothing mutates in place, so ordinary use is unaffected — but code
  that relied on `Object.isFrozen(color)` being `true`, or on a write to
  `color.space` throwing in strict mode, will notice. Freezing cost about 400 ns
  per instance, more than the color math itself.

  The class carries `markRaw`'s `__v_skip` flag on its prototype as a result:
  freezing was also what kept Vue from wrapping instances in a reactive proxy,
  and a private field cannot be read through one.

### Performance

- The grid samplers (`sampleChannelGrid`, `sampleTriangleGrid`,
  `samplePolarGrid`, `sampleConicRing`, `sampleBilinearGrid`) hoist everything
  loop-invariant out of the per-pixel path — patch objects, channel-name
  lookups, `Color` allocations and a second conversion. Output is byte-for-byte
  identical; a 128×128 bilinear plane went from ~35 ms to ~4.4 ms.
- `parse` dispatches on the notation name instead of offering the input to ten
  parsers in turn, each compiling a `RegExp` to decline it. Rejecting an
  invalid string is ~5× faster.
- `num()`, which every serializer calls three or four times, rounds by scaling
  instead of `toFixed`/`parseFloat` — ~115 ns to ~3 ns — falling back to the
  old path near rounding boundaries so results stay exactly equivalent.
- Precomputed lookup tables for channel indices, color keywords and hex bytes.

### Added

- A benchmark suite (`bun run --cwd packages/core bench`) measuring every
  operation against culori, chroma-js, colorjs.io, colord, tinycolor2 and
  @ctrl/tinycolor, with the results — wins and losses both — published at
  <https://urcolor.vercel.app/guide/benchmarks>.
- A vendored, zero-dependency CSS Color 4 library: `Color`, `parse`, `tryParse`,
  `serialize`, `convert`, `gamutMap`, `inGamut`, `interpolate`, `mix`, `deltaE`,
  `contrast`, the `manipulate` helpers, `NAMED_COLORS`, and the space registry.
- An `hsv` working space. It has no CSS notation, so it cannot be parsed or named as
  a serialisation format; an `hsv` color serialises down to `rgb()`.
- `registerParser(parser)` — register an additional color parser, consulted
  after all built-ins. Returns an idempotent dispose function. This is the
  extension point `@urcolor/relative` uses.
- `NOTATIONS` — the CSS-unit metadata for every functional notation, exported so
  plugins share core's unit conversions rather than duplicating them.
- `parseChannelToken` — resolve a single channel token (`"50%"`, `"none"`,
  `"0.5turn"`) to its native storage value, using a `NotationChannel`'s percent
  reference and unit mapping. Exported alongside the `ColorParser`,
  `NotationChannel`, and `NotationDef` types so plugins can parse or cross-check
  channel tokens without duplicating core's unit logic.

### Changed

- **BREAKING:** The `internationalized-color` dependency is removed. `@urcolor/core`
  now has no runtime dependencies.
- **BREAKING:** Color spaces are identified by CSS Color 4 ids. `rgb` → `srgb`,
  `p3` → `display-p3`, `a98` → `a98-rgb`, `prophoto` → `prophoto-rgb`.
- **BREAKING:** `ColorSpaceConfig.mode` is renamed to `.space` and typed `SpaceId`.
- **BREAKING:** `displayToCulori` / `culoriToDisplay` are renamed to `displayToNative`
  / `nativeToDisplay`; `ChannelConfig.culoriMin` / `.culoriMax` become `.nativeMin` /
  `.nativeMax`.
- **BREAKING:** Gradient functions take `SpaceId` rather than `string`.
- **BREAKING:** `Color.from()`, `Color#with()`, and `Color#get()` now **throw**
  where the previous library returned `null`/`undefined`. `Color.from()` throws
  on unparseable input — use `Color.parse()`, which returns `Color | null`, when
  a failure is a value rather than an error. `with()` throws `RangeError` for a
  channel absent from the target space and `TypeError` for a non-numeric channel
  value; `get()` throws `RangeError` for an unknown channel.
- **BREAKING:** `gamutMap()` changed in kind, not just in precision. It reduces
  Oklch chroma per CSS Color 4 and returns an Oklch color, where the previous
  implementation clipped channels in the destination space. Out-of-gamut colors
  will map to visibly different results.

### Removed

- **BREAKING:** Color naming (`nameColor`, `useLocale`, `nearestColors`,
  `lookupColor`, `listColorNames`, `translateColor`) and its 74 locale dictionaries.
  The unrelated 74-language *channel label* translations (`translations`,
  `getChannelLabel`) are unaffected.
- The `internationalized-color/css` side-effect import is no longer needed or
  available — the vendored registry requires no bootstrapping.

### Fixed

- `parseFn` now splits a functional notation's alpha at the first **depth-0**
  `/` rather than the first `/` anywhere, so a nested origin colour carrying
  its own alpha (e.g. `rgb(from rgb(1 2 3 / 40%) r g b / alpha)`) no longer
  mis-splits on the origin's own `/`.
- `tryParse` now treats a non-finite built-in parse result as a miss.
  Previously, a syntactically well-formed call with non-numeric tokens
  (`rgb(a b c)`) returned a colour with `NaN` coordinates instead of `null`;
  overflow literals like `rgb(1e999 0 0)` likewise returned `Infinity` instead
  of being rejected. Both now correctly yield `null`, and — as a side
  effect — this is what lets a registered parser (e.g. `@urcolor/relative`)
  see inputs that a built-in notation matched syntactically but couldn't
  parse numerically.

### Migration

| old | new |
| --- | --- |
| `Color.parse(v)` → `Color \| undefined` | `Color.parse(v)` → `Color \| null` |
| `.set({ mode, ...channels })` | `.with({ space, ...channels })` |
| `.set({ alpha: n })` | `.withAlpha(n)` |
| `.to("rgb")` → nullable | `.to("srgb")` → non-null |
| `.toHex()` → nullable | `.toString("hex")` → `string` |
| `.mode` | `.space` |
| `import "internationalized-color/css"` | delete the line |

## [0.0.4] - 2026-02-27

- Bumped version of `internationalized-color` to `1.1.1`

## [0.0.2] - 2026-02-26

### Added

- `insetTriangle` function for triangle manipulation with thumb alignment support

### Fixed

- Vue components update

## [0.0.1] - 2026-02-16

### Added

- Initial release
- Immutable `Color` class wrapping culori color objects
- Color naming engine with k-d tree nearest-neighbor lookup in OkLab space
- Support for 74 languages from the UW multilingual color survey dataset
- Three naming tiers: `basic`, `extended`, `traditional`
- Color name translation between locales
- `useLocale()` function-based API for locale registration
- Standalone functions: `nameColor()`, `nearestColors()`, `lookupColor()`, `listColorNames()`, `translateColor()`
- `getLocale()` to retrieve a registered locale dictionary
- Utility modules for parsing, conversion, mixing, and color manipulation
- `HSV` color mode support
- Tree-shakeable per-language locale dictionaries
