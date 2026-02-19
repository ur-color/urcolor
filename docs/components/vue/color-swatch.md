# ColorSwatch

A color preview element that displays a color with a checkerboard background for visualizing alpha transparency.

## Preview

<script setup>
import ColorSwatchBasic from './demo/ColorSwatchBasic.vue'
</script>

<ColorSwatchBasic />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSwatchBasic.vue

</details>

## Anatomy

```vue
<template>
  <ColorSwatchRoot />
</template>
```

## Examples

### Basic

A set of color swatches, including one with alpha transparency.

<ColorSwatchBasic />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSwatchBasic.vue

</details>

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

## Accessibility

ColorSwatch is a purely visual element that displays a color preview.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="img"` | Identifies the swatch as a presentational image for screen readers. |
| `aria-label` | Describes the displayed color value for assistive technologies. |
