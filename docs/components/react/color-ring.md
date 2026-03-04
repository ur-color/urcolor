# ColorRing

A circular ring component for adjusting a single color channel along a circular arc.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorRingHue from './demo/ColorRingHue.tsx'
import ColorRingSaturation from './demo/ColorRingSaturation.tsx'
</script>

<ReactMount :component="ColorRingHue" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorRingHue.tsx

</details>

## Anatomy

```tsx
<ColorRing.Root>
  <ColorRing.Track>
    <ColorRing.Checkerboard />
    <ColorRing.Gradient />
    <ColorRing.Thumb />
  </ColorRing.Track>
</ColorRing.Root>
```

## Examples

### Hue

Hue ring slider for cycling through the color spectrum.

<ReactMount :component="ColorRingHue" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorRingHue.tsx

</details>

### Saturation

Saturation ring slider for adjusting color intensity.

<ReactMount :component="ColorRingSaturation" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorRingSaturation.tsx

</details>

## API Reference

### ColorRing.Root

The root container that manages ring state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | Auto | Channel to control. Auto-derived from color space. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. |
| `innerRadius` | `number` | `0.7` | Inner radius ratio (0–1) controlling ring thickness. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `onValueChange` | `(color: Color) => void` | — | Called when color changes. |
| `onValueCommit` | `(color: Color) => void` | — | Called when interaction ends. |

### ColorRing.Track

The track container that holds the gradient, checkerboard, and thumb.

### ColorRing.Gradient

Renders a ring gradient canvas for the track.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. |

### ColorRing.Checkerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency.

### ColorRing.Thumb

The draggable thumb element positioned along the ring arc.

## Accessibility

ColorRing provides a circular slider interface for adjusting a single color channel with full keyboard support.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up | Increase by 10 steps |
| Page Down | Decrease by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
