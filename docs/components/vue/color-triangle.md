# ColorTriangle

A triangular 2D area component for adjusting two (or three) color channels simultaneously.

## Preview

<script setup>
import ColorTriangleSV from './demo/ColorTriangleSV.vue'
import ColorTriangleSL from './demo/ColorTriangleSL.vue'
import ColorTriangleRGB from './demo/ColorTriangleRGB.vue'
</script>

<ColorTriangleSV />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleSV.vue

</details>

## Anatomy

```vue
<template>
  <ColorTriangleRoot>
    <ColorTriangleCheckerboard />
    <ColorTriangleGradient />
    <ColorTriangleThumb />
  </ColorTriangleRoot>
</template>
```

## Examples

### HSV / Saturation x Value

HSV color triangle with Saturation and Value mapped to the triangle axes.

<ColorTriangleSV />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleSV.vue

</details>

### HSL / Saturation x Lightness

HSL color triangle with Saturation and Lightness mapped to the triangle axes.

<ColorTriangleSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleSL.vue

</details>

### Maxwell's RGB Triangle

Three-channel RGB triangle using barycentric coordinates.

<ColorTriangleRGB />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleRGB.vue

</details>

### Three-Channel Mode

Pass `z-channel` to enable three-channel barycentric mode. The single `ColorTriangleThumb` drives all three channels.

```vue
<script setup>
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
} from "@urcolor/vue";
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="srgb"
    x-channel="r"
    y-channel="g"
    z-channel="b"
  >
    <ColorTriangleGradient />
    <ColorTriangleThumb />
  </ColorTriangleRoot>
</template>
```

::: info The first keypress "jumps"
In three-channel mode the three values are barycentric coordinates: only the ratio
between them is meaningful, so the component renormalizes them onto the simplex
(`u + v + w === 1`) on every write. An `srgb` color sitting at `r/g/b 50 / 50 / 180`
is rewritten to `46 / 45 / 163` the first time you press Arrow Right (which steps
red by one and, as a side effect of the renormalization, pulls all three channels
onto the simplex). This is inherent to the geometry, not a bug — after the first
write the values stay on the simplex and step smoothly.
:::

## API Reference

### ColorTriangleRoot

The root container that manages triangle state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsv'` | Color space (e.g. `'hsv'`, `'hsl'`, `'srgb'`). |
| `xChannel` | `string` | Auto | Channel for the X axis. Defaults to the color space's second channel. |
| `yChannel` | `string` | Auto | Channel for the Y axis. Defaults to the color space's third channel. |
| `zChannel` | `string` | — | Optional third channel. Setting it switches the triangle into barycentric three-channel mode. |
| `rotation` | `number` | `0` | Triangle rotation in degrees. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout orientation. |
| `inverted` | `boolean` | `false` | Swap the second and third vertices, mirroring the triangle. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether the thumb is kept inside the triangle's edges. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted whenever the color changes. |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | Emitted on every value change, including mid-drag. |
| `changeEnd` | `Color` | Emitted when a change-producing interaction ends. |

### ColorTriangleGradient

Renders a triangular gradient canvas. Automatically samples the gradient from the root's color space and channel configuration. Supports both 2-channel and 3-channel modes.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorTriangleCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorTriangleRoot` before `ColorTriangleGradient`.

### ColorTriangleThumb

The thumb indicator, and the triangle's only focusable element. It renders `role="slider"` and is positioned from the barycentric coordinates of the current channel values.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

## Accessibility

ColorTriangle exposes a single focusable thumb that drives two channels — or three, in barycentric mode.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorTriangleThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the channel labels in order, e.g. `"Saturation, Brightness"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The X channel's range. |
| `aria-valuenow` | The current X channel value. |
| `aria-valuetext` | Every channel formatted, e.g. `"Saturation 80%, Brightness 50%"`. |

### Keyboard Navigation

Arrow keys map to the X and Y axes, matching `ColorArea`.

| Key | Action |
|-----|--------|
| Arrow Left / Arrow Right | Decrease / increase the X channel by one step |
| Arrow Down / Arrow Up | Decrease / increase the Y channel by one step |
| Page Down / Page Up | Decrease / increase the Z channel by one step — three-channel mode only |
| Shift + Arrow, Shift + Page | Move by 10 steps |
| Home | Jump to the X channel's minimum |
| End | Jump to the X channel's maximum |

In two-channel mode the reachable region is the half-simplex, so a step that would
push the point past the hypotenuse gives way on the axis you did not drive. In
three-channel mode every write is renormalized onto the simplex — see
[Three-Channel Mode](#three-channel-mode) for what that means for the first keypress.
