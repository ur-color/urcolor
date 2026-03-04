# ColorArea

A 2D slider component for selecting values across two axes, ideal for color picking (e.g., saturation and lightness).

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorAreaHSL from './demo/ColorAreaHSL.tsx'
import ColorAreaOKLCh from './demo/ColorAreaOKLCh.tsx'
</script>

<ReactMount :component="ColorAreaHSL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorAreaHSL.tsx

</details>

## Anatomy

```tsx
<ColorAreaRoot>
  <ColorAreaTrack>
    <ColorAreaCheckerboard />
    <ColorAreaGradient />
    <ColorAreaThumb />
  </ColorAreaTrack>
</ColorAreaRoot>
```

## Examples

### HSL

HSL color area with Hue on X and Saturation on Y.

<ReactMount :component="ColorAreaHSL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorAreaHSL.tsx

</details>

### OKLCh

OKLCh color area with Chroma on X and Lightness on Y.

<ReactMount :component="ColorAreaOKLCh" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorAreaOKLCh.tsx

</details>

## API Reference

### ColorAreaRoot

The root container that manages slider state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channelX` | `string` | Auto | Channel for the X axis. Auto-derived from color space. |
| `channelY` | `string` | Auto | Channel for the Y axis. Auto-derived from color space. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `invertedX` | `boolean` | `false` | Invert X axis. |
| `invertedY` | `boolean` | `false` | Invert Y axis. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | How thumb is positioned relative to track bounds. |
| `onValueChange` | `(color: Color) => void` | — | Called when color changes. |
| `onValueCommit` | `(color: Color) => void` | — | Called when interaction ends. |

### ColorAreaTrack

The track area that contains thumbs and receives pointer events.

### ColorAreaGradient

Renders a 2D gradient canvas for the color area.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topLeft` | `string` | — | Override: color for the top-left corner. |
| `topRight` | `string` | — | Override: color for the top-right corner. |
| `bottomLeft` | `string` | — | Override: color for the bottom-left corner. |
| `bottomRight` | `string` | — | Override: color for the bottom-right corner. |
| `interpolationSpace` | `string` | — | Color space for perceptual interpolation. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. |

### ColorAreaCheckerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency.

### ColorAreaThumb

The draggable thumb element. Position is set automatically.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `index` | `number` | `0` | Thumb index for multi-thumb scenarios. |

## Accessibility

ColorArea provides a 2D slider interface with keyboard access to both axes.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Move by one step |
| Shift + Arrow | Move by 10 steps |
| Home / End | Move to X-axis min/max |
| Page Up / Page Down | Move to Y-axis min/max |
