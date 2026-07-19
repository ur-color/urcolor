# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Initial release: CSS Color 5 relative-color parsing as an opt-in plugin over
  `@urcolor/core`, activated explicitly via `registerRelativeColor()` (no
  side-effect import). Returns an idempotent dispose function.
- Relative syntax across all eight functional notations: `rgb()`, `hsl()`,
  `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, and `color()` (both the
  RGB-family and XYZ `color()` spaces, with their respective `r`/`g`/`b` and
  `x`/`y`/`z` channel keywords).
- Full CSS math grammar for channel and alpha expressions: `calc()`, `clamp()`,
  `min()`, `max()`, arbitrary nesting, parenthesised sub-expressions, and
  correct `*`/`/` over `+`/`-` precedence.
- Angle-unit support (`deg`, `grad`, `rad`, `turn`) in hue expressions.
- Zero runtime dependencies beyond `@urcolor/core`.

### Non-goals

- `var()`, `currentcolor`, `inherit`, and `attr()` as the origin color are
  **parse failures**, not silent defaults — this package has no stylesheet,
  cascade, or custom-property registry, so callers must resolve those first.
- `none` collapses to `0` rather than becoming a CSS missing component,
  matching the rest of the library's absolute parsers.
- Relative-color serialisation. Parsing resolves to an absolute color, so a
  parsed relative color round-trips as its computed absolute form.
