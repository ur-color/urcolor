# ColorSwatch

A color preview element that displays a color with a checkerboard background for visualizing alpha transparency.

## Examples

<script setup>
import Demo from '../../.vitepress/components/Demo.vue'
import ColorSwatchBasic from './demo/ColorSwatchBasic.vue'

import ColorSwatchBasicCode from './demo/ColorSwatchBasic.vue?raw'
</script>

### Basic

A set of color swatches, including one with alpha transparency.

<Demo description="Color swatches with alpha support" :code="ColorSwatchBasicCode">
  <ColorSwatchBasic />
</Demo>

## Usage

```vue
<script setup>
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import { ColorSwatchRoot } from "@urcolor/vue";

const color = shallowRef(Color.parse("hsla(210, 80%, 50%, 0.5)"));
</script>

<template>
  <ColorSwatchRoot :model-value="color" alpha />
</template>
```

## API Reference

### ColorSwatchRoot

Renders a color preview with an automatic checkerboard background.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | The color value to display. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. When false, displays the color as fully opaque. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |

### CSS Variables

The component exposes CSS custom properties on the root element for advanced styling:

| Variable | Description |
|----------|-------------|
| `--swatch-color` | The resolved CSS color string (with or without alpha based on the `alpha` prop). |
| `--swatch-color-opaque` | The color at full opacity. |
| `--swatch-alpha` | The color's alpha value (0–1). |
| `--swatch-checkerboard` | The checkerboard background gradient. |
