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

`ColorSwatchRoot` is the whole family — a single component with no sub-parts.

```vue
<script setup lang="ts">
import { ColorSwatchRoot } from "@urcolor/vue";
</script>

<template>
  <ColorSwatchRoot model-value="hsl(210, 80%, 50%)" />
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

Renders a color preview with an automatic checkerboard background. Extends reka-ui's `PrimitiveProps`.

The Vue swatch is presentational only — it has no pressed state and no toggle behaviour. Selection lives in [`ColorSwatchPicker`](./color-swatch-picker.md), whose `ColorSwatchPickerItemSwatch` wraps this component and feeds it the item's color.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | The color value to display. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. When false, displays the color as fully opaque. |
| `label` | `string` | Auto | Accessible name for the swatch. Falls back to the resolved color string, then `"transparent"`. |
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

::: tip
`modelValue` is a plain prop, not a two-way binding — the swatch never writes back, so `:model-value="color"` is the idiomatic form and `v-model` would have nothing to update.
:::

### Slots

| Slot | Payload | Description |
|------|---------|-------------|
| `default` | `{ color: string; alpha: number }` | Rendered inside the swatch, e.g. a selection checkmark. `color` is the same string as `--urcolor-swatch-color`; `alpha` is the color's alpha, or `1` when there is no color. |

### Data Attributes

| Attribute | Present when |
|-----------|--------------|
| `data-no-color` | There is no color, or the color is fully transparent. Either way nothing is visible. |

### CSS Variables

The component exposes CSS custom properties on the root element for advanced styling:

| Variable | Description |
|----------|-------------|
| `--urcolor-swatch-color` | The painted color, honouring `alpha`. `transparent` when there is no color. |
| `--urcolor-swatch-color-opaque` | The same color forced to alpha 1. |
| `--urcolor-swatch-alpha` | The color's alpha channel, `1` when there is no color. |
| `--urcolor-swatch-checkerboard` | The transparency grid painted under the color. |
| `--urcolor-swatch-background` | The composited `background`, built from the four above. |

All five are always emitted, including when the value is absent or
unparseable, so your styling never has to guard for a missing variable. The
unprefixed `--swatch-color`, `--swatch-color-opaque`, `--swatch-alpha` and
`--swatch-checkerboard` are still emitted as aliases of their replacements and
are deprecated.

The grid itself reads three further properties, and no component writes them,
so a rule anywhere above the element wins:

| Variable | Default | Description |
|----------|---------|-------------|
| `--urcolor-checkerboard-dark` | `rgb(230, 230, 230)` | The darker of the two checks. |
| `--urcolor-checkerboard-light` | `white` | The lighter of the two checks. |
| `--urcolor-checkerboard-size` | `16px` | The tile size. `checkerSize` writes it inline, which beats a stylesheet. |

## Accessibility

ColorSwatch is a purely visual element that displays a color preview. It is not focusable and handles no keyboard input.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="img"` | Identifies the swatch as a presentational image for screen readers. |
| `aria-roledescription` | Always `"color swatch"`, so the role is announced in the component's own terms. |
| `aria-label` | The `label` prop when given, otherwise the resolved color string, otherwise `"transparent"`. |

### Keyboard Navigation

The swatch has no keyboard behaviour of its own — it is not a tab stop and handles no keys. For a keyboard-navigable set of selectable swatches, use [`ColorSwatchPicker`](./color-swatch-picker.md), which owns roving focus and selection.

| Key | Action |
|-----|--------|
| — | None. The swatch is not focusable. |
