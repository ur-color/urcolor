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
      <ColorRingCheckerboard />
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
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | Auto | Channel to control (e.g. `'h'`, `'s'`). Auto-derived from color space. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
| `innerRadius` | `number` | `0.7` | Inner radius ratio (0–1) controlling ring thickness. |
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

### ColorRingTrack

The track container that holds the gradient, checkerboard, and thumb.

### ColorRingGradient

Renders a ring gradient canvas for the track. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorRingCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorRingTrack` before `ColorRingGradient`.

### ColorRingThumb

The draggable thumb element positioned along the ring arc.

## Accessibility

ColorRing provides a circular slider interface for adjusting a single color channel with full keyboard support.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `aria-label` | Labels the slider with the controlled channel name. |
| `role="slider"` | Applied to the thumb element for screen reader recognition. |
| `aria-valuemin` / `aria-valuemax` | Defines the channel's value range. |
| `aria-valuenow` | Current value of the channel. |

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

When the controlled channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping.

Pointer input is only accepted inside the ring's annulus — a press in the hole at the centre, or outside the outer edge, is ignored. The hole's size follows the `inner-radius` prop.
