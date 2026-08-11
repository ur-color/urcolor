# ColorWheel

A circular 2D area component for adjusting two color channels mapped to angle and radius.

## Preview

```svelte
<script lang="ts">
  import { ColorWheel, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  class="relative block size-64 overflow-hidden rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <ColorWheel.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorWheel.Root>
```

`useColor` returns an object whose `color`, `hex` and `alpha` members are **getters**, not refs. Keep the object rather than destructuring it, and bind with Svelte 5's function form, `bind:value={() => colorState.color, colorState.setColor}`, which pairs the getter with the setter.

## Anatomy

```svelte
<ColorWheel.Root>
  <ColorWheel.Gradient />
  <ColorWheel.Thumb />
</ColorWheel.Root>
```

## Examples

### HSL / Hue x Saturation

HSL color wheel with Hue mapped to angle and Saturation to radius. Both channels are the color space's defaults, so they can be omitted.

```svelte
<script lang="ts">
  import { ColorWheel, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="s"
  class="relative block size-64 rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <ColorWheel.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorWheel.Root>
```

### HSL / Hue x Lightness

HSL color wheel with Hue mapped to angle and Lightness to radius.

```svelte
<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="l"
  class="relative block size-64 rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <ColorWheel.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorWheel.Root>
```

### OKLCh / Hue x Chroma

OKLCh color wheel with Hue mapped to angle and Chroma to radius.

```svelte
<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="oklch"
  angleChannel="h"
  radiusChannel="c"
  class="relative block size-64 rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <ColorWheel.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorWheel.Root>
```

### Start angle offset

`startAngle` rotates the angle axis. `0` puts its origin at 12 o'clock.

```svelte
<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  startAngle={90}
  class="relative block size-64 rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <ColorWheel.Thumb class="size-4 rounded-full border-2 border-white" />
</ColorWheel.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have rendered. The snippet receives the props the part built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorWheel.Root bind:value={() => colorState.color, colorState.setColor}>
  {#snippet child({ props })}
    <section {...props}>
      <ColorWheel.Gradient />
      <ColorWheel.Thumb>
        {#snippet child({ props })}
          <button {...props}></button>
        {/snippet}
      </ColorWheel.Thumb>
    </section>
  {/snippet}
</ColorWheel.Root>
```

## API Reference

Every part is also exported unnamespaced, `ColorWheelRoot`, `ColorWheelGradient`, `ColorWheelThumb`, alongside the `ColorWheel.*` namespace. The root's context is readable with `colorWheelContext.get()`.

### ColorWheel.Root

The root container that manages wheel state and color channel binding. Renders a `<div>` and owns the pointer and keyboard interaction for the whole family.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value. Bindable with `bind:value`. |
| `defaultValue` | `Color \| string \| null` | — | The color used until the first interaction when `value` is not bound. Falls back to `hsl(0, 100%, 50%)`. |
| `colorSpace` | `SpaceId` | `'hsl'` | Color space (e.g. `'hsl'`, `'oklch'`). |
| `angleChannel` | `string` | Auto | Channel driven by the angular axis. Defaults to the color space's first channel. |
| `radiusChannel` | `string` | Auto | Channel driven by the radial axis. Defaults to the color space's second channel. |
| `startAngle` | `number` | `0` | Degrees of rotation for the angular axis. `0` puts its origin at 12 o'clock. |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the wheel. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-drag. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

::: tip
`angleChannel` and `radiusChannel` are the Svelte, Vue and Angular spelling. React names the same two props `channelAngle` and `channelRadius`.
:::

### ColorWheel.Gradient

Renders a polar gradient canvas for the wheel, sampled from the root's color space and channel configuration. The transparency checkerboard is the wrapper's own CSS background. There is no `Checkerboard` part in this package.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `Record<string, number> \| false` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Set to `false` to reflect all channels from the current color, including alpha. |
| `class` | `string` | — | Class applied to the wrapper element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default `<canvas>`, not the wrapper; receives the canvas props, including the paint attachment. The checkerboard wrapper is always rendered by this part. |

### ColorWheel.Thumb

The single combined handle, and the wheel's only focusable element. One thumb drives **both** axes: it renders `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned in polar coordinates from the angle and radius channel values.

Because one handle serves two channels, it announces both: `aria-label` names the channel pair and `aria-valuetext` carries both formatted values. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

Extends `HTMLAttributes<HTMLSpanElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | Channel pair | Overrides the generated `"Hue, Saturation"` label. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Gradient, Thumb | The root is disabled. |
| `data-dragging` | Root, Thumb | A pointer drag is in flight. |

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

When the angle channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping. `onValueCommit` fires once on key release, not on every repeat.
