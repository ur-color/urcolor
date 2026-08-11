# ColorRing

A circular ring component for adjusting a single color channel along a circular arc.

## Preview

<script setup>
import ColorRingHue from './demo/ColorRingHue.vue'
import ColorRingSaturation from './demo/ColorRingSaturation.vue'
</script>

<ColorRingHue />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorRingHue.vue

</details>

## Anatomy

```vue
<template>
  <ColorRingRoot>
    <ColorRingTrack>
      <ColorRingGradient />
      <ColorRingThumb />
    </ColorRingTrack>
  </ColorRingRoot>
</template>
```

## Examples

### Hue

Hue ring slider for cycling through the color spectrum.

<ColorRingHue />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorRingHue.vue

</details>

### Saturation

Saturation ring slider for adjusting color intensity.

<ColorRingSaturation />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorRingSaturation.vue

</details>

### With Alpha

Pass `:channel-overrides="false"` on `ColorRingGradient` to reflect the color's alpha channel as opacity on the gradient. `ColorRingGradient` paints the checkerboard behind the canvas automatically, so transparency is visible with no extra element.

```vue
<template>
  <ColorRingRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorUpdate"
  >
    <ColorRingTrack>
      <ColorRingGradient :channel-overrides="false" />
      <ColorRingThumb />
    </ColorRingTrack>
  </ColorRingRoot>
</template>
```

## API Reference

The root's context is readable from any descendant with `injectColorRingRootContext()`.

### ColorRingRoot

The root container that manages ring state and color channel binding. Renders a `<span>` by default and owns the pointer and keyboard interaction for the whole family.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | Auto | The channel the angle maps to. Defaults to the color space's first channel. |
| `startAngle` | `number` | `0` | Degrees clockwise from 12 o'clock at which the channel's minimum sits. |
| `innerRadius` | `number` | `0.7` | Hole radius as a ratio of the outer radius (0–1). Drives hit testing and the thumb's orbit. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. Inherited from the nearest Reka `ConfigProvider` when unset. |
| `name` | `string` | — | When set inside a `<form>`, renders a visually hidden input under this name carrying the color as a string. |
| `required` | `boolean` | — | Marks that hidden input as required. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted whenever the color changes. |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | Emitted on every value change, including mid-drag. |
| `changeEnd` | `Color` | Emitted when a change-producing interaction ends. |

The default slot receives the current color as `modelValue`.

::: tip
`channel`, `startAngle` and `innerRadius` are spelled identically in Vue, React, Svelte and Angular. Unlike `ColorWheel`, `ColorRing` has no per-framework prop-name divergence.
:::

The root must declare `container-type: inline-size` (or `size`): the thumb orbits in `cqmin` units, so it tracks the ring's size without measuring it.

Pointer input is only accepted inside the ring's annulus — a press in the hole at the centre, or outside the outer edge, is ignored. The hole's size follows the `inner-radius` prop.

### ColorRingTrack

The annulus the thumb travels around. Sizing and positioning are yours; this part only publishes the state attributes the gradient and thumb are styled against.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorRingGradient

Paints the ring's conic color ramp, sampled from the root's color space and channel. A conic sweep of one channel has an exact CSS equivalent in every color space, so by default this paints a `conic-gradient` and renders no `<canvas>` at all. The wrapper carries the annulus mask, which applies to it and to every descendant, so one rasterisation cuts both the hole and the corners. The transparency checkerboard is this element's own CSS background, which the gradient composites over, so no separate part is needed for it.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderer` | `'auto' \| 'css' \| 'canvas'` | `'auto'` | Which painter to use. `'auto'` paints with stacked CSS gradients when an exact recipe exists for the color space and channels, and falls back to the canvas otherwise. `'css'` forces the CSS path and warns in development if no recipe exists. `'canvas'` always paints into a `<canvas>`. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |
| `innerRadius` | `number` | Auto | **Deprecated.** Use `innerRadius` on `ColorRingRoot` instead. Overrides the mask's inner radius ratio for this gradient only, when set. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorRingCheckerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorRingGradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorRingTrack` before `ColorRingGradient`. Renders a `<div>` by default.

### ColorRingThumb

The handle, and the ring's only focusable element. It renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and orbits in `cqmin` units at the middle of the annulus, rotated to the channel's current position.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here. There is no `aria-orientation` — a ring is neither horizontal nor vertical.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel label | Overrides the generated label, e.g. `"Hue"`. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Track, Gradient, Thumb | The root is disabled. |

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

ColorRing exposes a single focusable thumb for the one channel the ring drives. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorRingThumb`. |
| `aria-label` | Defaults to the channel's label, e.g. `"Hue"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The channel's display-space range. |
| `aria-valuenow` | The channel's current value, in display units. |
| `aria-valuetext` | The value formatted with its unit, e.g. `"210°"` or `"80%"`. |
| `aria-disabled` | Applied to the root and the thumb when `disabled` is set. The thumb also drops its `tabindex`. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up | Increase by 10 steps (unaffected by Shift) |
| Page Down | Decrease by 10 steps (unaffected by Shift) |
| Home | Move to minimum |
| End | Move to maximum |

Both arrow axes drive the same angular value, so only the sign matters. When the controlled channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping.
