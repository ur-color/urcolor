# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

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
