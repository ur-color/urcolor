# ColorRing

A circular ring component for adjusting a single color channel along a circular arc.

## Examples

<script setup>
import ColorRingHue from './demo/ColorRingHue.vue'
import ColorRingSaturation from './demo/ColorRingSaturation.vue'
</script>

### Hue

Hue ring slider for cycling through the color spectrum.

<ColorRingHue />

<<< @/components/vue/demo/ColorRingHue.vue

### Saturation

Saturation ring slider for adjusting color intensity.

<ColorRingSaturation />

<<< @/components/vue/demo/ColorRingSaturation.vue

## Usage

```vue
<script setup>
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingCheckerboard,
  ColorRingThumb,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)"));

function onColorUpdate(c) {
  if (c) color.value = c;
}
</script>

<template>
  <ColorRingRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorUpdate"
  >
    <ColorRingTrack>
      <ColorRingGradient />
      <ColorRingThumb />
    </ColorRingTrack>
  </ColorRingRoot>
</template>
```

### With Alpha

Pass `:channel-overrides="false"` on `ColorRingGradient` to reflect the color's alpha channel as opacity on the gradient. Add `ColorRingCheckerboard` behind the gradient to visualize transparency.

```vue
<template>
  <ColorRingRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorUpdate"
  >
    <ColorRingTrack>
      <ColorRingCheckerboard />
      <ColorRingGradient :channel-overrides="false" />
      <ColorRingThumb />
    </ColorRingTrack>
  </ColorRingRoot>
</template>
```

## API Reference

### ColorRingRoot

The root container that manages ring state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | Auto | Channel to control (e.g. `'h'`, `'s'`). Auto-derived from color space. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
| `innerRadius` | `number` | `0.7` | Inner radius ratio (0–1) controlling ring thickness. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends. |

### ColorRingTrack

The track container that holds the gradient, checkerboard, and thumb.

### ColorRingGradient

Renders a ring gradient canvas for the track. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |

### ColorRingCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorRingTrack` before `ColorRingGradient`.

### ColorRingThumb

The draggable thumb element positioned along the ring arc.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up | Increase by 10 steps |
| Page Down | Decrease by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
