# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [2.0.1] - 2026-08-19

### Fixed

- The published tarball now carries `src`. The `bun` export condition points
  at `./src/index.ts`, but `files` listed only `dist`, so `import ... from
  "@urcolor/i18n"` under Bun failed with `Cannot find module`. Node and
  bundlers were unaffected: they resolve the `import` condition.

## [2.0.0] - 2026-08-03

### Added

- Initial release: reverse color naming — nearest name for any color — and
  translated channel labels, over `@urcolor/core`.
- Two data sources: `uwdata` (20 languages, full colour-space model) and
  `wikidata` (298 languages, discrete palette). Each language loads as its own
  chunk behind a dynamic import, so a bundle carries only the languages it asks
  for.
- `ChannelNames`, translating channel labels into 77 languages, with negotiation
  down to English for a locale that has no table.
- Requires `@urcolor/core ^2.0.0`.
