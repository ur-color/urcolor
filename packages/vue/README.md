# @urcolor/vue

Headless, accessible color picker components for Vue 3. Unstyled primitives — bring your own styles.

## Installation

```bash
bun add @urcolor/vue
```

## Features

- **Headless** — Radix/Reka UI-style unstyled primitives with full styling freedom
- **12 Color Spaces** — HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, RGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020
- **Accessible** — Keyboard navigation, ARIA attributes, roving focus
- **WebGL Gradients** — GPU-accelerated canvas backgrounds via `@urcolor/core`
- **Alpha Support** — Built-in transparency controls with checkerboard backgrounds
- **Form Integration** — Hidden inputs for native form submission

## Components

### ColorArea

Two-dimensional color selection for any pair of channels.

```vue
<script setup>
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaThumb,
  ColorAreaGradient,
} from '@urcolor/vue'

const color = ref('hsl(200, 100%, 50%)')
</script>

<template>
  <ColorAreaRoot v-model="color" color-space="hsl" channel-x="saturation" channel-y="lightness">
    <ColorAreaTrack>
      <ColorAreaGradient />
      <ColorAreaThumb />
    </ColorAreaTrack>
  </ColorAreaRoot>
</template>
```

**Props:** `modelValue`, `colorSpace`, `channelX`, `channelY`, `disabled`, `invertedX`, `invertedY`, `thumbAlignment` ("contain" | "overflow"), `name`, `dir`

**Sub-components:** `ColorAreaRoot`, `ColorAreaTrack`, `ColorAreaThumb`, `ColorAreaGradient`, `ColorAreaCheckerboard`

### ColorSlider

Single-channel color adjustment slider.

```vue
<script setup>
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderThumb,
  ColorSliderGradient,
} from '@urcolor/vue'

const color = ref('hsl(200, 100%, 50%)')
</script>

<template>
  <ColorSliderRoot v-model="color" color-space="hsl" channel="hue">
    <ColorSliderTrack>
      <ColorSliderGradient />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

**Props:** `modelValue`, `colorSpace`, `channel`, `disabled`, `orientation` ("horizontal" | "vertical"), `inverted`, `dir`

**Sub-components:** `ColorSliderRoot`, `ColorSliderTrack`, `ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient`, `ColorSliderCheckerboard`

### ColorField

Text input for precise numeric color values.

```vue
<script setup>
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from '@urcolor/vue'

const color = ref('hsl(200, 100%, 50%)')
</script>

<template>
  <ColorFieldRoot v-model="color" color-space="hsl" channel="hue">
    <ColorFieldDecrement>−</ColorFieldDecrement>
    <ColorFieldInput />
    <ColorFieldIncrement>+</ColorFieldIncrement>
  </ColorFieldRoot>
</template>
```

**Props:** `modelValue`, `colorSpace`, `channel`, `format` ("number" | "degree" | "percentage" | "hex"), `min`, `max`, `step`, `disabled`, `name`

**Keyboard:** Arrow Up/Down to increment, Page Up/Down for 10x steps, Home/End for min/max.

**Sub-components:** `ColorFieldRoot`, `ColorFieldInput`, `ColorFieldIncrement`, `ColorFieldDecrement`, `ColorFieldSwatch`

### ColorSwatch

Display a color with optional transparency checkerboard.

```vue
<template>
  <ColorSwatchRoot model-value="oklch(70% 0.15 200)" :alpha="true" />
</template>
```

**Props:** `modelValue`, `checkerSize`, `alpha`

### ColorSwatchGroup

Select one or multiple colors from a palette.

```vue
<script setup>
import { ColorSwatchGroupRoot, ColorSwatchGroupItem } from '@urcolor/vue'

const selected = ref(['red'])
</script>

<template>
  <ColorSwatchGroupRoot v-model="selected" type="multiple">
    <ColorSwatchGroupItem value="red" />
    <ColorSwatchGroupItem value="green" />
    <ColorSwatchGroupItem value="blue" />
  </ColorSwatchGroupRoot>
</template>
```

**Props:** `modelValue`, `type` ("single" | "multiple"), `disabled`, `orientation`, `loop`, `rovingFocus`, `dir`

**Sub-components:** `ColorSwatchGroupRoot`, `ColorSwatchGroupItem`

## Supported Color Spaces

HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, RGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020 — all with alpha channel support.

## License

MIT
