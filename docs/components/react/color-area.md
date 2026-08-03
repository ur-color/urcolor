# ColorArea

A rectangular 2D area component for adjusting two color channels mapped to the horizontal and vertical axes.

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
<ColorArea.Root>
  <ColorArea.Gradient />
  <ColorArea.Thumb />
</ColorArea.Root>
```

The root is the interaction surface: pointer capture, the keyboard handler and the box that pointer coordinates are measured against all live on it, so the gradient and the thumb sit directly inside it.

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

Every part is also exported unnamespaced — `ColorAreaRoot`, `ColorAreaGradient`, `ColorAreaThumb` — alongside the `ColorArea.*` namespace. The root's context is readable with `useColorAreaContext()`.

### ColorArea.Root

The root container that manages area state and color channel binding. Renders a `<div>` and owns the pointer and keyboard interaction for the whole family.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `xChannel` | `string` | Auto | Channel mapped to the X axis, or `'alpha'`. Defaults to the color space's first channel. |
| `yChannel` | `string` | Auto | Channel mapped to the Y axis, or `'alpha'`. Defaults to the color space's second channel. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Reading direction. `'rtl'` mirrors the X axis. |
| `xInverted` | `boolean` | `false` | Runs the X axis opposite to its natural direction. |
| `yInverted` | `boolean` | `false` | Runs the Y axis opposite to its natural direction. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether the thumb straddles the edge (`'overflow'`) or is pulled fully inside it. |
| `onValueChange` | `(color: Color) => void` | — | Called on every value change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called when a change-producing interaction ends. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged under the thumb-transform custom property. |
| `children` | `React.ReactNode` | — | The area's parts. |

::: tip
:::

::: warning
`ColorAreaRootProps` does not extend `ComponentPropsWithoutRef<"div">`. Only the props above are forwarded — arbitrary DOM attributes passed to the root are dropped, so put an `aria-label` on `ColorArea.Thumb` rather than on the root.
:::

The root publishes `--reka-slider-area-thumb-transform` in its own `style`, which is the centring transform the thumb consumes. `dir` and `xInverted` each mirror the X axis, so setting both cancels out.

### ColorArea.Gradient

Renders the area's two-dimensional color surface, sampled from the root's color space and channel configuration. Renders a `<span>` wrapper with an inner `<canvas>`. The transparency checkerboard is the wrapper's own CSS background, which the canvas bitmap composites over, so no separate part is needed for it.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topLeft` | `string` | — | Explicit top-left corner color. Supplying any corner switches the component to corner mode and ignores the channel sampling. |
| `topRight` | `string` | — | Explicit top-right corner color. |
| `bottomLeft` | `string` | — | Explicit bottom-left corner color. |
| `bottomRight` | `string` | — | Explicit bottom-right corner color. |
| `interpolationSpace` | `SpaceId` | — | Interpolate the corner surface in this space for perceptual accuracy. Switches the corner path from WebGL to a CPU sampler. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `className` | `string` | — | Class applied to the wrapper element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the wrapper's checkerboard `background`. |

### ColorArea.Checkerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorArea.Gradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Renders a `<div>` and extends `ComponentPropsWithoutRef<"div">`.

### ColorArea.Thumb

The single combined handle, and the area's only focusable element. One thumb drives **both** axes: it renders `role="slider"`, takes `tabIndex={0}` unless the root is disabled, and is positioned from the X and Y channel values. There is no separate thumb per axis.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `onKeyDown` handler sees the events that bubble up from here.

Extends `ComponentPropsWithoutRef<"span">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `index` | `number` | `0` | Which entry of the root's value list this thumb reads. The area drives a single thumb, so the default is the only useful value. |
| `aria-label` | `string` | — | Labels the handle. Not generated — pass one, or the control is announced without a name. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the computed absolute position. |

A mirrored axis is anchored from the opposite edge, so the thumb sets `right`/`bottom` instead of `left`/`top` and the percentage stays positive.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-slider-area-impl` | Root | Always. |
| `data-disabled` | Root, Gradient, Thumb | The root is disabled. |

## Accessibility

ColorArea exposes a single focusable thumb that drives both the X and the Y channel. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorArea.Thumb`, with `aria-roledescription="2D slider"`. |
| `aria-valuemin` / `aria-valuemax` | The X channel's range. |
| `aria-valuenow` | The current X channel value. Only one number can be carried here, so the X axis owns it. |
| `aria-disabled` | Always present on the root; `"true"` when `disabled` is set. |

::: warning
Unlike the Vue, Svelte and Angular packages, the React thumb does **not** generate an `aria-label` or an `aria-valuetext`. Pass your own `aria-label` to `ColorArea.Thumb` naming both channels, and an `aria-valuetext` if the raw X-axis number alone would be misleading.
:::

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Left | Move one step along the X axis |
| Arrow Down / Arrow Up | Move one step along the Y axis |
| Shift + Arrow | Move by 10 steps |
| Home / End | Jump to the left / right edge of the X axis |
| Page Up / Page Down | Jump to the top / bottom edge of the Y axis |

Keys address the *visual* axes: `xInverted`, `yInverted` and RTL flip the direction of travel so the thumb still moves the way the key points. Each key press that changes the value fires `onValueCommit` as well as `onValueChange`.
