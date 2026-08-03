# ColorSlider

A 1D slider component for adjusting a single color channel, with a gradient track that reflects the current color.

## Preview

```svelte
<script lang="ts">
  import { ColorSlider, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="w-full"
>
  <ColorSlider.Track class="relative h-5 overflow-hidden rounded-xl">
    <ColorSlider.Gradient class="absolute inset-0 rounded-xl" />
    <ColorSlider.Thumb
      class="block size-5 rounded-full border-[2.5px] border-white bg-white shadow"
    />
  </ColorSlider.Track>
</ColorSlider.Root>
```

`useColor` returns an object whose `color`, `hex` and `alpha` members are **getters**, not refs. Keep the object rather than destructuring it, and bind with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which pairs the getter with the setter.

## Anatomy

```svelte
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

`Control` and `Range` are optional. The root owns the pointer and keyboard interaction for the whole family, so `Control` is only a styling hook, and `Range` is only needed when you want a filled portion of the track.

## Examples

### Hue

Leaving `colors` off lets the gradient derive its stops from the channel, but an explicit hue ramp reads better because it wraps back to red.

```svelte
<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="w-full"
>
  <ColorSlider.Track class="relative h-5 overflow-hidden rounded-xl">
    <ColorSlider.Gradient
      class="absolute inset-0 rounded-xl"
      colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
    />
    <ColorSlider.Thumb class="block size-5 rounded-full border-[2.5px] border-white bg-white" />
  </ColorSlider.Track>
</ColorSlider.Root>
```

### Saturation

With `colors` omitted, the gradient samples the saturation axis from the current color.

```svelte
<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="s"
  class="w-full"
>
  <ColorSlider.Track class="relative h-5 overflow-hidden rounded-xl">
    <ColorSlider.Gradient class="absolute inset-0 rounded-xl" />
    <ColorSlider.Thumb class="block size-5 rounded-full border-[2.5px] border-white bg-white" />
  </ColorSlider.Track>
</ColorSlider.Root>
```

### Vertical

`orientation="vertical"` flips the axis. The gradient's default angle follows it, becoming `90` instead of `0`.

```svelte
<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  channel="l"
  orientation="vertical"
  class="h-64"
>
  <ColorSlider.Track class="relative w-5 h-full overflow-hidden rounded-xl">
    <ColorSlider.Gradient class="absolute inset-0 rounded-xl" />
    <ColorSlider.Thumb class="block size-5 rounded-full border-[2.5px] border-white bg-white" />
  </ColorSlider.Track>
</ColorSlider.Root>
```

### Alpha channel

`channel="alpha"` turns the slider into an opacity control. The gradient runs from fully transparent to fully opaque and the checkerboard behind it makes that visible.

```svelte
<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  channel="alpha"
  class="w-full"
>
  <ColorSlider.Track class="relative h-5 overflow-hidden rounded-xl">
    <ColorSlider.Gradient class="absolute inset-0 rounded-xl" />
    <ColorSlider.Thumb class="block size-5 rounded-full border-[2.5px] border-white bg-white" />
  </ColorSlider.Track>
</ColorSlider.Root>
```

### Filled range

`ColorSlider.Range` positions itself absolutely over the filled share of the track, measured from the channel's minimum end.

```svelte
<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  channel="s"
  class="w-full"
>
  <ColorSlider.Track class="relative h-2 overflow-hidden rounded-full bg-neutral-200">
    <ColorSlider.Range class="bg-neutral-900" />
    <ColorSlider.Thumb class="block size-4 rounded-full border-2 border-white bg-neutral-900" />
  </ColorSlider.Track>
</ColorSlider.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have rendered. The snippet receives the props the part built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorSlider.Root bind:value={() => colorState.color, colorState.setColor}>
  {#snippet child({ props })}
    <section {...props}>
      <ColorSlider.Track>
        <ColorSlider.Gradient />
        <ColorSlider.Thumb>
          {#snippet child({ props })}
            <button {...props}></button>
          {/snippet}
        </ColorSlider.Thumb>
      </ColorSlider.Track>
    </section>
  {/snippet}
</ColorSlider.Root>
```

## API Reference

Every part is also exported unnamespaced — `ColorSliderRoot`, `ColorSliderControl`, `ColorSliderTrack`, `ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient` — alongside the `ColorSlider.*` namespace. The root's context is readable with `colorSliderContext.get()`.

### ColorSlider.Root

The root container that manages slider state and color channel binding. Renders a `<div>` and owns the pointer and keyboard interaction for the whole family.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value. Bindable with `bind:value`. |
| `defaultValue` | `Color \| string \| null` | — | The color used until the first interaction when `value` is not bound. Falls back to `hsl(210, 80%, 50%)`. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | Channel this slider controls (e.g. `'h'`, `'s'`, `'l'`, `'alpha'`). |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the slider. |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Reading direction. Mirrors the horizontal axis only. |
| `inverted` | `boolean` | `false` | Runs the slider opposite to its natural direction. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | The axis the slider runs along. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

The stepping interval is not a prop — it comes from the channel's own config, resolved from `colorSpace` and `channel`.

### ColorSlider.Control

An optional wrapper between the root and the track. It carries no behaviour of its own and exists as a styling hook that mirrors the other packages' part list. Renders a `<div>`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### ColorSlider.Track

The rail the thumb travels along. Positioning is yours; this part only publishes the state attributes the thumb and range are styled against. Renders a `<div>`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### ColorSlider.Range

The filled portion of the track, measured from the channel's minimum end. It sets its own `position`, offsets and extent inline; your own `style` is appended after them, so it wins the cascade. Renders a `<div>`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### ColorSlider.Gradient

Renders the slider's color ramp as a `<canvas>` inside a `<span>` wrapper. The transparency checkerboard is the wrapper's own CSS background, which the canvas composites over — there is no `Checkerboard` part in this package.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `string[]` | Auto | Explicit color stops. When omitted, 12 stops are computed from the channel and the current color. At least two valid stops are required, or nothing is painted. |
| `angle` | `number` | Auto | Rotation in degrees. Defaults to `90` when the slider is vertical, `0` otherwise. |
| `interpolationSpace` | `SpaceId` | — | Interpolates the stops in this space for perceptual accuracy (e.g. `'oklch'`). |
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `class` | `string` | — | Class applied to the wrapper element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default `<canvas>`, not the wrapper; receives the canvas props, including the paint attachment. The checkerboard wrapper is always rendered by this part. |

### ColorSlider.Thumb

The draggable handle, and the slider's only focusable element. It renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and positions itself along the track from the channel value.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here. Renders a `<div>`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel label | Overrides the generated label, e.g. `"Hue"`. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-orientation` | Root, Control, Track, Range, Thumb | Always; the value is `horizontal` or `vertical`. |
| `data-disabled` | Root, Control, Track, Range, Thumb | The root is disabled. |
| `data-dragging` | Root, Thumb | A pointer drag is in flight. |

`ColorSlider.Gradient` carries no state attributes; style it from an ancestor's.

## Accessibility

ColorSlider exposes a single focusable thumb for the channel it controls. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `ColorSlider.Thumb`. |
| `aria-label` | Defaults to the channel's label, e.g. `"Hue"` or `"Alpha"`. Pass your own `aria-label` on the thumb to override. |
| `aria-valuemin` / `aria-valuemax` | The channel's range in display units. |
| `aria-valuenow` | The current channel value in display units. |
| `aria-valuetext` | The value formatted with its unit, e.g. `"210°"`, `"80%"`. |
| `aria-orientation` | Reflects the root's `orientation`. |
| `aria-disabled` | Applied to the thumb when `disabled` is set; `tabindex` is dropped at the same time. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase / decrease by 10 steps (unaffected by Shift) |
| Home | Move to the channel minimum |
| End | Move to the channel maximum |

Both arrow axes are live whatever the orientation — the axis only matters for 2D controls. `dir="rtl"` mirrors the horizontal arrows and `inverted` flips the direction on top of that, while Home and End address value bounds rather than visual ends, so neither modifier applies to them. `onValueCommit` fires once on key release, not on every repeat.
