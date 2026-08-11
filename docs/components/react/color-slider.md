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
      <ColorSlider.Gradient />
      <ColorSlider.Range />
      <ColorSlider.Thumb />
    </ColorSlider.Track>
  </ColorSlider.Control>
</ColorSlider.Root>
```

`ColorSlider.Range` is optional. Add it only when you want a filled portion of the track.

::: tip
`ColorSlider.Control` is React-only in the sense that Base UI requires it: `Slider.Control`, which this part renders, is where the pointer interaction lives, so `Track` has to be nested inside it. Vue has no `Control` part at all, and the Svelte and Angular packages ship one that is a pure styling hook because their roots own the pointer handling.
:::

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

Every part is also exported unnamespaced, `ColorSliderRoot`, `ColorSliderControl`, `ColorSliderTrack`, `ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient`, alongside the `ColorSlider.*` namespace. The root's context is readable with `useColorSliderContext()`.

### ColorSlider.Root

The root container that manages slider state and color channel binding. Renders Base UI's `Slider.Root`, a `<div>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string \| null` | — | Initial color when uncontrolled. Falls back to `hsl(210, 80%, 50%)`. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | Channel to control (e.g. `'h'`, `'s'`, `'l'`, `'alpha'`). |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. Read from context by the parts, but not forwarded to the underlying Base UI slider, wrap the tree in Base UI's `DirectionProvider` to change the slider's own direction. |
| `inverted` | `boolean` | `false` | Mirrors the gradient's color ramp. Only `ColorSlider.Gradient` reads it; the track, range and thumb positions are Base UI's and are unaffected. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider orientation. |
| `onValueChange` | `(color: Color) => void` | — | Called on every value change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called when a change-producing interaction ends. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the rendered element. |
| `children` | `React.ReactNode` | — | The slider's parts. |

The stepping interval is not a prop. It comes from the channel's own config, resolved from `colorSpace` and `channel`. The `alpha` channel is handled separately and ranges over `0`–`100`.

### ColorSlider.Control

The pointer-interaction area, rendering Base UI's `Slider.Control`. It is not optional: Base UI handles `pointerdown` here, so `ColorSlider.Track` must be nested inside it for dragging to work.

Extends `ComponentPropsWithoutRef<"div">`; it declares no props of its own.

### ColorSlider.Track

The rail the thumb travels along, rendering Base UI's `Slider.Track`.

Extends `ComponentPropsWithoutRef<"div">`; it declares no props of its own.

### ColorSlider.Range

The filled portion of the track, rendering Base UI's `Slider.Indicator`.

Extends `ComponentPropsWithoutRef<"div">`; it declares no props of its own.

### ColorSlider.Gradient

Renders the slider's color ramp as a `<canvas>` inside a `<span>` wrapper. The transparency checkerboard is the wrapper's own CSS background, which the canvas composites over, so no separate part is needed for it.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `string[]` | Auto | Explicit color stops. When omitted, 12 stops are computed from the slider's channel and current color. At least two valid stops are required, or nothing is painted. |
| `angle` | `number` | Auto | Rotation in degrees. Defaults to `90` when the slider is vertical, `0` otherwise. |
| `interpolationSpace` | `SpaceId` | — | Color space for perceptual interpolation (e.g. `'oklch'`). |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `className` | `string` | — | Class applied to the wrapper element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the wrapper's checkerboard `background`. |

### ColorSlider.Checkerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorSlider.Gradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Renders a `<div>` and extends `ComponentPropsWithoutRef<"div">`.

### ColorSlider.Thumb

The draggable handle, rendering Base UI's `Slider.Thumb`: a `<div>` with a nested `<input type="range">`. The input is the focusable control and carries the slider semantics; the outer `<div>` takes `tabIndex={-1}`.

Extends `ComponentPropsWithoutRef<"div">`; it declares no props of its own. `aria-label` passes through to the nested input.

::: tip
Unlike the Vue, Svelte and Angular packages, the React thumb does **not** generate an `aria-label` from the channel name. Pass one yourself, `<ColorSlider.Thumb aria-label="Hue" />`, or the input is announced with Base UI's default value text alone.
:::

### Data Attributes

Base UI applies these to the parts it renders.

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-orientation` | Root, Control, Track, Range, Thumb | Always; the value is `horizontal` or `vertical`. |
| `data-disabled` | Root, Control, Track, Range, Thumb | The root is disabled. |
| `data-dragging` | Root, Control, Track, Range, Thumb | A pointer drag is in flight. |

`ColorSlider.Gradient` is a plain element and carries no state attributes; style it from an ancestor's.

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

ColorSlider exposes a single focusable control for the channel it drives, provided by Base UI's slider: a visually hidden `<input type="range">` inside the thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Implicit, from the nested `<input type="range">`. |
| `aria-label` | Not generated. Pass `aria-label` on `ColorSlider.Thumb` to name the channel. |
| `aria-valuemin` / `aria-valuemax` | The channel's range in display units, taken from the `min` and `max` on the input. |
| `aria-valuenow` | The current channel value in display units. |
| `aria-valuetext` | Base UI's locale-formatted value. |
| `aria-orientation` | Reflects the root's `orientation`. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by Base UI's large step, which is `10` display units |
| Page Up / Page Down | Increase / decrease by the same large step |
| Home | Move to the channel minimum |
| End | Move to the channel maximum |

The large step is a fixed amount of `10`, not ten times the channel step. `onValueCommit` fires once at the end of an interaction, never on every repeat.
