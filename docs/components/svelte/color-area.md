# ColorArea

A rectangular 2D area component for adjusting two color channels mapped to the horizontal and vertical axes.

## Preview

```svelte
<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channelX="h"
  channelY="s"
  class="relative block h-[200px] w-full cursor-crosshair touch-none overflow-clip rounded-lg"
>
  <ColorArea.Gradient class="absolute inset-0" />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

`useColor` returns an object whose `color`, `hex` and `alpha` members are **getters**, not refs. Keep the object rather than destructuring it, and bind with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which pairs the getter with the setter.

## Anatomy

```svelte
<ColorArea.Root>
  <ColorArea.Gradient />
  <ColorArea.Thumb />
</ColorArea.Root>
```

The root is the interaction surface: pointer capture, the keyboard listener and the box that pointer coordinates are measured against all live on it, so the gradient and the thumb sit directly inside it.

## Examples

### HSL / Hue x Saturation

HSL color area with Hue on the horizontal axis and Saturation on the vertical axis. Both channels are the color space's defaults, so they can be omitted.

```svelte
<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channelX="h"
  channelY="s"
  class="relative block h-[200px] w-full touch-none overflow-clip rounded-lg"
>
  <ColorArea.Gradient class="absolute inset-0" />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

### OKLCh / Chroma x Lightness

OKLCh color area with Chroma on the horizontal axis and Lightness on the vertical axis.

```svelte
<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="oklch"
  channelX="c"
  channelY="l"
  class="relative block h-[200px] w-full touch-none overflow-clip rounded-lg"
>
  <ColorArea.Gradient class="absolute inset-0" />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

### Alpha on an axis

Map `channelY` to `"alpha"` to make the vertical axis drive opacity. The gradient is drawn with real transparency and composites over its own checkerboard.

```svelte
<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channelX="h"
  channelY="alpha"
  class="relative block h-[200px] w-full touch-none overflow-clip rounded-lg"
>
  <ColorArea.Gradient class="absolute inset-0" />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

### Reflecting the color's alpha

`channelOverrides` locks alpha to `1` by default. Pass `false` and the surface is drawn at the current color's own alpha instead.

```svelte
<ColorArea.Root bind:value={() => colorState.color, colorState.setColor}>
  <ColorArea.Gradient channelOverrides={false} class="absolute inset-0" />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

### Explicit corner colors

Supplying any of `topLeft`, `topRight`, `bottomLeft` or `bottomRight` switches the gradient to corner mode and ignores the channel sampling. Adding `interpolationSpace` swaps the WebGL path for a CPU one that interpolates perceptually in that space.

```svelte
<ColorArea.Root bind:value={() => colorState.color, colorState.setColor}>
  <ColorArea.Gradient
    topLeft="white"
    topRight="oklch(0.7 0.2 30)"
    bottomLeft="black"
    bottomRight="black"
    interpolationSpace="oklch"
    class="absolute inset-0"
  />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

### Inverted axes

`xInverted` and `yInverted` mirror an axis. The gradient, the thumb position and the arrow keys all follow, so the thumb still travels the way the key points.

```svelte
<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  yInverted
  class="relative block h-[200px] w-full touch-none overflow-clip rounded-lg"
>
  <ColorArea.Gradient class="absolute inset-0" />
  <ColorArea.Thumb class="absolute size-5 rounded-full border-2 border-white" />
</ColorArea.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have rendered. The snippet receives the props the part built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorArea.Root bind:value={() => colorState.color, colorState.setColor}>
  {#snippet child({ props })}
    <section {...props}>
      <ColorArea.Gradient />
      <ColorArea.Thumb>
        {#snippet child({ props })}
          <button {...props}></button>
        {/snippet}
      </ColorArea.Thumb>
    </section>
  {/snippet}
</ColorArea.Root>
```

## API Reference

Every part is also exported unnamespaced — `ColorAreaRoot`, `ColorAreaGradient`, `ColorAreaThumb` — alongside the `ColorArea.*` namespace. The root's context is readable with `colorAreaContext.get()`.

### ColorArea.Root

The root container that manages area state and color channel binding. Renders a `<div>` and owns the pointer and keyboard interaction for the whole family.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value. Bindable with `bind:value`. |
| `defaultValue` | `Color \| string \| null` | — | The color used until the first interaction when `value` is not bound. Falls back to `hsl(0, 100%, 50%)`. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channelX` | `string` | Auto | Channel driven by the horizontal axis, or `'alpha'`. Defaults to the color space's first channel. |
| `channelY` | `string` | Auto | Channel driven by the vertical axis, or `'alpha'`. Defaults to the color space's second channel. |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the area. |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Reading direction. `'rtl'` mirrors the horizontal axis, and is applied to the rendered element as well. |
| `xInverted` | `boolean` | `false` | Runs the horizontal axis opposite to its natural direction. |
| `yInverted` | `boolean` | `false` | Runs the vertical axis opposite to its natural direction. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | Whether the thumb straddles the edge (`'overflow'`) or is pulled fully inside it. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

::: tip
`channelX` and `channelY` are the Svelte, React and Angular spelling. Vue names the same two props `xChannel` and `yChannel`.
:::

The root publishes `--reka-slider-area-thumb-transform` on its own `style`, which is the centring transform the thumb consumes. `dir` and `xInverted` each mirror the horizontal axis, so setting both cancels out.

### ColorArea.Gradient

Renders the area's two-dimensional color surface, sampled from the root's color space and channel configuration. Renders a `<span>` wrapper with an inner `<canvas>`. The transparency checkerboard is the wrapper's own CSS background, which the canvas bitmap composites over — there is no `Checkerboard` part in this package.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topLeft` | `string` | — | Explicit top-left corner color. Supplying any corner switches the part to corner mode. |
| `topRight` | `string` | — | Explicit top-right corner color. |
| `bottomLeft` | `string` | — | Explicit bottom-left corner color. |
| `bottomRight` | `string` | — | Explicit bottom-right corner color. |
| `interpolationSpace` | `SpaceId` | — | Interpolate the corner surface in this space for perceptual accuracy. Switches the corner path from WebGL to a CPU sampler. |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `class` | `string` | — | Class applied to the wrapper element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default `<canvas>`, not the wrapper; receives the canvas props, including the paint attachment. The checkerboard wrapper is always rendered by this part. |

### ColorArea.Thumb

The single combined handle, and the area's only focusable element. One thumb drives **both** axes: it renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned from the horizontal and vertical channel values.

Because one handle serves two channels, it announces both — `aria-label` names the channel pair and `aria-valuetext` carries both formatted values. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel pair | Overrides the generated `"Hue and Saturation"` label. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

A mirrored axis is anchored from the opposite edge, so the thumb sets `right`/`bottom` instead of `left`/`top` and the percentage stays positive.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-slider-area-impl` | Root | Always. |
| `data-disabled` | Root, Gradient, Thumb | The root is disabled. |
| `data-dragging` | Root, Thumb | A pointer drag is in flight. |

## Accessibility

ColorArea exposes a single focusable thumb that drives both the horizontal and the vertical channel. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorArea.Thumb`, with `aria-roledescription="2D slider"`. |
| `aria-label` | Defaults to the two channel labels joined with "and", e.g. `"Hue and Saturation"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The horizontal channel's range. |
| `aria-valuenow` | The current horizontal channel value. Only one number can be carried here, so the X axis owns it. |
| `aria-valuetext` | Both channels formatted with their units, e.g. `"210°, 80%"`. |
| `aria-disabled` | Applied to the root and the thumb when `disabled` is set. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Left | Move one step along the horizontal axis |
| Arrow Down / Arrow Up | Move one step along the vertical axis |
| Shift + Arrow | Move by 10 steps |
| Home / End | Jump to the left / right edge of the horizontal axis |
| Page Up / Page Down | Jump to the top / bottom edge of the vertical axis |

Keys address the *visual* axes: `xInverted`, `yInverted` and RTL flip the direction of travel so the thumb still moves the way the key points. `onValueCommit` fires once on key release, not on every repeat.
