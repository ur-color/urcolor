# @urcolor/vue

Headless, accessible color picker components for Vue 3. Unstyled primitives — bring your own styles.

## Installation

```sh
bun add @urcolor/vue     # or: npm i @urcolor/vue
```

Requires Vue `^3`. Pulls in [`@urcolor/core`](../core) (the color engine) and
[`@urcolor/shared`](../shared) (rendering and interaction) automatically.

## Features

- **Headless** — Radix/Reka UI-style unstyled primitives with full styling freedom
- **12 Color Spaces** — HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, sRGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020, all with alpha
- **Accessible** — Keyboard navigation, ARIA attributes, roving focus
- **WebGL Gradients** — GPU-accelerated canvas backgrounds via `@urcolor/shared`, with a CPU sampler fallback
- **Alpha Support** — Built-in transparency controls with checkerboard backgrounds
- **Form Integration** — Hidden inputs for native form submission

> **Upgrading from 1.x?** 2.0.0 renamed the channel props, split
> `ColorAreaRoot`'s interaction surface into `ColorAreaArea`, replaced
> `valueCommit` with four events, and moved `Color` onto `@urcolor/core`'s
> CSS Color 4 space ids (`rgb` → `srgb`, `p3` → `display-p3`, …). See
> [`CHANGELOG.md`](./CHANGELOG.md) for the migration.

## Two import styles

Every component is exported both flat and namespaced. They are the same
components:

```ts
import { ColorAreaRoot, ColorAreaGradient, ColorAreaThumb } from "@urcolor/vue";
import { ColorArea } from "@urcolor/vue/namespaced";  // ColorArea.Root, .Gradient, .Thumb
```

## Components

### ColorArea

Two-dimensional color selection for any pair of channels.

```vue
<script setup>
import {
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaThumb,
} from '@urcolor/vue'

const color = ref('hsl(200, 100%, 50%)')
</script>

<template>
  <ColorAreaRoot v-model="color" color-space="hsl" x-channel="s" y-channel="l">
    <ColorAreaArea>
      <ColorAreaGradient />
      <ColorAreaThumb />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

`ColorAreaArea` is required — it carries every pointer and keyboard handler and is the box pointer coordinates are measured against. Mounting the gradient and thumb directly under the root renders, but does not respond to input.

**Props:** `modelValue`, `defaultValue`, `colorSpace`, `xChannel`, `yChannel`, `xName`, `yName`, `disabled`, `xInverted`, `yInverted`, `minXStepsBetweenThumbs`, `minYStepsBetweenThumbs`, `thumbAlignment` ("contain" | "overflow"), `name`, `required`, `dir`

**Sub-components:** `ColorAreaRoot`, `ColorAreaArea`, `ColorAreaGradient`, `ColorAreaThumb`, `ColorAreaCheckerboard` _(deprecated — `ColorAreaGradient` now paints the checkerboard itself)_

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
  <ColorSliderRoot v-model="color" color-space="hsl" channel="h">
    <ColorSliderTrack>
      <ColorSliderGradient />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

**Props:** `modelValue`, `defaultValue`, `colorSpace`, `channel`, `step`, `disabled`, `orientation` ("horizontal" | "vertical"), `inverted`, `name`, `required`, `dir`

**Sub-components:** `ColorSliderRoot`, `ColorSliderTrack`, `ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient`, `ColorSliderCheckerboard` _(deprecated — the Gradient now paints the checkerboard itself)_

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
  <ColorFieldRoot v-model="color" color-space="hsl" channel="h">
    <ColorFieldDecrement>−</ColorFieldDecrement>
    <ColorFieldInput />
    <ColorFieldIncrement>+</ColorFieldIncrement>
  </ColorFieldRoot>
</template>
```

**Props:** `modelValue`, `defaultValue`, `colorSpace`, `channel`, `format` ("number" | "degree" | "percentage" | "hex"), `min`, `max`, `step`, `disabled`, `readonly`, `placeholder`, `disableWheelChange`, `locale`, `name`, `required`

**Keyboard:** Arrow Up/Down to increment, Page Up/Down for 10x steps, Home/End for min/max.

**Sub-components:** `ColorFieldRoot`, `ColorFieldInput`, `ColorFieldIncrement`, `ColorFieldDecrement`, `ColorFieldSwatch`

### ColorSwatch

Display a color with optional transparency checkerboard.

```vue
<template>
  <ColorSwatchRoot model-value="oklch(70% 0.15 200)" :alpha="true" />
</template>
```

**Props:** `modelValue`, `checkerSize`, `alpha`, `label`

### ColorSwatchPicker

Select one or multiple colors from a palette. Built on Reka UI's Listbox — the root
renders `role="listbox"` and each item `role="option"`.

```vue
<script setup>
import {
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerItemIndicator,
} from '@urcolor/vue'

const selected = ref(['red'])
</script>

<template>
  <ColorSwatchPickerRoot v-model="selected" multiple>
    <ColorSwatchPickerItem v-for="c in ['red', 'green', 'blue']" :key="c" :value="c">
      <ColorSwatchPickerItemSwatch />
      <ColorSwatchPickerItemIndicator>✓</ColorSwatchPickerItemIndicator>
    </ColorSwatchPickerItem>
  </ColorSwatchPickerRoot>
</template>
```

**Props:** `modelValue`, `defaultValue`, `multiple`, `disabled`, `orientation` ("horizontal" | "vertical"), `selectionBehavior` ("toggle" | "replace"), `highlightOnHover`, `name`, `required`, `dir`

**Sub-components:** `ColorSwatchPickerRoot`, `ColorSwatchPickerItem`, `ColorSwatchPickerItemSwatch`, `ColorSwatchPickerItemIndicator`

Note: typeahead is not supported — swatches carry no text for the listbox to search against.

### ColorRing

Single-channel selection along a circular arc.

**Props:** `modelValue`, `defaultValue`, `colorSpace`, `channel`, `startAngle`, `innerRadius`, `disabled`, `name`, `required`, `dir`

**Sub-components:** `ColorRingRoot`, `ColorRingTrack`, `ColorRingGradient`, `ColorRingThumb`, `ColorRingCheckerboard` _(deprecated — the Gradient now paints the checkerboard itself)_

### ColorWheel

Two-channel selection mapped to angle and radius.

**Props:** `modelValue`, `defaultValue`, `colorSpace`, `angleChannel`, `radiusChannel`, `startAngle`, `disabled`, `name`, `required`, `dir`

**Sub-components:** `ColorWheelRoot`, `ColorWheelGradient`, `ColorWheelThumb`, `ColorWheelCheckerboard` _(deprecated — the Gradient now paints the checkerboard itself)_

### ColorTriangle

Two- or three-channel selection in barycentric coordinates. Set `zChannel` for the
three-channel (Maxwell triangle) mode.

**Props:** `modelValue`, `defaultValue`, `colorSpace`, `xChannel`, `yChannel`, `zChannel`, `rotation`, `orientation`, `inverted`, `thumbAlignment`, `disabled`, `name`, `required`, `dir`

**Sub-components:** `ColorTriangleRoot`, `ColorTriangleGradient`, `ColorTriangleThumb`, `ColorTriangleCheckerboard` _(deprecated — the Gradient now paints the checkerboard itself)_

## Events

Every color root emits the same four events:

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | `Color \| undefined` | Whenever the color changes (this is what `v-model` binds to). |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | On every value change, including mid-drag and mid-typing. |
| `changeEnd` | `Color` | When a change-producing interaction ends. |

`ColorSwatchPicker` is the exception: it emits the Listbox event set — `update:modelValue`, `highlight`, `entryFocus` and `leave`.

## Composables

`useColor(input)` holds a `Color` in a `shallowRef` and exposes writable `hex`
and `alpha` computeds alongside it. `input` may be a ref, getter or plain value,
and the color resyncs when it changes.

```ts
import { useColor } from "@urcolor/vue";

const { color, hex, alpha } = useColor("#3b82f6");
```

Each color space also has a named shorthand that additionally exposes its
channels — `useRGB`, `useHSL`, `useHSV`, `useHWB`, `useOKLCh`, `useOKLab`,
`useLCh`, `useLab`, `useP3`, `useA98`, `useProPhoto`, `useRec2020`.

Each root also exports its context injector (`injectColorAreaRootContext`,
`injectColorSliderRootContext`, …) for building custom parts.

## Supported Color Spaces

HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, sRGB, Display P3, A98 RGB, ProPhoto RGB,
Rec. 2020 — all with alpha channel support. Space ids are the CSS Color 4 names
(`srgb`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`).

## License

MIT
