# Introduction

UrColor is a universal, headless color picker component library. It provides unstyled, composable primitives that give you full control over styling and behavior.

## Packages

- `@urcolor/core` — A zero-dependency CSS Color 4 library (parse, convert, serialize, gamut-map, interpolate) plus WebGL canvas gradient generators for color area sliders.
- `@urcolor/relative` — Opt-in CSS Color 5 relative color syntax (`rgb(from red r g b)`) for `@urcolor/core`. See [Relative Colors](/guide/relative-colors).
- `@urcolor/vue` — Headless Vue 3 components and composables for building color pickers.

## Philosophy

Inspired by Radix UI, Reka UI, and React Spectrum, UrColor provides the logic and accessibility while you bring the styles. The color area component supports arbitrary two-channel combinations (e.g. Hue+Saturation, Hue+Chroma in LCH) rendered via WebGL for smooth, GPU-accelerated gradients.
