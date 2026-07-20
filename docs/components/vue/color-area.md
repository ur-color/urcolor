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
    <ColorAreaArea>
      <ColorAreaCheckerboard />
      <ColorAreaGradient />
      <ColorAreaThumb />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

::: warning
`ColorAreaArea` is required. `ColorAreaRoot` owns the state but attaches no pointer
or keyboard handlers of its own — they all live on `ColorAreaArea`, which also
measures the box that pointer coordinates are resolved against. A tree that puts
the gradient, checkerboard and thumb directly under the root renders correctly but
does not respond to input.
:::

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
    v-model="color"
    color-space="hsl"
    x-channel="s"
    y-channel="l"
  >
    <ColorAreaArea>
      <ColorAreaCheckerboard />
      <ColorAreaGradient :channel-overrides="false" />
      <ColorAreaThumb />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

## Usage

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaThumb,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
  >
    <ColorAreaArea as="div">
      <ColorAreaGradient as="div" />
      <ColorAreaThumb as="div" />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

## API Reference

### ColorAreaRoot

The root container that owns the color state, the channel maths and the keyboard handler. Renders `role="group"`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `xChannel` | `string` | Auto | Channel for the X axis (e.g. `'s'`, `'alpha'`). Defaults to the color space's first channel. |
| `yChannel` | `string` | Auto | Channel for the Y axis (e.g. `'l'`, `'alpha'`). Defaults to the color space's second channel. |
| `xName` | `string` | — | Name of a hidden input carrying the raw X channel value for form submission. |
| `yName` | `string` | — | Name of a hidden input carrying the raw Y channel value for form submission. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. Inherits from `ConfigProvider` when omitted. |
| `invertedX` | `boolean` | `false` | Invert X axis. |
| `invertedY` | `boolean` | `false` | Invert Y axis. |
| `minXStepsBetweenThumbs` | `number` | `0` | Minimum permitted steps between thumbs on the X axis. |
| `minYStepsBetweenThumbs` | `number` | `0` | Minimum permitted steps between thumbs on the Y axis. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether thumbs are kept inside the track bounds. |
| `name` | `string` | — | Hidden input name carrying the full color for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

ColorArea currently renders a single thumb, so `minXStepsBetweenThumbs` and
`minYStepsBetweenThumbs` have no observable effect.

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted whenever the color changes. |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | Emitted on every value change, including mid-drag. |
| `changeEnd` | `Color` | Emitted when a change-producing interaction ends. |

### ColorAreaArea

The interaction surface. Renders `role="application"` with `aria-roledescription="Color picker"` and `touch-action: none`, registers itself as the element pointer coordinates are measured against, and carries the pointer and keyboard listeners. It must wrap `ColorAreaCheckerboard`, `ColorAreaGradient` and `ColorAreaThumb`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

::: tip Building a custom interaction surface
`ColorAreaRoot`'s context exposes `handleSlideStart`, `handleSlideMove`, `handleSlideEnd`
and `snapshotValues`, so a custom surface can drive the same value maths. It cannot,
however, register itself as the measured area — only `ColorAreaArea` writes
`areaElement` — so pointer coordinates would be resolved against the root's box
rather than the custom surface's. Reimplement `ColorAreaArea` (rather than wrapping
it) if the two boxes differ.
:::

### ColorAreaGradient

Renders a 2D gradient canvas for the color area. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topLeft` | `string` | — | Override: color for the top-left corner. |
| `topRight` | `string` | — | Override: color for the top-right corner. |
| `bottomLeft` | `string` | — | Override: color for the bottom-left corner. |
| `bottomRight` | `string` | — | Override: color for the bottom-right corner. |
| `interpolationSpace` | `SpaceId` | — | Color space for perceptual interpolation (e.g. `'oklch'`). Switches the corner-color path from WebGL to 2D canvas. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color including alpha. E.g. `{ s: 1, v: 1, alpha: 1 }` for an immutable hue gradient in HSV. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorAreaCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorAreaArea` before `ColorAreaGradient`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorAreaThumb

The thumb indicator, rendered as `role="slider"`. It is positioned absolutely from the current channel values and reads the `--reka-slider-area-thumb-transform` custom property set by the root for its centering transform.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

## Accessibility

ColorArea exposes a single focusable thumb inside an application-role surface, with keyboard access to both axes.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="group"` | Applied to `ColorAreaRoot`. |
| `role="application"` | Applied to `ColorAreaArea`, with `aria-roledescription="Color picker"`. |
| `role="slider"` | Applied to `ColorAreaThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the two channel labels, e.g. `"Hue, Saturation"`. Override with your own `aria-label` on the thumb. |
| `aria-valuemin` / `aria-valuemax` | The X channel's range. |
| `aria-valuenow` | The current X channel value. |
| `aria-valuetext` | Both channels formatted, e.g. `"Hue 210°, Saturation 80%"`. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Left / Arrow Right | Decrease / increase the X channel by one step |
| Arrow Up / Arrow Down | Decrease / increase the Y channel by one step |
| Shift + Arrow | Move by 10 steps |
| Home / End | Jump to X-axis min / max |
| Page Up / Page Down | Jump to Y-axis min / max |

Arrow keys follow the visual axes: with `inverted-x` or `inverted-y` set, or in RTL,
the direction of travel flips so the thumb still moves the way the key points.
