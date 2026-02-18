# ColorTriangle

A triangular 2D area component for adjusting two (or three) color channels simultaneously.

## Examples

<script setup>
import ColorTriangleSV from './demo/ColorTriangleSV.vue'
import ColorTriangleSL from './demo/ColorTriangleSL.vue'
import ColorTriangleRGB from './demo/ColorTriangleRGB.vue'
</script>

### HSV / Saturation x Value

HSV color triangle with Saturation and Value mapped to the triangle axes.

<ColorTriangleSV />

<<< @/components/vue/demo/ColorTriangleSV.vue

### HSL / Saturation x Lightness

HSL color triangle with Saturation and Lightness mapped to the triangle axes.

<ColorTriangleSL />

<<< @/components/vue/demo/ColorTriangleSL.vue

### Maxwell's RGB Triangle

Three-channel RGB triangle using barycentric coordinates.

<ColorTriangleRGB />

<<< @/components/vue/demo/ColorTriangleRGB.vue

## Usage

```vue
<script setup>
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleCheckerboard,
  ColorTriangleThumb,
  ColorTriangleThumbX,
  ColorTriangleThumbY,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsv(210, 80%, 90%)"));

function onColorUpdate(c) {
  if (c) color.value = c;
}
</script>

<template>
  <ColorTriangleRoot
    :model-value="color"
    color-space="hsv"
    channel-x="s"
    channel-y="v"
    @update:model-value="onColorUpdate"
  >
    <ColorTriangleGradient />
    <ColorTriangleThumb>
      <ColorTriangleThumbX />
      <ColorTriangleThumbY />
    </ColorTriangleThumb>
  </ColorTriangleRoot>
</template>
```

### Three-Channel Mode

Pass `channelZ` to enable three-channel barycentric mode. Include `ColorTriangleThumbZ` inside the thumb.

```vue
<script setup>
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
  ColorTriangleThumbX,
  ColorTriangleThumbY,
  ColorTriangleThumbZ,
} from "@urcolor/vue";
</script>

<template>
  <ColorTriangleRoot
    :model-value="color"
    color-space="srgb"
    channel-x="red"
    channel-y="green"
    channel-z="blue"
    @update:model-value="onColorUpdate"
  >
    <ColorTriangleGradient />
    <ColorTriangleThumb>
      <ColorTriangleThumbX />
      <ColorTriangleThumbY />
      <ColorTriangleThumbZ />
    </ColorTriangleThumb>
  </ColorTriangleRoot>
</template>
```

## API Reference

### ColorTriangleRoot

The root container that manages triangle state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsv'` | Color space mode (e.g. `'hsv'`, `'hsl'`, `'srgb'`). |
| `channelX` | `string` | Auto | Channel for the X axis. Auto-derived from color space. |
| `channelY` | `string` | Auto | Channel for the Y axis. Auto-derived from color space. |
| `channelZ` | `string` | — | Optional third channel for barycentric three-channel mode. |
| `rotation` | `number` | `0` | Triangle rotation in degrees. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout orientation. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends. |

### ColorTriangleGradient

Renders a triangular gradient canvas. Automatically samples the gradient from the root's color space and channel configuration. Supports both 2-channel and 3-channel modes.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |

### ColorTriangleCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorTriangleRoot` before `ColorTriangleGradient`.

### ColorTriangleThumb

Wrapper for the thumb indicator. Position is set automatically via CSS custom properties.

### ColorTriangleThumbX / ColorTriangleThumbY

Individual axis thumb elements. Both are required inside `ColorTriangleThumb` for keyboard navigation.

### ColorTriangleThumbZ

Optional third axis thumb for three-channel barycentric mode. Only include when `channelZ` is set on the root.

## Keyboard Navigation

### Two-Channel Mode

| Key | Action |
|-----|--------|
| Arrow Right | Increase Y channel |
| Arrow Left | Decrease Y channel |
| Arrow Up | Increase X channel |
| Arrow Down | Decrease X channel |
| Shift + Arrow | Move by 10 steps |
| Home / Page Up | Jump to max |
| End / Page Down | Jump to min |

### Three-Channel Mode

| Key | Action |
|-----|--------|
| Arrow Up / Arrow Right | Increase focused channel by 5% |
| Arrow Down / Arrow Left | Decrease focused channel by 5% |
| Shift + Arrow | Move by 20% |
| Page Up | Increase by 20% |
| Page Down | Decrease by 20% |
| Home | Jump to focused channel vertex |
| End | Jump to center (equal distribution) |
