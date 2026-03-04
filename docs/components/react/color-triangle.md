# ColorTriangle

A triangular 2D area component for adjusting two (or three) color channels simultaneously.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorTriangleSV from './demo/ColorTriangleSV.tsx'
import ColorTriangleSL from './demo/ColorTriangleSL.tsx'
import ColorTriangleRGB from './demo/ColorTriangleRGB.tsx'
</script>

<ReactMount :component="ColorTriangleSV" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorTriangleSV.tsx

</details>

## Anatomy

```tsx
<ColorTriangle.Root>
  <ColorTriangle.Checkerboard />
  <ColorTriangle.Gradient />
  <ColorTriangle.Thumb />
</ColorTriangle.Root>
```

## Examples

### HSV / Saturation x Value

HSV color triangle with Saturation and Value mapped to the triangle axes.

<ReactMount :component="ColorTriangleSV" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorTriangleSV.tsx

</details>

### HSL / Saturation x Lightness

HSL color triangle with Saturation and Lightness mapped to the triangle axes.

<ReactMount :component="ColorTriangleSL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorTriangleSL.tsx

</details>

### Maxwell's RGB Triangle

Three-channel RGB triangle using barycentric coordinates.

<ReactMount :component="ColorTriangleRGB" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorTriangleRGB.tsx

</details>

## API Reference

### ColorTriangle.Root

The root container that manages triangle state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsv'` | Color space mode (e.g. `'hsv'`, `'hsl'`, `'rgb'`). |
| `channelX` | `string` | Auto | Channel for the X axis. Auto-derived from color space. |
| `channelY` | `string` | Auto | Channel for the Y axis. Auto-derived from color space. |
| `channelZ` | `string` | — | Optional third channel for barycentric three-channel mode. |
| `rotation` | `number` | `0` | Triangle rotation in degrees. |
| `inverted` | `boolean` | `false` | Invert the triangle. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | How thumb is positioned relative to bounds. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `onValueChange` | `(color: Color) => void` | — | Called when color changes. |
| `onValueCommit` | `(color: Color) => void` | — | Called when interaction ends. |

### ColorTriangle.Gradient

Renders a triangular gradient canvas.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. |

### ColorTriangle.Checkerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency.

### ColorTriangle.Thumb

Wrapper for the thumb indicator. Position is set automatically.

### ColorTriangle.ThumbX / ColorTriangle.ThumbY

Individual axis thumb elements for keyboard navigation.

### ColorTriangle.ThumbZ

Optional third axis thumb for three-channel barycentric mode.

## Accessibility

ColorTriangle provides a triangular 2D interface with independently focusable thumb elements.

### Keyboard Navigation

#### Two-Channel Mode

| Key | Action |
|-----|--------|
| Arrow Right | Increase Y channel |
| Arrow Left | Decrease Y channel |
| Arrow Up | Increase X channel |
| Arrow Down | Decrease X channel |
| Shift + Arrow | Move by 10 steps |
| Home / Page Up | Jump to max |
| End / Page Down | Jump to min |

#### Three-Channel Mode

| Key | Action |
|-----|--------|
| Arrow Up / Arrow Right | Increase focused channel by 5% |
| Arrow Down / Arrow Left | Decrease focused channel by 5% |
| Shift + Arrow | Move by 20% |
| Page Up | Increase by 20% |
| Page Down | Decrease by 20% |
| Home | Jump to focused channel vertex |
| End | Jump to center (equal distribution) |
