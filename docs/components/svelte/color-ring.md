# ColorRing

An annular component whose angle maps to a single color channel.

## Preview

```svelte
<script lang="ts">
  import { ColorRing, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorRing.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  innerRadius={0.85}
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorRing.Track class="relative block size-full">
    <ColorRing.Gradient class="absolute inset-0 block" />
    <ColorRing.Thumb class="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

`useColor` returns an object whose `color`, `hex` and `alpha` members are **getters**, not refs. Keep the object rather than destructuring it, and bind with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which pairs the getter with the setter.

The root must declare `container-type: inline-size` (or `size`): the thumb orbits in `cqmin` units, so it tracks the ring's size without measuring it.

## Anatomy

```svelte
<ColorRing.Root>
  <ColorRing.Track>
    <ColorRing.Gradient />
    <ColorRing.Thumb />
  </ColorRing.Track>
</ColorRing.Root>
```

## Examples

### Hue

A hue ring cycling through the spectrum. `h` is the HSL space's first channel, so `channel` could be omitted here.

```svelte
<ColorRing.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorRing.Track class="relative block size-full">
    <ColorRing.Gradient class="absolute inset-0 block" />
    <ColorRing.Thumb class="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

### Saturation

The same ring driving saturation instead. The channel's range and step come from the color space's channel config, so the ring wraps for hue and clamps here.

```svelte
<ColorRing.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="s"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorRing.Track class="relative block size-full">
    <ColorRing.Gradient class="absolute inset-0 block" />
    <ColorRing.Thumb class="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

### Ring thickness

`innerRadius` is the hole's radius as a ratio of the outer radius. It drives both hit testing and the thumb's orbit, so a thin ring stays clickable and keeps its thumb centred in the band.

```svelte
<ColorRing.Root
  bind:value={() => colorState.color, colorState.setColor}
  innerRadius={0.85}
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorRing.Track class="relative block size-full">
    <ColorRing.Gradient class="absolute inset-0 block" />
    <ColorRing.Thumb class="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

### Start angle offset

`startAngle` is the number of degrees clockwise from 12 o'clock at which the channel's minimum sits.

```svelte
<ColorRing.Root
  bind:value={() => colorState.color, colorState.setColor}
  startAngle={90}
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorRing.Track class="relative block size-full">
    <ColorRing.Gradient class="absolute inset-0 block" />
    <ColorRing.Thumb class="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

### Alpha in the gradient

`channelOverrides` defaults to `{ alpha: 1 }`, which paints the ramp fully opaque. Pass `false` to let the current color's alpha through — the checkerboard the gradient already paints is what makes it readable.

```svelte
<ColorRing.Root
  bind:value={() => colorState.color, colorState.setColor}
  class="relative block size-64"
  style="container-type: inline-size"
>
  <ColorRing.Track class="relative block size-full">
    <ColorRing.Gradient channelOverrides={false} class="absolute inset-0 block" />
    <ColorRing.Thumb class="size-4 rounded-full border-2 border-white" />
  </ColorRing.Track>
</ColorRing.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have rendered. The snippet receives the props the part built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorRing.Root bind:value={() => colorState.color, colorState.setColor}>
  {#snippet child({ props })}
    <section {...props}>
      <ColorRing.Track>
        <ColorRing.Gradient />
        <ColorRing.Thumb>
          {#snippet child({ props })}
            <button {...props}></button>
          {/snippet}
        </ColorRing.Thumb>
      </ColorRing.Track>
    </section>
  {/snippet}
</ColorRing.Root>
```

## API Reference

Every part is also exported unnamespaced — `ColorRingRoot`, `ColorRingTrack`, `ColorRingGradient`, `ColorRingThumb` — alongside the `ColorRing.*` namespace. The root's context is readable with `colorRingContext.get()`.

### ColorRing.Root

The root container. Renders a `<div>` and owns the color, the pointer capture and the keyboard interaction for the whole family.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value. Bindable with `bind:value`. |
| `defaultValue` | `Color \| string \| null` | — | The color used until the first interaction when `value` is not bound. Falls back to `hsl(0, 100%, 50%)`. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | Auto | The channel the angle maps to. Defaults to the color space's first channel. |
| `startAngle` | `number` | `0` | Degrees clockwise from 12 o'clock at which the channel's minimum sits. |
| `innerRadius` | `number` | `0.7` | Hole radius as a ratio of the outer radius (0–1). Drives hit testing and the thumb's orbit. |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the ring. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

::: tip
`channel`, `startAngle` and `innerRadius` are spelled identically in React, Vue, Svelte and Angular. Unlike `ColorWheel`, `ColorRing` has no per-framework prop-name divergence.
:::

Pointer input is only accepted inside the annulus — a press in the hole at the centre, or outside the outer edge, is ignored. The hole's size follows `innerRadius`.

### ColorRing.Track

The annulus the thumb travels around. Sizing and positioning are yours; this part only publishes the state attributes the gradient and thumb are styled against. Renders a `<div>`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### ColorRing.Gradient

Paints the ring's conic color ramp, sampled from the root's color space and channel. Renders a `<span>` wrapper with a `<canvas>` inside; the wrapper carries the annulus mask, which applies to it and to every descendant, so one rasterisation cuts both the hole and the corners. The transparency checkerboard is this element's CSS background, which the canvas bitmap composites over — there is no `Checkerboard` part in this package.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `class` | `string` | — | Class applied to the wrapper element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default `<canvas>`, not the wrapper; receives the canvas props, including the paint attachment. The checkerboard-and-mask wrapper is always rendered by this part. |

### ColorRing.Thumb

The handle, and the ring's only focusable element. It renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and orbits in `cqmin` units at the middle of the annulus, rotated to the channel's current position.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here. There is no `aria-orientation` — a ring is neither horizontal nor vertical.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel label | Overrides the generated label, e.g. `"Hue"`. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Track, Gradient, Thumb | The root is disabled. |
| `data-dragging` | Root, Track, Thumb | A pointer drag is in flight. |

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

ColorRing exposes a single focusable thumb for the one channel the ring drives. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorRing.Thumb`. |
| `aria-label` | Defaults to the channel's label, e.g. `"Hue"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The channel's display-space range. |
| `aria-valuenow` | The channel's current value, in display units. |
| `aria-valuetext` | The value formatted with its unit, e.g. `"210°"` or `"80%"`. |
| `aria-disabled` | Applied to the root and the thumb when `disabled` is set. The thumb also drops its `tabindex`. |

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

Both arrow axes drive the same angular value, so only the sign matters. When the channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping. `onValueCommit` fires once on key release, not on every repeat.
