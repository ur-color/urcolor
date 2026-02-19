# ColorSlider

A 1D slider component for adjusting a single color channel, with a gradient track that reflects the current color.

## Preview

<script setup>
import ColorSliderHue from './demo/ColorSliderHue.vue'
import ColorSliderSaturation from './demo/ColorSliderSaturation.vue'
import ColorSliderLightness from './demo/ColorSliderLightness.vue'
import ColorSliderVertical from './demo/ColorSliderVertical.vue'
</script>

<ColorSliderHue />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSliderHue.vue

</details>

## Anatomy

```vue
<template>
  <ColorSliderRoot>
    <ColorSliderTrack>
      <ColorSliderCheckerboard />
      <ColorSliderGradient />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

## Examples

### Hue

<ColorSliderHue />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSliderHue.vue

</details>

### Saturation

<ColorSliderSaturation />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSliderSaturation.vue

</details>

### Lightness

<ColorSliderLightness />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSliderLightness.vue

</details>

### Vertical

<ColorSliderVertical />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSliderVertical.vue

</details>

### With Alpha

Pass `:channel-overrides="false"` on `ColorSliderGradient` to reflect the color's alpha as opacity on the gradient. Add `ColorSliderCheckerboard` to show a checkerboard behind transparent areas.

```vue
<template>
  <ColorSliderRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorUpdate"
  >
    <ColorSliderTrack>
      <ColorSliderCheckerboard />
      <ColorSliderGradient
        :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
        :channel-overrides="false"
      />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

### Alpha Channel

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
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. E.g. `{ s: 1, v: 1, alpha: 1 }` for an immutable hue gradient in HSV. |

### ColorSliderCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorSliderTrack` before `ColorSliderGradient`.

### ColorSliderThumb

The draggable thumb element. Extends Reka UI's `SliderThumbProps`.

### ColorSliderRange

The filled range portion of the track. Extends Reka UI's `SliderRangeProps`.

## Accessibility

ColorSlider provides a standard slider interface built on top of Reka UI's slider primitives, ensuring robust screen reader support.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `aria-label` | Labels the slider with the controlled channel name. |
| `role="slider"` | Applied to the thumb element for screen reader recognition. |
| `aria-valuemin` / `aria-valuemax` | Defines the channel's value range. |
| `aria-valuenow` | Current value of the channel. |
| `aria-orientation` | Reflects horizontal or vertical orientation. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Left / Arrow Down | Decrease by one step |
| Arrow Right / Arrow Up | Increase by one step |
| Shift + Arrow | Move by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
| Page Up | Increase by large step |
| Page Down | Decrease by large step |
