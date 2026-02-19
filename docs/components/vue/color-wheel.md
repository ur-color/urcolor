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
    <ColorWheelThumb>
      <ColorWheelThumbX />
      <ColorWheelThumbY />
    </ColorWheelThumb>
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
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channelAngle` | `string` | Auto | Channel mapped to the angle axis (e.g. `'h'`). Auto-derived from color space. |
| `channelRadius` | `string` | Auto | Channel mapped to the radius axis (e.g. `'s'`). Auto-derived from color space. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends. |

### ColorWheelGradient

Renders a polar gradient canvas for the wheel. Automatically samples the gradient from the root's color space and channel configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |

### ColorWheelCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorWheelRoot` before `ColorWheelGradient`.

### ColorWheelThumb

Wrapper for the thumb indicator. Position is set automatically via CSS custom properties using polar coordinates.

### ColorWheelThumbX / ColorWheelThumbY

Individual axis thumb elements for angle and radius. Both are required inside `ColorWheelThumb` for keyboard navigation to work on both axes.

## Accessibility

ColorWheel provides a circular 2D interface with two independently focusable thumb elements for keyboard access to the angle and radius axes.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `aria-label` | Labels the root element with the color wheel's purpose. |
| `role="slider"` | Applied to each thumb element (ThumbX, ThumbY) for screen reader recognition. |
| `aria-valuemin` / `aria-valuemax` | Defines the range for the angle and radius channels. |
| `aria-valuenow` | Current value of the focused channel. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right | Increase angle by one step |
| Arrow Left | Decrease angle by one step |
| Arrow Up | Increase radius by one step |
| Arrow Down | Decrease radius by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase/decrease radius by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
