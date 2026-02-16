# Introduction

UrColor is a universal, headless color picker component library. It provides unstyled, composable primitives that give you full control over styling and behavior.

## Packages

- `@urcolor/core` — Color conversion utilities (powered by [internationalized-color](https://github.com/GrandMagus02/internationalized-color)) and WebGL canvas gradient generators for color area sliders.
- `@urcolor/vue` — Headless Vue 3 components and composables for building color pickers.

## Philosophy

Inspired by Radix UI, Reka UI, and React Spectrum, UrColor provides the logic and accessibility while you bring the styles. The color area component supports arbitrary two-channel combinations (e.g. Hue+Saturation, Hue+Chroma in LCH) rendered via WebGL for smooth, GPU-accelerated gradients.
