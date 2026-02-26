# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.2] - 2026-02-26

### Added

- `ColorRing`, `ColorWheel`, and `ColorTriangle` components
- Inner radius property for `ColorRing` components
- Dragging state management in `ColorArea` for improved rendering performance during interactions
- `useColor` composable for color state management
- New color space utilities and restructured color composables

### Fixed

- Resolve `workspace:*` dependency on `@urcolor/core` during publish so the package is installable outside the monorepo
- Enhanced drag handling in `ColorWheel` and `ColorTriangle` components

## [0.0.1] - 2026-02-16

### Added

- Initial release
- `ColorArea` component for 2D color selection
- `ColorSlider` component for single-channel color adjustment
- `ColorSwatch` component for color display
- `ColorSwatchGroup` component for color palette selection
