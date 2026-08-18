# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [1.0.1] - 2026-08-19

### Fixed

- The published tarball now carries `src`. The `bun` export condition points
  at `./src/index.ts`, but `files` listed only `dist`, so `import ... from
  "@urcolor/shared"` under Bun failed with `Cannot find module`. Node and
  bundlers were unaffected: they resolve the `import` condition.

## [1.0.0] - 2026-08-03

### Changed

- **Renamed from `@urcolor/primitives`.** Same package, new name — it never
  held UI primitives in the Radix/Base UI sense, only the behavior every
  framework binding shares, and the rename rides along with the boundary
  change below rather than costing a second major.

### Added

- Initial release: the framework-agnostic behavior every binding shares —
  pointer drag tracking, keyboard interaction, channel models, slider and
  toggle state, canvas helpers, data attributes and label resolution.
- Consumed by `@urcolor/vue`, `@urcolor/react`, `@urcolor/svelte` and
  `@urcolor/angular`. It is published so those packages can depend on it, not
  because applications are expected to use it directly.
- The rendering and picker-UI surface moved from `@urcolor/core`, unchanged:
  - A WebGL gradient renderer (`drawGradient`, `drawLinearGradient`) with a
    CPU fallback — the grid samplers `sampleBilinearGrid`,
    `sampleChannelGrid`, `sampleTriangleGrid`, `samplePolarGrid`,
    `sampleConicRing`, and `interpolateStops`.
  - Polar and triangle geometry helpers for wheels, rings and triangle
    pickers: `polarToCartesian`, `cartesianToPolar`, `clampToCircle`,
    `normalizeAngle`, `triangleVertices`, `barycentricCoords`,
    `barycentricToCartesian`, `pointInTriangle`, `clampToTriangle`,
    `insetTriangle`.
  - Per-channel color-space configuration: `colorSpaces`, `getChannelConfig`,
    `displayToNative`, `nativeToDisplay`.
- Depends on `@urcolor/core ^2.0.0`.
