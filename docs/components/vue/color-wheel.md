# ColorWheel

A circular 2D area component for adjusting two color channels mapped to angle and radius.

## Preview

<script setup>
import ColorWheelHS from './demo/ColorWheelHS.vue'
import ColorWheelHL from './demo/ColorWheelHL.vue'
import ColorWheelOKLCh from './demo/ColorWheelOKLCh.vue'
</script>

<ColorWheelHS />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorWheelHS.vue

</details>

## Anatomy

```vue
<template>
  <ColorWheelRoot>
    <ColorWheelCheckerboard />
    <ColorWheelGradient />
    <ColorWheelThumb />
  </ColorWheelRoot>
</template>
```

## Examples

### HSL / Hue x Saturation

HSL color wheel with Hue mapped to angle and Saturation to radius.

<ColorWheelHS />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorWheelHS.vue

</details>

### HSL / Hue x Lightness

HSL color wheel with Hue mapped to angle and Lightness to radius.

<ColorWheelHL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorWheelHL.vue

</details>

### OKLCh / Hue x Chroma

OKLCh color wheel with Hue mapped to angle and Chroma to radius.

<ColorWheelOKLCh />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorWheelOKLCh.vue

</details>

## API Reference

### ColorWheelRoot

The root container that manages wheel state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `angleChannel` | `string` | Auto | Channel mapped to the angle axis (e.g. `'h'`). Defaults to the color space's first channel. |
| `radiusChannel` | `string` | Auto | Channel mapped to the radius axis (e.g. `'s'`). Defaults to the color space's second channel. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
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

### ColorWheelGradient

Renders a polar gradient canvas for the wheel. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorWheelCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorWheelRoot` before `ColorWheelGradient`.

### ColorWheelThumb

The thumb indicator, and the wheel's only focusable element. It renders `role="slider"` and is positioned from the angle and radius channel values in polar coordinates.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

## Accessibility

ColorWheel exposes a single focusable thumb that drives both the angle and the radius channel.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorWheelThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the angle and radius channel labels, e.g. `"Hue, Saturation"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The angle channel's range. |
| `aria-valuenow` | The current angle channel value. |
| `aria-valuetext` | Both channels formatted, e.g. `"Hue 210°, Saturation 80%"`. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right | Increase angle by one step |
| Arrow Left | Decrease angle by one step |
| Arrow Up | Increase radius by one step |
| Arrow Down | Decrease radius by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase / decrease radius by 10 steps (unaffected by Shift) |
| Home | Move both angle and radius to their minimum |
| End | Move both angle and radius to their maximum |

When the angle channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping.
