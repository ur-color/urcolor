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

Every part is also exported unnamespaced — `ColorWheelRoot`, `ColorWheelGradient`, `ColorWheelThumb` — alongside the `ColorWheel.*` namespace. The root's context is readable with `useColorWheelContext()`.

### ColorWheel.Root

The root container that manages wheel state and color channel binding. Renders a `<div>` and owns the pointer and keyboard interaction for the whole family.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channelAngle` | `string` | Auto | Channel mapped to the angle axis. Defaults to the color space's first channel. |
| `channelRadius` | `string` | Auto | Channel mapped to the radius axis. Defaults to the color space's second channel. |
| `startAngle` | `number` | `0` | Starting angle offset in degrees. `0` puts the angle axis origin at 12 o'clock. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `onValueChange` | `(color: Color) => void` | — | Called on every value change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called when a change-producing interaction ends. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the rendered element. |
| `children` | `React.ReactNode` | — | The wheel's parts. |

::: tip
`channelAngle` and `channelRadius` are the React spelling. Vue, Svelte and Angular name the same two props `angleChannel` and `radiusChannel`.
:::

### ColorWheel.Gradient

Renders a polar gradient canvas for the wheel, sampled from the root's color space and channel configuration. The transparency checkerboard is this element's own CSS background, so no separate part is needed for it.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `className` | `string` | — | Class applied to the wrapper element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the wrapper's `background` and `border-radius`. |

### ColorWheel.Checkerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorWheel.Gradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Renders a `<div>` and extends `ComponentPropsWithoutRef<"div">`.

### ColorWheel.Thumb

The single combined handle, and the wheel's only focusable element. One thumb drives **both** axes: it renders `role="slider"`, takes `tabIndex={0}` unless the root is disabled, and is positioned in polar coordinates from the angle and radius channel values.

Because one handle serves two channels, it announces both — `aria-label` names the channel pair and `aria-valuetext` carries both formatted values. There is no separate thumb per axis.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel pair | Overrides the generated `"Hue, Saturation"` label. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the computed polar `transform`. |

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
| `role="slider"` | Applied to `ColorWheel.Thumb`, with `aria-roledescription="Color thumb"`. |
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
