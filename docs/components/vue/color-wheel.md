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

The root container that manages wheel state and color channel binding. Renders a `Primitive` and owns the pointer and keyboard interaction for the whole family. The root's context is readable with `injectColorWheelRootContext()`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `angleChannel` | `string` | Auto | Channel mapped to the angle axis (e.g. `'h'`). Defaults to the color space's first channel. |
| `radiusChannel` | `string` | Auto | Channel mapped to the radius axis (e.g. `'s'`). Defaults to the color space's second channel. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. `0` puts the angle axis origin at 12 o'clock. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

The default slot receives the current color as `modelValue`.

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted whenever the color changes. |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | Emitted on every value change, including mid-drag. |
| `changeEnd` | `Color` | Emitted when a change-producing interaction ends. |

::: tip
`angleChannel` and `radiusChannel` are the Vue, Svelte and Angular spelling. React names the same two props `channelAngle` and `channelRadius`.
:::

### ColorWheelGradient

Renders the wheel's polar gradient, sampled from the root's color space and channel configuration. A hue × saturation wheel in `hsv` or `hsl` has an exact CSS equivalent, a `conic-gradient` under a `radial-gradient`, so those render no `<canvas>` at all. Any other space or channel pair keeps the canvas. The transparency checkerboard is this element's own CSS background, so no separate part is needed for it.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderer` | `'auto' \| 'css' \| 'canvas'` | `'auto'` | Which painter to use. `'auto'` paints with stacked CSS gradients when an exact recipe exists for the color space and channels, and falls back to the canvas otherwise. `'css'` forces the CSS path and warns in development if no recipe exists. `'canvas'` always paints into a `<canvas>`. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorWheelCheckerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorWheelGradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Place it inside `ColorWheelRoot` before `ColorWheelGradient`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorWheelThumb

The single combined handle, and the wheel's only focusable element. One thumb drives **both** axes: it renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned from the angle and radius channel values in polar coordinates.

Because one handle serves two channels, it announces both: `aria-label` names the channel pair and `aria-valuetext` carries both formatted values. There is no separate thumb per axis.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel pair | Overrides the generated `"Hue, Saturation"` label. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Gradient, Thumb | The root is disabled. |

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

ColorWheel exposes a single focusable thumb that drives both the angle and the radius channel. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorWheelThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the angle and radius channel labels, e.g. `"Hue, Saturation"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The angle channel's range. |
| `aria-valuenow` | The current angle channel value. Only one number can be carried here, so the angle axis owns it. |
| `aria-valuetext` | Both channels formatted, e.g. `"Hue 210°, Saturation 80%"`. |
| `aria-disabled` | Applied to the root and the thumb when `disabled` is set. |

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
