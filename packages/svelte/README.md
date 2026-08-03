# @urcolor/svelte

Headless, accessible color picker components for Svelte 5. Unstyled primitives
built on runes — bring your own styles.

```sh
bun add @urcolor/svelte     # or: npm i @urcolor/svelte
```

Requires Svelte `^5.29`. Pulls in [`@urcolor/core`](../core) (the color engine)
and [`@urcolor/shared`](../shared) (rendering and interaction) automatically.

## Features

- **Headless** — unstyled primitives, full styling freedom
- **Runes throughout** — every root's `value` is `bind:`able; no stores to wire up
- **12 color spaces** — HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, sRGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020, all with alpha
- **WebGL gradients** — GPU canvas backgrounds via `@urcolor/shared`, with a CPU sampler fallback
- **Accessible** — keyboard navigation, ARIA wiring, roving focus
- **`child` snippets** — every part accepts a `child` snippet to render a different element with the props it would have received

## Two import styles

Every component is exported both flat and namespaced. They are the same
components:

```svelte
import { ColorAreaRoot, ColorAreaGradient, ColorAreaThumb } from "@urcolor/svelte";
import { ColorArea } from "@urcolor/svelte";   // ColorArea.Root, .Gradient, .Thumb
```

## Components

### ColorArea

Two-dimensional selection across any pair of channels.

```svelte
<script lang="ts">
  import { Color } from "@urcolor/core";
  import { ColorAreaRoot, ColorAreaGradient, ColorAreaThumb } from "@urcolor/svelte";

  let color = $state<Color | null>(Color.parse("hsl(200, 100%, 50%)"));
</script>

<ColorAreaRoot bind:value={color} colorSpace="hsl" xChannel="s" yChannel="l">
  <ColorAreaGradient />
  <ColorAreaThumb />
</ColorAreaRoot>
```

**Props:** `value` (bindable), `defaultValue`, `colorSpace`, `xChannel`,
`yChannel`, `xInverted`, `yInverted`, `thumbAlignment` (`"contain" | "overflow"`),
`disabled`, `dir`, `onValueChange`, `onValueCommit`, `child`

**Parts:** `ColorAreaRoot`, `ColorAreaGradient`, `ColorAreaThumb`

### ColorSlider

Single-channel slider.

```svelte
<ColorSliderRoot bind:value={color} colorSpace="hsl" channel="h">
  <ColorSliderControl>
    <ColorSliderTrack>
      <ColorSliderGradient />
      <ColorSliderThumb />
    </ColorSliderTrack>
  </ColorSliderControl>
</ColorSliderRoot>
```

`ColorSliderControl` is the interaction surface — it carries the pointer and
keyboard handlers and is the box pointer coordinates are measured against.

**Props:** `value` (bindable), `defaultValue`, `colorSpace`, `channel`,
`orientation` (`"horizontal" | "vertical"`), `inverted`, `disabled`, `dir`,
`onValueChange`, `onValueCommit`, `child`

**Parts:** `ColorSliderRoot`, `ColorSliderControl`, `ColorSliderTrack`,
`ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient`

### ColorField

Text input for one channel, with steppers.

```svelte
<ColorFieldRoot bind:value={color} colorSpace="hsl" channel="h">
  <ColorFieldDecrement>−</ColorFieldDecrement>
  <ColorFieldInput />
  <ColorFieldIncrement>+</ColorFieldIncrement>
</ColorFieldRoot>
```

**Props:** `value` (bindable), `defaultValue`, `colorSpace`, `channel`,
`format` (`"number" | "degree" | "percentage" | "hex"`), `min`, `max`, `step`,
`disabled`, `readOnly`, `onValueChange`, `onValueCommit`, `child`

**Keyboard:** Arrow Up/Down steps, Page Up/Down steps by 10×, Home/End jump to min/max.

**Parts:** `ColorFieldRoot`, `ColorFieldInput`, `ColorFieldIncrement`,
`ColorFieldDecrement`, `ColorFieldSwatch`

### ColorSwatch

A single color chip, with an optional transparency checkerboard. Static
`role="img"` by default; supplying `pressed` or `onPressedChange` turns it into
a toggle button.

```svelte
<ColorSwatch value="oklch(70% 0.15 200)" alpha />
```

**Props:** `value`, `checkerSize`, `alpha`, `disabled`, `toggle`,
`pressed` (bindable), `onPressedChange`

### ColorSwatchGroup

Single or multiple selection over a palette of swatches, with roving focus.

```svelte
<ColorSwatchGroupRoot type="multiple" bind:value={selected}>
  {#each ["red", "green", "blue"] as c (c)}
    <ColorSwatch value={c} />
  {/each}
</ColorSwatchGroupRoot>
```

**Props:** `type` (`"single" | "multiple"`), `value` (bindable), `defaultValue`,
`orientation`, `dir`, `loopFocus`, `disabled`, `onValueChange`, `child`

### ColorRing

Single-channel selection along a circular arc.

**Props:** `value` (bindable), `defaultValue`, `colorSpace`, `channel`,
`startAngle`, `innerRadius`, `disabled`, `onValueChange`, `onValueCommit`, `child`

**Parts:** `ColorRingRoot`, `ColorRingTrack`, `ColorRingGradient`, `ColorRingThumb`

### ColorWheel

Two channels mapped to angle and radius.

**Props:** `value` (bindable), `defaultValue`, `colorSpace`, `angleChannel`,
`radiusChannel`, `startAngle`, `disabled`, `onValueChange`, `onValueCommit`, `child`

**Parts:** `ColorWheelRoot`, `ColorWheelGradient`, `ColorWheelThumb`

### ColorTriangle

Two- or three-channel selection in barycentric coordinates. Supplying
`zChannel` switches the triangle to a three-channel simplex (Maxwell triangle).

**Props:** `value` (bindable), `defaultValue`, `colorSpace`, `xChannel`,
`yChannel`, `zChannel`, `rotation`, `inverted`, `thumbAlignment`, `disabled`,
`onValueChange`, `onValueCommit`, `child`

**Parts:** `ColorTriangleRoot`, `ColorTriangleGradient`, `ColorTriangleThumb`

## Callbacks

| Callback | Fires |
|----------|-------|
| `onValueChange(color)` | On every change, including mid-drag and mid-typing |
| `onValueCommit(color)` | Once, when a change-producing interaction ends |

Both receive a `Color` from `@urcolor/core`. `bind:value` covers the common
case; the callbacks are for reacting to *when* a change happened, not just what
it became.

## Hooks

`useColor(input)` holds a `Color` in rune state and exposes hex and alpha
alongside it. `useColorSpace(input, space)` is the generic per-space form; each
space also has a named shorthand — `useRGB`, `useHSL`, `useHSV`, `useHWB`,
`useOKLCh`, `useOKLab`, `useLCh`, `useLab`, `useP3`, `useA98`, `useProPhoto`,
`useRec2020`.

## Building custom parts

Each component exports its context (`colorAreaContext`, `colorSliderContext`, …)
alongside `createContextPair` and `gradientAttachment`, so a custom part can
read the same state the built-in parts do.

## Documentation

- [Components](https://urcolor.vercel.app/components/)
- [Guide](https://urcolor.vercel.app/guide/)

## License

MIT
