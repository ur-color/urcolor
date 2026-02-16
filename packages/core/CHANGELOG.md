# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
