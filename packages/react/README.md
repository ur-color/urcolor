# @urcolor/react

Headless, accessible color picker components for React 18 and 19. Unstyled
primitives — bring your own styles.

```sh
bun add @urcolor/react     # or: npm i @urcolor/react
```

Pulls in [`@urcolor/core`](../core) (the color engine) and
[`@urcolor/shared`](../shared) (rendering and interaction) automatically.

> **API divergence.** `@urcolor/vue` 2.0.0 renamed props and split
> `ColorAreaRoot`'s interaction surface into a `ColorAreaArea`; this package
> keeps the earlier shape. Component and prop names below are authoritative for
> React and differ from the Vue docs in places — the divergence is tracked in
> [`CHANGELOG.md`](./CHANGELOG.md).

## Features

- **Headless** — Radix/Base UI-style unstyled primitives, full styling freedom
- **12 color spaces** — HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, sRGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020, all with alpha
- **Controlled or uncontrolled** — `value` + `onValueChange`, or `defaultValue`
- **WebGL gradients** — GPU canvas backgrounds via `@urcolor/shared`, with a CPU sampler fallback
- **Accessible** — keyboard navigation, ARIA wiring, roving focus

## Two import styles

Every component is exported both flat and namespaced. They are the same
components:

```tsx
import { ColorAreaRoot, ColorAreaGradient, ColorAreaThumb } from "@urcolor/react";
import { ColorArea } from "@urcolor/react";   // ColorArea.Root, .Gradient, .Thumb
```

## Components

### ColorArea

Two-dimensional selection across any pair of channels.

```tsx
import { useState } from "react";
import { Color } from "@urcolor/core";
import { ColorAreaRoot, ColorAreaGradient, ColorAreaThumb } from "@urcolor/react";

function Picker() {
  const [color, setColor] = useState(() => Color.parse("hsl(200, 100%, 50%)")!);

  return (
    <ColorAreaRoot value={color} onValueChange={setColor} colorSpace="hsl" xChannel="s" yChannel="l">
      <ColorAreaGradient />
      <ColorAreaThumb />
    </ColorAreaRoot>
  );
}
```

**Props:** `value`, `defaultValue`, `colorSpace`, `xChannel`, `yChannel`,
`xInverted`, `yInverted`, `thumbAlignment` (`"contain" | "overflow"`),
`disabled`, `dir`, `onValueChange`, `onValueCommit`

**Parts:** `ColorAreaRoot`, `ColorAreaGradient`, `ColorAreaThumb`,
`ColorAreaCheckerboard` _(deprecated — the Gradient paints the checkerboard itself)_

### ColorSlider

Single-channel slider.

```tsx
<ColorSliderRoot value={color} onValueChange={setColor} colorSpace="hsl" channel="h">
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

**Props:** `value`, `defaultValue`, `colorSpace`, `channel`,
`orientation` (`"horizontal" | "vertical"`), `inverted`, `disabled`, `dir`,
`onValueChange`, `onValueCommit`

**Parts:** `ColorSliderRoot`, `ColorSliderControl`, `ColorSliderTrack`,
`ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient`,
`ColorSliderCheckerboard` _(deprecated)_

### ColorField

Text input for one channel, with steppers.

```tsx
<ColorFieldRoot value={color} onValueChange={setColor} colorSpace="hsl" channel="h">
  <ColorFieldDecrement>−</ColorFieldDecrement>
  <ColorFieldInput />
  <ColorFieldIncrement>+</ColorFieldIncrement>
</ColorFieldRoot>
```

**Props:** `value`, `defaultValue`, `colorSpace`, `channel`,
`format` (`"number" | "degree" | "percentage" | "hex"`), `min`, `max`, `step`,
`disabled`, `readOnly`, `onValueChange`, `onValueCommit`, `as`

**Keyboard:** Arrow Up/Down steps, Page Up/Down steps by 10×, Home/End jump to min/max.

**Parts:** `ColorFieldRoot`, `ColorFieldInput`, `ColorFieldIncrement`,
`ColorFieldDecrement`, `ColorFieldSwatch`

### ColorSwatch

A single color chip, with an optional transparency checkerboard. Standalone, or
selectable inside a `ColorSwatchGroup`.

```tsx
<ColorSwatch value="oklch(70% 0.15 200)" alpha />
```

**Props:** `value`, `checkerSize`, `alpha`, `disabled`, `as`, plus any `div` prop

### ColorSwatchGroup

Single or multiple selection over a palette of swatches, with roving focus.

```tsx
<ColorSwatchGroupRoot type="multiple" value={selected} onValueChange={setSelected}>
  {["red", "green", "blue"].map((c) => (
    <ColorSwatch key={c} value={c} />
  ))}
</ColorSwatchGroupRoot>
```

**Props:** `type` (`"single" | "multiple"`), `value`, `defaultValue`,
`orientation`, `loopFocus`, `disabled`, `onValueChange`

### ColorRing

Single-channel selection along a circular arc.

**Props:** `value`, `defaultValue`, `colorSpace`, `channel`, `startAngle`,
`innerRadius`, `disabled`, `onValueChange`, `onValueCommit`

**Parts:** `ColorRingRoot`, `ColorRingTrack`, `ColorRingGradient`,
`ColorRingThumb`, `ColorRingCheckerboard` _(deprecated)_

### ColorWheel

Two channels mapped to angle and radius.

**Props:** `value`, `defaultValue`, `colorSpace`, `channelAngle`,
`channelRadius`, `startAngle`, `disabled`, `onValueChange`, `onValueCommit`

**Parts:** `ColorWheelRoot`, `ColorWheelGradient`, `ColorWheelThumb`,
`ColorWheelCheckerboard` _(deprecated)_

### ColorTriangle

Two- or three-channel selection in barycentric coordinates. Set `zChannel` for
the three-channel (Maxwell triangle) mode.

**Props:** `value`, `defaultValue`, `colorSpace`, `xChannel`, `yChannel`,
`zChannel`, `rotation`, `inverted`, `thumbAlignment`, `disabled`,
`onValueChange`, `onValueCommit`

**Parts:** `ColorTriangleRoot`, `ColorTriangleGradient`, `ColorTriangleThumb`,
`ColorTriangleCheckerboard` _(deprecated)_

## Events

| Callback | Fires |
|----------|-------|
| `onValueChange(color)` | On every change, including mid-drag and mid-typing |
| `onValueCommit(color)` | Once, when a change-producing interaction ends |

Both receive a `Color` from `@urcolor/core`.

## Hooks

`useColor(input)` holds a `Color` in state and exposes hex and alpha alongside it:

```tsx
const { color, setColor, hex, setHex, alpha, setAlpha } = useColor("#3b82f6");
```

`useColorSpace(input, space)` is the generic per-space form; each space also has
a named shorthand — `useRGB`, `useHSL`, `useHSV`, `useHWB`, `useOKLCh`,
`useOKLab`, `useLCh`, `useLab`, `useP3`, `useA98`, `useProPhoto`, `useRec2020`.

Each part also exposes its context hook (`useColorAreaContext`,
`useColorSliderContext`, …) for building custom parts.

## Documentation

- [Components](https://urcolor.vercel.app/components/)
- [Guide](https://urcolor.vercel.app/guide/)

## License

MIT
