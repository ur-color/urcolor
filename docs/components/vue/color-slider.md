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
      <ColorSliderGradient />
      <ColorSliderRange />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

`ColorSliderRange` is optional — add it only when you want a filled portion of the track.

::: tip
The Vue package has no `Control` part. React needs one because Base UI handles pointer interaction on `Slider.Control`; Reka UI's slider does not, and Svelte and Angular ship an optional `Control` that is a pure styling hook.
:::

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

Pass `:channel-overrides="false"` on `ColorSliderGradient` to reflect the color's alpha as opacity on the gradient. `ColorSliderGradient` paints the checkerboard behind the canvas automatically, so transparency is visible with no extra element.

```vue
<template>
  <ColorSliderRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorUpdate"
  >
    <ColorSliderTrack>
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
      <ColorSliderGradient :colors="['hsla(210, 80%, 50%, 0)', 'hsl(210, 80%, 50%)']" />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

## API Reference

The root's context is readable with `injectColorSliderRootContext()`.

### ColorSliderRoot

The root container that manages slider state and color channel binding. Renders Reka UI's `SliderRoot`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | Channel to control (e.g. `'h'`, `'s'`, `'l'`, `'alpha'`). |
| `step` | `number` | Auto | Stepping interval. Derived from the channel config when omitted. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `inverted` | `boolean` | `false` | Visually invert the slider. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider orientation. |
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

The default slot receives `{ modelValue }`, the current `Color`.

### ColorSliderTrack

The track area that contains the gradient and thumb. Renders Reka UI's `SliderTrack`, a `<span>`, and extends its `SliderTrackProps`.

### ColorSliderGradient

Renders the slider's color ramp inside a wrapper element. A one-dimensional ramp has an exact CSS equivalent in every color space, so by default this paints a `linear-gradient` and renders no `<canvas>` at all — it appears in server-rendered HTML and costs no WebGL context. The transparency checkerboard is the wrapper's own CSS background, which the gradient composites over, so no separate part is needed for it.

Setting `interpolationSpace` does not change that: the stops are computed in the requested space and emitted densely, so the CSS path stays exact.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderer` | `'auto' \| 'css' \| 'canvas'` | `'auto'` | Which painter to use. `'auto'` paints with stacked CSS gradients when an exact recipe exists for the color space and channels, and falls back to the canvas otherwise. `'css'` forces the CSS path and warns in development if no recipe exists. `'canvas'` always paints into a `<canvas>`. |
| `colors` | `string[]` | Auto | Array of color stops. Computed from the slider's channel and current color when omitted — 36 stops across a cyclic channel such as hue, 16 otherwise, or 12 on the canvas path, which the shader's uniform slots cap. At least two valid stops are required, or nothing is painted. |
| `angle` | `number` | Auto | Gradient rotation in degrees (`0` = left-to-right, `90` = top-to-bottom). Normalized to 0–360; defaults to `90` when the slider is vertical, `0` otherwise. |
| `interpolationSpace` | `SpaceId` | — | Color space for perceptual interpolation (e.g. `'oklch'`). |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. E.g. `{ s: 1, v: 1, alpha: 1 }` for an immutable hue gradient in HSV. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorSliderCheckerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorSliderGradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorSliderTrack` before `ColorSliderGradient`.

### ColorSliderThumb

The draggable handle, and the slider's only focusable element. Renders Reka UI's `SliderThumb`, which supplies `role="slider"`, the value ARIA and `tabindex`. On top of that this part sets `aria-label` from the channel's label and `aria-valuetext` from the formatted channel value.

Extends Reka UI's `SliderThumbProps`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel label | Overrides the generated label, e.g. `"Hue"`. Passed as a fallthrough attribute. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

The default slot receives `{ channelName, channelValue }`.

### ColorSliderRange

The filled range portion of the track. Renders Reka UI's `SliderRange` and extends its `SliderRangeProps`.

### Data Attributes

Reka UI applies these to the parts it renders.

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-orientation` | Root, Track, Range, Thumb | Always; the value is `horizontal` or `vertical`. |
| `data-disabled` | Root, Track, Range, Thumb | The root is disabled. |

`ColorSliderGradient` and `ColorSliderCheckerboard` are plain elements and carry no state attributes; style them from an ancestor's.

### CSS Variables

The transparency grid reads three custom properties and no component writes
them, so a rule anywhere above the element wins:

| Variable | Default | Description |
|----------|---------|-------------|
| `--urcolor-checkerboard-dark` | `rgb(230, 230, 230)` | The darker of the two checks. |
| `--urcolor-checkerboard-light` | `white` | The lighter of the two checks. |
| `--urcolor-checkerboard-size` | `16px` | The tile size, applied to both axes. |

The grid is a single `background` shorthand, so an invalid value invalidates
the whole declaration rather than its own layer. Keep overrides to a `<color>`
and a `<length>`.

## Accessibility

ColorSlider provides a standard slider interface built on top of Reka UI's slider primitives, ensuring robust screen reader support.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorSliderThumb` for screen reader recognition. |
| `aria-label` | Defaults to the channel's label, e.g. `"Hue"` or `"Alpha"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The channel's range in display units. |
| `aria-valuenow` | The current channel value in display units. |
| `aria-valuetext` | The value formatted with its unit, e.g. `"210°"`, `"80%"`. |
| `aria-orientation` | Reflects the root's `orientation`. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase / decrease by 10 steps |
| Home | Move to the channel minimum |
| End | Move to the channel maximum |

`changeEnd` fires once when a change-producing interaction ends, not on every key repeat.
