# ColorSlider

A 1D slider component for adjusting a single color channel, with a gradient track that reflects the current color.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorSliderHue from './demo/ColorSliderHue.tsx'
import ColorSliderSaturation from './demo/ColorSliderSaturation.tsx'
import ColorSliderLightness from './demo/ColorSliderLightness.tsx'
import ColorSliderVertical from './demo/ColorSliderVertical.tsx'
</script>

<ReactMount :component="ColorSliderHue" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSliderHue.tsx

</details>

## Anatomy

```tsx
<ColorSlider.Root>
  <ColorSlider.Control>
    <ColorSlider.Track>
      <ColorSlider.Checkerboard />
      <ColorSlider.Gradient />
      <ColorSlider.Thumb />
    </ColorSlider.Track>
  </ColorSlider.Control>
</ColorSlider.Root>
```

## Examples

### Hue

<ReactMount :component="ColorSliderHue" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSliderHue.tsx

</details>

### Saturation

<ReactMount :component="ColorSliderSaturation" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSliderSaturation.tsx

</details>

### Lightness

<ReactMount :component="ColorSliderLightness" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSliderLightness.tsx

</details>

### Vertical

<ReactMount :component="ColorSliderVertical" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSliderVertical.tsx

</details>

## API Reference

### ColorSlider.Root

The root container that manages slider state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string \| null` | — | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | Channel to control (e.g. `'h'`, `'s'`, `'l'`). |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `inverted` | `boolean` | `false` | Visually invert the slider. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider orientation. |
| `onValueChange` | `(color: Color) => void` | — | Called when color changes. |
| `onValueCommit` | `(color: Color) => void` | — | Called when interaction ends. |

### ColorSlider.Control

The clickable, interactive area that handles pointer events for dragging.

### ColorSlider.Track

The track area that contains the gradient and thumb.

### ColorSlider.Gradient

Renders a gradient canvas background for the slider track.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `string[]` | — | Array of color stops (minimum 2). |
| `angle` | `number` | — | Gradient angle in degrees. |
| `interpolationSpace` | `string` | — | Color space for perceptual interpolation (e.g. `'oklch'`). |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |

### ColorSlider.Checkerboard

Renders a checkerboard pattern behind the gradient to visualize alpha transparency.

### ColorSlider.Thumb

The draggable thumb element.

### ColorSlider.Range

The filled range portion of the track.

## Accessibility

ColorSlider provides a standard slider interface with robust screen reader support.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `aria-label` | Labels the slider with the controlled channel name. |
| `role="slider"` | Applied to the thumb element for screen reader recognition. |
| `aria-valuemin` / `aria-valuemax` | Defines the channel's value range. |
| `aria-valuenow` | Current value of the channel. |
| `aria-orientation` | Reflects horizontal or vertical orientation. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Left / Arrow Down | Decrease by one step |
| Arrow Right / Arrow Up | Increase by one step |
| Shift + Arrow | Move by 10 steps |
| Home | Move to minimum |
| End | Move to maximum |
| Page Up | Increase by large step |
| Page Down | Decrease by large step |
