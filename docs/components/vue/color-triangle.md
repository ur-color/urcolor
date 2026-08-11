# ColorTriangle

A triangular 2D area component for adjusting two (or three) color channels simultaneously.

## Preview

<script setup>
import ColorTriangleSV from './demo/ColorTriangleSV.vue'
import ColorTriangleSL from './demo/ColorTriangleSL.vue'
import ColorTriangleRGB from './demo/ColorTriangleRGB.vue'
</script>

<ColorTriangleSV />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleSV.vue

</details>

## Anatomy

```vue
<template>
  <ColorTriangleRoot>
    <ColorTriangleGradient />
    <ColorTriangleThumb />
  </ColorTriangleRoot>
</template>
```

## Examples

### HSV / Saturation x Value

HSV color triangle with Saturation and Value mapped to the triangle axes.

<ColorTriangleSV />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleSV.vue

</details>

### HSL / Saturation x Lightness

HSL color triangle with Saturation and Lightness mapped to the triangle axes.

<ColorTriangleSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleSL.vue

</details>

### Maxwell's RGB Triangle

Three-channel RGB triangle using barycentric coordinates.

<ColorTriangleRGB />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorTriangleRGB.vue

</details>

### Three-Channel Mode

Pass `z-channel` to enable three-channel barycentric mode. The single `ColorTriangleThumb` drives all three channels.

```vue
<script setup>
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
} from "@urcolor/vue";
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="srgb"
    x-channel="r"
    y-channel="g"
    z-channel="b"
  >
    <ColorTriangleGradient />
    <ColorTriangleThumb />
  </ColorTriangleRoot>
</template>
```

::: info The first keypress "jumps"
In three-channel mode the three values are barycentric coordinates: only the ratio
between them is meaningful, so the component renormalizes them onto the simplex
(`u + v + w === 1`) on every write. An `srgb` color sitting at `r/g/b 50 / 50 / 180`
is rewritten to `46 / 45 / 163` the first time you press Arrow Right (which steps
red by one and, as a side effect of the renormalization, pulls all three channels
onto the simplex). This is inherent to the geometry, not a bug — after the first
write the values stay on the simplex and step smoothly.
:::

## API Reference

Every part is a named export from `@urcolor/vue`. The root's context is readable with `injectColorTriangleRootContext()`.

### ColorTriangleRoot

The root container that manages triangle state and color channel binding. Clips itself to the triangle with a CSS `clip-path` and owns the pointer and keyboard interaction for the whole family.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsv'` | Color space (e.g. `'hsv'`, `'hsl'`, `'srgb'`). |
| `xChannel` | `string` | Auto | The channel mapped to the first vertex. Defaults to the color space's second channel. |
| `yChannel` | `string` | Auto | The channel mapped to the second vertex. Defaults to the color space's third channel. |
| `zChannel` | `string` | — | The channel mapped to the third vertex. Setting it switches the triangle into barycentric three-channel mode. |
| `rotation` | `number` | `0` | Rotation of the triangle, in degrees. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Published on the root context for descendants. The geometry itself is driven by `rotation` and `inverted`. |
| `inverted` | `boolean` | `false` | Swap the second and third vertices, mirroring the triangle. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether the thumb is kept inside the triangle's edges. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. Inherited from the nearest provider when omitted. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | — | Forwarded to the hidden form input. Only meaningful alongside `name`. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted whenever the color changes. |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | Emitted on every value change, including mid-drag. |
| `changeEnd` | `Color` | Emitted when a change-producing interaction ends. |

::: tip
:::

A pointer press that lands outside the outline is ignored: the root's box is a full square and the clip path hides the corners without stopping the event, so the root hit-tests every `pointerdown` against the triangle itself.

When `name` is set on a form control, the root also renders a visually hidden `<input type="hidden">` carrying the serialized color.

### ColorTriangleGradient

Renders the triangle's color surface as a `<canvas>` inside a wrapper element, sampled from the root's color space and channel configuration — including the third channel when one is set. A barycentric sweep has no CSS equivalent, so unlike the other gradients this always paints into a canvas and does not appear in server-rendered HTML. The transparency checkerboard is the wrapper's own CSS background, which the canvas composites over, so no separate part is needed for it.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderer` | `'auto' \| 'css' \| 'canvas'` | `'auto'` | Accepted for symmetry with the other gradients. A barycentric sweep has no CSS recipe, so every value paints into a `<canvas>`; `'css'` warns in development. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from current color including alpha. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

Painting is skipped while a drag is in flight: a drag only moves the channels the surface already spans, so the pixels cannot change.

### ColorTriangleCheckerboard <Badge type="warning" text="deprecated" />

::: warning Deprecated
`ColorTriangleGradient` now paints the checkerboard itself, so this component is no longer needed and is kept only for backwards compatibility. It emits a one-time console warning in development. To render a checkerboard elsewhere, apply a CSS `repeating-conic-gradient` background to your own element.
:::

Renders a checkerboard pattern behind the gradient to visualize alpha transparency. Renders a `<div>` by default. Place it inside `ColorTriangleRoot` before `ColorTriangleGradient`.

### ColorTriangleThumb

The single combined handle, and the triangle's only focusable element. One thumb drives **every** axis: it renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned from the barycentric coordinates of the channel values.

Because one handle serves two channels — or three, in barycentric mode — it announces all of them: `aria-label` names the channel set and `aria-valuetext` carries every formatted value. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` handler sees the events that bubble up from here.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel set | Overrides the generated `"Saturation, Brightness"` label. Passed through `$attrs`. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

The thumb registers itself with the root so the `"contain"` inset can be measured against it.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-color-triangle-root` | Root | Always. Marks the root for descendants and for styling. |
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

ColorTriangle exposes a single focusable thumb that drives both triangle axes — and the third channel too, in barycentric mode. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorTriangleThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the channel labels in order, e.g. `"Saturation, Brightness"` — three entries when `zChannel` is set. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The X channel's range. |
| `aria-valuenow` | The current X channel value. Only one number can be carried here, so the `xChannel` axis owns it. |
| `aria-valuetext` | Every active channel formatted, e.g. `"Saturation 80%, Brightness 50%"`. |
| `aria-disabled` | Applied to the root and the thumb when `disabled` is set. |

### Keyboard Navigation

Arrow keys map to the X and Y axes, matching `ColorArea`.

| Key | Action |
|-----|--------|
| Arrow Left / Arrow Right | Decrease / increase the X channel by one step |
| Arrow Down / Arrow Up | Decrease / increase the Y channel by one step |
| Page Down / Page Up | Decrease / increase the Z channel by one step — three-channel mode only |
| Shift + Arrow, Shift + Page | Move by 10 steps |
| Home | Jump to the X channel's minimum |
| End | Jump to the X channel's maximum |

In two-channel mode the reachable region is the half-simplex, so a step that would
push the point past the hypotenuse gives way on the axis you did not drive. In
three-channel mode every write is renormalized onto the simplex — see
[Three-Channel Mode](#three-channel-mode) for what that means for the first keypress.

::: warning Vue's page keys differ
Vue is the only package where `Page Up` / `Page Down` drive the Z channel. React, Svelte
and Angular have no third-axis key at all — the Z value falls out of the barycentric
renormalization of the other two.
:::
