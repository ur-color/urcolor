# Introduction

UrColor is a universal, headless color picker component library. It provides unstyled, composable primitives that give you full control over styling and behavior.

## Packages

- `@urcolor/core` — A zero-dependency CSS Color 4 library: parse, convert, serialize, gamut-map, interpolate.
- `@urcolor/shared` — The framework-agnostic behavior layer: drag handling, keyboard maps, channel models, WebGL canvas gradient generators for color area sliders, and data attributes shared by every binding.
- `@urcolor/relative` — Opt-in CSS Color 5 relative color syntax (`rgb(from red r g b)`) for `@urcolor/core`. See [Relative Colors](/guide/relative-colors).
- `@urcolor/i18n` — Multilingual color naming and channel labels. See [Color Naming](/guide/color-naming).
- `@urcolor/vue` — Headless Vue 3 components and composables for building color pickers.
- `@urcolor/react` — The same primitives for React.
- `@urcolor/svelte` — The same primitives for Svelte 5, as components plus rune-based hooks.
- `@urcolor/angular` — The same primitives for Angular, as directives plus signal stores.

All four bindings ship the same eight component families. Every recipe under
[How to](/how-to/build-color-area-picker) shows Vue, React, Svelte and Angular
side by side, so pick the tab that matches your stack.

## Philosophy

Inspired by Radix UI, Reka UI, and React Spectrum, UrColor provides the logic and accessibility while you bring the styles. The color area component supports arbitrary two-channel combinations (e.g. Hue+Saturation, Hue+Chroma in LCH) rendered via WebGL for smooth, GPU-accelerated gradients.
