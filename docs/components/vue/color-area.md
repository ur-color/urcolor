# ColorArea

A 2D slider component for selecting values across two axes, ideal for color picking (e.g., saturation and lightness).

## Preview

<script setup>
import ColorAreaHSL from './demo/ColorAreaHSL.vue'
import ColorAreaOKLCh from './demo/ColorAreaOKLCh.vue'
</script>

<ColorAreaHSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorAreaHSL.vue

</details>

## Anatomy

```vue
<template>
  <ColorAreaRoot>
    <ColorAreaCheckerboard />
    <ColorAreaGradient />
    <ColorAreaThumb />
  </ColorAreaRoot>
</template>
```

## Examples

### HSL

HSL color area with Hue on X and Saturation on Y.

<ColorAreaHSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorAreaHSL.vue

</details>

### OKLCh

OKLCh color area with Chroma on X and Lightness on Y.

<ColorAreaOKLCh />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorAreaOKLCh.vue

</details>

### With Alpha

Pass `:channel-overrides="false"` on `ColorAreaGradient` to reflect the color's alpha channel as opacity on the gradient. Add `ColorAreaCheckerboard` behind the gradient to visualize transparency.

```vue
<template>
  <ColorAreaRoot
    :model-value="color"
    color-space="hsl"
    channel-x="s"
    channel-y="l"
    @update:model-value="onColorUpdate"
  >
    <ColorAreaCheckerboard />
    <ColorAreaGradient :channel-overrides="false" />
    <ColorAreaThumb />
  </ColorAreaRoot>
</template>
```

## API Reference

### ColorAreaRoot

The root container that manages slider state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channelX` | `string` | Auto | Channel for the X axis (e.g. `'s'`, `'alpha'`). Auto-derived from color space. |
| `channelY` | `string` | Auto | Channel for the Y axis (e.g. `'l'`, `'alpha'`). Auto-derived from color space. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `invertedX` | `boolean` | `false` | Invert X axis. |
| `invertedY` | `boolean` | `false` | Invert Y axis. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | How thumb is positioned relative to track bounds. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends. |

### ColorAreaGradient

Renders a 2D gradient canvas for the color area. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topLeft` | `string` | — | Override: color for the top-left corner. |
| `topRight` | `string` | — | Override: color for the top-right corner. |
| `bottomLeft` | `string` | — | Override: color for the bottom-left corner. |
| `bottomRight` | `string` | — | Override: color for the bottom-right corner. |
| `interpolationSpace` | `string` | — | Color space for perceptual interpolation (e.g. `'oklch'`). |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. E.g. `{ s: 1, v: 1, alpha: 1 }` for an immutable hue gradient in HSV. |

### ColorAreaCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorAreaRoot` before `ColorAreaGradient`.

### ColorAreaThumb

The thumb indicator. Position is set automatically via CSS custom properties. Handles both axes internally, including accessible `role="slider"` elements for screen readers.

## Accessibility

ColorArea provides a 2D slider interface with keyboard access to both axes.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `aria-label` | Labels the root element with the color area's purpose. |
| `role="slider"` | Applied internally to each axis for screen reader recognition. |
| `aria-valuemin` / `aria-valuemax` | Defines the range for each axis channel. |
| `aria-valuenow` | Current value of the focused channel. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Move by one step |
| Shift + Arrow | Move by 10 steps |
| Home / End | Move to X-axis min/max |
| Page Up / Page Down | Move to Y-axis min/max |
