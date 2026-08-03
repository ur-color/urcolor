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

### Alpha in the gradient

`channelOverrides` defaults to `{ alpha: 1 }`, which paints the ramp fully opaque. Pass `false` to let the current color's alpha through — the checkerboard `ColorRing.Gradient` already paints is what makes it readable, so no extra element is needed.

```tsx
<ColorRing.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channel="h"
  className="relative block size-64"
  style={{ containerType: "inline-size" }}
>
  <ColorRing.Track className="relative block size-full">
    <ColorRing.Gradient channelOverrides={false} className="absolute inset-0 block" />
    <ColorRing.Thumb className="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

## API Reference

Every part is also exported unnamespaced — `ColorRingRoot`, `ColorRingTrack`, `ColorRingGradient`, `ColorRingThumb` — alongside the `ColorRing.*` namespace. The root's context is readable with `useColorRingContext()`.

### ColorRing.Root

The root container that manages ring state and color channel binding. Renders a `<div>` and owns the pointer and keyboard interaction for the whole family.

Unlike the other parts, `ColorRingRootProps` does not extend the DOM props of the element it renders — only the props below are forwarded, plus `ref`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | Auto | The channel the angle maps to. Defaults to the color space's first channel. |
| `startAngle` | `number` | `0` | Degrees clockwise from 12 o'clock at which the channel's minimum sits. |
| `innerRadius` | `number` | `0.7` | Hole radius as a ratio of the outer radius (0–1). Drives hit testing and the thumb's orbit. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `onValueChange` | `(color: Color) => void` | — | Called on every value change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called when a change-producing interaction ends, and on each value-changing key press. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the rendered element. |
| `children` | `React.ReactNode` | — | The ring's parts. |

::: tip
`channel`, `startAngle` and `innerRadius` are spelled identically in React, Vue, Svelte and Angular. Unlike `ColorWheel`, `ColorRing` has no per-framework prop-name divergence.
:::

The root must declare `container-type: inline-size` (or `size`): the thumb orbits in `cqmin` units, so it tracks the ring's size without measuring it.

Pointer input is only accepted inside the annulus — a press in the hole at the centre, or outside the outer edge, is ignored. The hole's size follows `innerRadius`.

### ColorRing.Track

The annulus the thumb travels around. Sizing and positioning are yours; this part only publishes the state attributes the gradient and thumb are styled against. Renders a `<div>` and extends `ComponentPropsWithoutRef<"div">`.

### ColorRing.Gradient

Paints the ring's conic color ramp, sampled from the root's color space and channel. Renders a `<span>` wrapper with a `<canvas>` inside; the wrapper carries the annulus mask, which applies to it and to every descendant, so one rasterisation cuts both the hole and the corners. The transparency checkerboard is this element's own CSS background, which the canvas bitmap composites over, so no separate part is needed for it.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `className` | `string` | — | Class applied to the wrapper element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the wrapper's `background` and mask. |

### ColorRing.Checkerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorRing.Gradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Renders a `<div>` and extends `ComponentPropsWithoutRef<"div">`.

### ColorRing.Thumb

The handle, and the ring's only focusable element. It renders `role="slider"`, takes `tabIndex={0}`, and orbits in `cqmin` units at the middle of the annulus, rotated to the channel's current position.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here. There is no `aria-orientation` — a ring is neither horizontal nor vertical.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | — | Labels the slider. React does not generate one from the channel, so pass it yourself. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the computed polar `transform`. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Track, Gradient, Thumb | The root is disabled. |

## Accessibility

ColorRing exposes a single focusable thumb for the one channel the ring drives. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorRing.Thumb`. |
| `aria-label` | Not generated by the React thumb — pass your own, e.g. `aria-label="Hue"`. Vue, Svelte and Angular fall back to the channel's label. |
| `aria-valuemin` / `aria-valuemax` | The channel's display-space range. |
| `aria-valuenow` | The channel's current value, in display units. |
| `aria-disabled` | Reflected on the root and the thumb; React writes `"false"` while enabled. |

::: warning
The React thumb keeps `tabIndex={0}` even when the root is `disabled`, so it stays in the tab order; the root still refuses pointer and keyboard input. Vue, Svelte and Angular drop the attribute instead.
:::

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up | Increase by 10 steps (unaffected by Shift) |
| Page Down | Decrease by 10 steps (unaffected by Shift) |
| Home | Move to minimum |
| End | Move to maximum |

Both arrow axes drive the same angular value, so only the sign matters. When the controlled channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping.
