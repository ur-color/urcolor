# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- **BREAKING:** Depends on `@urcolor/shared` in place of `@urcolor/primitives`,
  and now requires `@urcolor/core ^2.0.0`.
- **BREAKING:** `Color` now comes from `@urcolor/core`'s vendored, zero-dependency
  CSS Color 4 library instead of `internationalized-color`. `color-space` prop
  values (and any other space id passed to a component) use CSS Color 4 ids —
  `rgb` → `srgb`, `p3` → `display-p3`, `a98` → `a98-rgb`, `prophoto` →
  `prophoto-rgb`. See the migration table in
  [`packages/core/CHANGELOG.md`](../core/CHANGELOG.md) for the full `Color` API
  changes (`.set()` → `.with()`/`.withAlpha()`, `.mode` → `.space`,
  `Color.parse()` returning `null` instead of `undefined`, etc.).
