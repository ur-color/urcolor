# ColorSlider

A 1D slider component for adjusting a single color channel, with a gradient track that reflects the current color.

## Examples

<script setup>
import Demo from '../../.vitepress/components/Demo.vue'
import ColorSliderHue from './demo/ColorSliderHue.vue'
import ColorSliderSaturation from './demo/ColorSliderSaturation.vue'
import ColorSliderLightness from './demo/ColorSliderLightness.vue'
import ColorSliderVertical from './demo/ColorSliderVertical.vue'

import ColorSliderHueCode from './demo/ColorSliderHue.vue?raw'
import ColorSliderSaturationCode from './demo/ColorSliderSaturation.vue?raw'
import ColorSliderLightnessCode from './demo/ColorSliderLightness.vue?raw'
import ColorSliderVerticalCode from './demo/ColorSliderVertical.vue?raw'
</script>

### Hue

<Demo description="Hue channel slider" :code="ColorSliderHueCode">
  <ColorSliderHue />
</Demo>

### Saturation

<Demo description="Saturation channel slider" :code="ColorSliderSaturationCode">
  <ColorSliderSaturation />
</Demo>

### Lightness

<Demo description="Lightness channel slider" :code="ColorSliderLightnessCode">
  <ColorSliderLightness />
</Demo>

### Vertical

<Demo description="Vertical orientation slider" :code="ColorSliderVerticalCode">
  <ColorSliderVertical />
</Demo>

## Usage

```vue
<script setup>
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderCheckerboard,
  ColorSliderThumb,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)"));

function onColorUpdate(c) {
  if (c) {
    color.value = c;
  }
}
</script>

<template>
  <ColorSliderRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorUpdate"
  >
    <ColorSliderTrack>
      <ColorSliderGradient :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']" />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

### With Alpha

Use the `alpha` prop to reflect the color's alpha as opacity on the gradient. Add `ColorSliderCheckerboard` to show a checkerboard behind transparent areas.

```vue
<template>
  <ColorSliderRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    alpha
    @update:model-value="onColorUpdate"
  >
    <ColorSliderTrack>
      <ColorSliderCheckerboard />
      <ColorSliderGradient :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']" />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

### Alpha Channel Slider

Set `channel="alpha"` to create an opacity slider. The gradient automatically renders with transparency.

```vue
<template>
  <ColorSliderRoot
    :model-value="color"
    color-space="hsl"
    channel="alpha"
    @update:model-value="onColorUpdate"
  >
    <ColorSliderTrack>
      <ColorSliderCheckerboard />
      <ColorSliderGradient :colors="['hsla(210, 80%, 50%, 0)', 'hsl(210, 80%, 50%)']" />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

## API Reference

### ColorSliderRoot

The root container that manages slider state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | Channel to control (e.g. `'h'`, `'s'`, `'l'`). |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `inverted` | `boolean` | `false` | Visually invert the slider. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider orientation. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel as opacity on the gradient. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends. |

### ColorSliderTrack

The track area that contains the gradient and thumb. Extends Reka UI's `SliderTrackProps`.

### ColorSliderGradient

Renders a gradient canvas background for the slider track.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `string[]` | — | Array of color stops (minimum 2). |
| `vertical` | `boolean` | `false` | Render gradient top-to-bottom instead of left-to-right. |
| `interpolationSpace` | `string` | — | Color space for perceptual interpolation (e.g. `'oklch'`). |

### ColorSliderCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorSliderTrack` before `ColorSliderGradient`.

### ColorSliderThumb

The draggable thumb element. Extends Reka UI's `SliderThumbProps`.

### ColorSliderRange

The filled range portion of the track. Extends Reka UI's `SliderRangeProps`.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Left / Arrow Down | Decrease by one step |
| Arrow Right / Arrow Up | Increase by one step |
| Shift + Arrow | Move by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
| Page Up | Increase by large step |
| Page Down | Decrease by large step |
