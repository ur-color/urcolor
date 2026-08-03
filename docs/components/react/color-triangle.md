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

Every part is also exported unnamespaced — `ColorTriangleRoot`, `ColorTriangleGradient`, `ColorTriangleThumb` — alongside the `ColorTriangle.*` namespace. Unlike `ColorWheel`, this family does not export its context hook; the root's state is reachable only through its own parts.

### ColorTriangle.Root

The root container that manages triangle state and color channel binding. Renders a `<div>`, clips it to the triangle with a CSS `clip-path`, and owns the pointer and keyboard interaction for the whole family.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsv'` | Color space (e.g. `'hsv'`, `'hsl'`, `'srgb'`). |
| `xChannel` | `string` | Auto | The channel mapped to the first vertex. Defaults to the color space's second channel. |
| `yChannel` | `string` | Auto | The channel mapped to the second vertex. Defaults to the color space's third channel. |
| `zChannel` | `string` | — | The channel mapped to the third vertex. Supplying it switches the triangle to a three-channel barycentric simplex. |
| `rotation` | `number` | `0` | Rotation of the triangle, in degrees. |
| `inverted` | `boolean` | `false` | Swaps the second and third vertices, mirroring the triangle. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether the thumb is centred on the edge or kept inside it. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `onValueChange` | `(color: Color) => void` | — | Called on every value change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called when a change-producing interaction ends. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the computed `clipPath`. |
| `children` | `React.ReactNode` | — | The triangle's parts. |

::: tip
:::

The root's props are an explicit list, not a DOM prop spread — it does not extend `ComponentPropsWithoutRef<"div">`. A pointer press that lands outside the outline is ignored: the root's box is a full square and the clip path hides the corners without stopping the event, so the root hit-tests every `pointerdown` against the triangle itself.

### ColorTriangle.Gradient

Renders the triangle's color surface as a `<canvas>` inside a wrapper `<span>`, sampled from the root's color space and channel configuration — including the third channel when one is set. The transparency checkerboard is the wrapper's own CSS background, which the canvas composites over, so no separate part is needed for it.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `className` | `string` | — | Class applied to the wrapper element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the wrapper's `background` and `clipPath`. |

Painting is skipped while a drag is in flight: a drag only moves the channels the surface already spans, so the pixels cannot change.

### ColorTriangle.Checkerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorTriangle.Gradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Renders a `<div>` and extends `ComponentPropsWithoutRef<"div">`.

### ColorTriangle.Thumb

The single combined handle, and the triangle's only focusable element. One thumb drives **every** axis: it renders `role="slider"`, takes `tabIndex={0}` unless the root is disabled, and is positioned from the barycentric coordinates of the channel values.

Because one handle serves two channels — or three, in barycentric mode — it announces all of them: `aria-label` names the channel set and `aria-valuetext` carries every formatted value. There is no separate thumb per axis — the per-axis thumbs this family used to ship have been removed. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` handler sees the events that bubble up from here.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel set | Overrides the generated `"Saturation, Brightness"` label. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the computed `left`, `top` and `transform`. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-color-triangle-root` | Root | Always. Marks the root for descendants and for styling. |
| `data-disabled` | Root, Gradient, Thumb | The root is disabled. |

## Accessibility

ColorTriangle exposes a single focusable thumb that drives both triangle axes — and the third channel too, in barycentric mode. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorTriangle.Thumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the channel labels in order, e.g. `"Saturation, Brightness"` — three entries when `zChannel` is set. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The first channel's range. |
| `aria-valuenow` | The current first-channel value. Only one number can be carried here, so the `xChannel` axis owns it. |
| `aria-valuetext` | Every active channel formatted, e.g. `"Saturation 80%, Brightness 50%"`. |
| `aria-disabled` | Applied to the root and the thumb when `disabled` is set. |

### Keyboard Navigation

#### Two-Channel Mode

| Key | Action |
|-----|--------|
| Arrow Right | Increase the second channel by one step |
| Arrow Left | Decrease the second channel by one step |
| Arrow Up | Increase the first channel by one step |
| Arrow Down | Decrease the first channel by one step |
| Shift + Arrow | Move by 4 steps |
| Home / Page Up | Move both channels to their maximum |
| End / Page Down | Move both channels to their minimum |

The reachable region is the half-simplex, so a step that would push the point past the hypotenuse gives way on the axis you did not drive.

#### Three-Channel Mode

With `zChannel` set, the keys move the barycentric weight of the `xChannel` axis and redistribute the remainder across the other two, so there is no third-axis key.

| Key | Action |
|-----|--------|
| Arrow Up / Arrow Right | Increase the first channel's weight by 5% |
| Arrow Down / Arrow Left | Decrease the first channel's weight by 5% |
| Shift + Arrow | Move by 20% |
| Page Up / Page Down | Increase / decrease by 20% (unaffected by Shift) |
| Home | Jump to the first channel's vertex |
| End | Jump to the centre — equal weight on all three |

Every write is renormalized onto the simplex (`u + v + w === 1`), so a color that starts off it is pulled onto it by the first keypress. `onValueCommit` fires on each keypress rather than once on release.
