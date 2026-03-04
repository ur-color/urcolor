# ColorWheel

A circular 2D area component for adjusting two color channels mapped to angle and radius.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorWheelHS from './demo/ColorWheelHS.tsx'
import ColorWheelHL from './demo/ColorWheelHL.tsx'
import ColorWheelOKLCh from './demo/ColorWheelOKLCh.tsx'
</script>

<ReactMount :component="ColorWheelHS" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorWheelHS.tsx

</details>

## Anatomy

```tsx
<ColorWheel.Root>
  <ColorWheel.Checkerboard />
  <ColorWheel.Gradient />
  <ColorWheel.Thumb />
</ColorWheel.Root>
```

## Examples

### HSL / Hue x Saturation

HSL color wheel with Hue mapped to angle and Saturation to radius.

<ReactMount :component="ColorWheelHS" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorWheelHS.tsx

</details>

### HSL / Hue x Lightness

HSL color wheel with Hue mapped to angle and Lightness to radius.

<ReactMount :component="ColorWheelHL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorWheelHL.tsx

</details>

### OKLCh / Hue x Chroma

OKLCh color wheel with Hue mapped to angle and Chroma to radius.

<ReactMount :component="ColorWheelOKLCh" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorWheelOKLCh.tsx

</details>

## API Reference

### ColorWheel.Root

The root container that manages wheel state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channelAngle` | `string` | Auto | Channel mapped to the angle axis. Auto-derived from color space. |
| `channelRadius` | `string` | Auto | Channel mapped to the radius axis. Auto-derived from color space. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `onValueChange` | `(color: Color) => void` | — | Called when color changes. |
| `onValueCommit` | `(color: Color) => void` | — | Called when interaction ends. |

### ColorWheel.Gradient

Renders a polar gradient canvas for the wheel.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. |

### ColorWheel.Checkerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency.

### ColorWheel.Thumb

Wrapper for the thumb indicator. Position is set automatically using polar coordinates.

### ColorWheel.ThumbX / ColorWheel.ThumbY

Individual axis thumb elements for angle and radius keyboard navigation.

## Accessibility

ColorWheel provides a circular 2D interface with two independently focusable thumb elements for keyboard access to the angle and radius axes.

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
