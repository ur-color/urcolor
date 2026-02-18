# ColorWheel

A circular 2D area component for adjusting two color channels mapped to angle and radius.

## Examples

<script setup>
import ColorWheelHS from './demo/ColorWheelHS.vue'
import ColorWheelHL from './demo/ColorWheelHL.vue'
import ColorWheelOKLCh from './demo/ColorWheelOKLCh.vue'
</script>

### HSL / Hue x Saturation

HSL color wheel with Hue mapped to angle and Saturation to radius.

<ColorWheelHS />

<<< @/components/vue/demo/ColorWheelHS.vue

### HSL / Hue x Lightness

HSL color wheel with Hue mapped to angle and Lightness to radius.

<ColorWheelHL />

<<< @/components/vue/demo/ColorWheelHL.vue

### OKLCh / Hue x Chroma

OKLCh color wheel with Hue mapped to angle and Chroma to radius.

<ColorWheelOKLCh />

<<< @/components/vue/demo/ColorWheelOKLCh.vue

## Usage

```vue
<script setup>
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelCheckerboard,
  ColorWheelThumb,
  ColorWheelThumbX,
  ColorWheelThumbY,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)"));

function onColorUpdate(c) {
  if (c) color.value = c;
}
</script>

<template>
  <ColorWheelRoot
    :model-value="color"
    color-space="hsl"
    channel-angle="h"
    channel-radius="s"
    @update:model-value="onColorUpdate"
  >
    <ColorWheelGradient />
    <ColorWheelThumb>
      <ColorWheelThumbX />
      <ColorWheelThumbY />
    </ColorWheelThumb>
  </ColorWheelRoot>
</template>
```

## API Reference

### ColorWheelRoot

The root container that manages wheel state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channelAngle` | `string` | Auto | Channel mapped to the angle axis (e.g. `'h'`). Auto-derived from color space. |
| `channelRadius` | `string` | Auto | Channel mapped to the radius axis (e.g. `'s'`). Auto-derived from color space. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends. |

### ColorWheelGradient

Renders a polar gradient canvas for the wheel. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |

### ColorWheelCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorWheelRoot` before `ColorWheelGradient`.

### ColorWheelThumb

Wrapper for the thumb indicator. Position is set automatically via CSS custom properties using polar coordinates.

### ColorWheelThumbX / ColorWheelThumbY

Individual axis thumb elements for angle and radius. Both are required inside `ColorWheelThumb` for keyboard navigation to work on both axes.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right | Increase angle by one step |
| Arrow Left | Decrease angle by one step |
| Arrow Up | Increase radius by one step |
| Arrow Down | Decrease radius by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase/decrease radius by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
