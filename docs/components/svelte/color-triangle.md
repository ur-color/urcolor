# ColorTriangle

A triangular 2D area component for adjusting two color channels — or three, as barycentric coordinates on a simplex.

## Preview

```svelte
<script lang="ts">
  import { ColorTriangle, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorTriangle.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsv"
  xChannel="s"
  yChannel="v"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorTriangle.Gradient class="absolute inset-0 block" />
  <ColorTriangle.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorTriangle.Root>
```

`useColor` returns an object whose `color`, `hex` and `alpha` members are **getters**, not refs. Keep the object rather than destructuring it, and bind with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which pairs the getter with the setter.

## Anatomy

```svelte
<ColorTriangle.Root>
  <ColorTriangle.Gradient />
  <ColorTriangle.Thumb />
</ColorTriangle.Root>
```

## Examples

### HSV / Saturation x Brightness

HSV triangle with Saturation and Brightness on the two axes. Both channels are the color space's defaults, so they can be omitted.

```svelte
<script lang="ts">
  import { ColorTriangle, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorTriangle.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsv"
  xChannel="s"
  yChannel="v"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorTriangle.Gradient class="absolute inset-0 block" />
  <ColorTriangle.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorTriangle.Root>
```

### HSL / Saturation x Lightness

The same two axes in HSL, where the second channel is Lightness.

```svelte
<ColorTriangle.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="s"
  yChannel="l"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorTriangle.Gradient class="absolute inset-0 block" />
  <ColorTriangle.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorTriangle.Root>
```

### Maxwell's RGB triangle

Supplying `zChannel` switches the triangle from a two-channel half-simplex to a full three-channel barycentric simplex. One thumb still drives all three.

```svelte
<ColorTriangle.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="srgb"
  xChannel="r"
  yChannel="g"
  zChannel="b"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorTriangle.Gradient class="absolute inset-0 block" />
  <ColorTriangle.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorTriangle.Root>
```

::: info The first keypress "jumps"
In three-channel mode the three values are barycentric coordinates: only the ratio
between them is meaningful, so the root renormalizes them onto the simplex
(`u + v + w === 1`) on every write. An `srgb` color that starts off the simplex is
rewritten onto it by the first arrow press. This is inherent to the geometry, not a
bug — afterwards the values stay on the simplex and step smoothly.
:::

### Rotation and mirroring

`rotation` turns the outline; `inverted` swaps the second and third vertices, mirroring it.

```svelte
<ColorTriangle.Root
  bind:value={() => colorState.color, colorState.setColor}
  rotation={180}
  inverted
  class="relative block size-64"
>
  <ColorTriangle.Gradient class="absolute inset-0 block" />
  <ColorTriangle.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorTriangle.Root>
```

### Keeping the thumb inside the outline

`thumbAlignment="contain"` positions the thumb against a triangle inset by half the thumb's own size, so its box never crosses an edge. The pointer maps onto the same inset triangle, so cursor and thumb still agree at the corners.

```svelte
<ColorTriangle.Root
  bind:value={() => colorState.color, colorState.setColor}
  thumbAlignment="contain"
  class="relative block size-64"
>
  <ColorTriangle.Gradient class="absolute inset-0 block" />
  <ColorTriangle.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorTriangle.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have rendered. The snippet receives the props the part built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorTriangle.Root bind:value={() => colorState.color, colorState.setColor}>
  {#snippet child({ props })}
    <section {...props}>
      <ColorTriangle.Gradient />
      <ColorTriangle.Thumb>
        {#snippet child({ props })}
          <button {...props}></button>
        {/snippet}
      </ColorTriangle.Thumb>
    </section>
  {/snippet}
</ColorTriangle.Root>
```

## API Reference

Every part is also exported unnamespaced — `ColorTriangleRoot`, `ColorTriangleGradient`, `ColorTriangleThumb` — alongside the `ColorTriangle.*` namespace. The root's context is readable with `colorTriangleContext.get()`.

### ColorTriangle.Root

The root container that manages triangle state and color channel binding. Renders a `<div>`, clips it to the triangle with a CSS `clip-path`, and owns the pointer and keyboard interaction for the whole family.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value. Bindable with `bind:value`. |
| `defaultValue` | `Color \| string \| null` | — | The color used until the first interaction when `value` is not bound. Falls back to `hsl(0, 100%, 50%)`. |
| `colorSpace` | `SpaceId` | `'hsv'` | Color space (e.g. `'hsv'`, `'hsl'`, `'srgb'`). |
| `xChannel` | `string` | Auto | The channel mapped to the first vertex. Defaults to the color space's second channel. |
| `yChannel` | `string` | Auto | The channel mapped to the second vertex. Defaults to the color space's third channel. |
| `zChannel` | `string` | — | The channel mapped to the third vertex. Supplying it switches the triangle to a three-channel simplex. |
| `rotation` | `number` | `0` | Rotation of the triangle, in degrees. |
| `inverted` | `boolean` | `false` | Swaps the second and third vertices, mirroring the triangle. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether the thumb is centred on the edge or kept inside it. |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the triangle. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

::: tip
:::

A pointer press that lands outside the outline is ignored: the root's box is a full square and the clip path hides the corners without stopping the event, so the root hit-tests every `pointerdown` against the triangle itself.

### ColorTriangle.Gradient

Renders the triangle's color surface as a `<canvas>` inside a wrapper `<span>`, sampled from the root's color space and channel configuration — including the third channel when one is set. The transparency checkerboard is the wrapper's own CSS background, which the canvas composites over — there is no `Checkerboard` part in this package.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `class` | `string` | — | Class applied to the wrapper element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default `<canvas>`, not the wrapper; receives the canvas props, including the paint attachment. The checkerboard wrapper is always rendered by this part. |

Painting is skipped while a drag is in flight: a drag only moves the channels the surface already spans, so the pixels cannot change.

### ColorTriangle.Thumb

The single combined handle, and the triangle's only focusable element. One thumb drives **every** axis: it renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned from the barycentric coordinates of the channel values.

Because one handle serves two channels — or three, in barycentric mode — it announces all of them: `aria-label` names the channel set and `aria-valuetext` carries every formatted value. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel set | Overrides the generated `"Saturation, Brightness"` label. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

The thumb registers itself with the root so the `"contain"` inset can be measured against it.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-color-triangle-root` | Root | Always. Marks the root for descendants and for styling. |
| `data-disabled` | Root, Gradient, Thumb | The root is disabled. |
| `data-dragging` | Root, Thumb | A pointer drag is in flight. |

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

| Key | Action |
|-----|--------|
| Arrow Right | Increase the first channel by one step |
| Arrow Left | Decrease the first channel by one step |
| Arrow Up | Increase the second channel by one step |
| Arrow Down | Decrease the second channel by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase / decrease the second channel by 10 steps (unaffected by Shift) |
| Home | Move both channels to their minimum |
| End | Move both channels to their maximum |

There is no third-axis key. In three-channel mode the `zChannel` value falls out of the barycentric renormalization of the other two, so the same four arrows cover the whole simplex.

In two-channel mode the reachable region is the half-simplex, so a step that would push the point past the hypotenuse gives way on the axis you did not drive. `onValueCommit` fires once on key release, not on every repeat.
