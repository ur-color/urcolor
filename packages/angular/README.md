# @urcolor/angular

Headless, accessible color picker directives for Angular. Standalone, signal-based,
unstyled — bring your own styles.

```sh
bun add @urcolor/angular     # or: npm i @urcolor/angular
```

Requires Angular `^21.2`. Pulls in [`@urcolor/core`](../core) (the color engine)
and [`@urcolor/shared`](../shared) (rendering and interaction) automatically.

## Features

- **Attribute directives, not components** — every part attaches to an element you
  own, so there is no wrapper markup and no shadow styling to fight
- **Signals throughout** — `value` is a `model()`, so `[(value)]` works everywhere
- **12 color spaces** — HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, sRGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020, all with alpha
- **WebGL gradients** — GPU canvas backgrounds via `@urcolor/shared`, with a CPU sampler fallback
- **Accessible** — keyboard navigation, ARIA wiring, roving focus

## Importing

Each component ships a `*_DIRECTIVES` array so a standalone component imports
all its parts in one entry:

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "app-picker",
  imports: [COLOR_AREA_DIRECTIVES],
  template: `
    <div urcColorAreaRoot [(value)]="color" colorSpace="hsl" xChannel="s" yChannel="l">
      <canvas urcColorAreaGradient></canvas>
      <div urcColorAreaThumb></div>
    </div>
  `,
})
export class Picker {
  readonly color = signal(Color.parse("hsl(200, 100%, 50%)")!);
}
```

Individual directives are exported too, if you prefer naming only what you use.

## `disabled`, `dir` and `readonly` are DOM attributes

They are not Angular inputs. Set them on the host element as ordinary
attributes; each root reads the static attribute at construction (so it works
under SSR, where there is no DOM) and a `MutationObserver` keeps them live
afterwards.

```html
<div urcColorAreaRoot disabled dir="rtl" [(value)]="color"></div>
```

Each root exposes the resolved state as readonly signals — `isDisabled`, `dir`,
`isReadOnly`, `dragging` — for templates that need to react to it.

## Components

### ColorArea — `COLOR_AREA_DIRECTIVES`

Two-dimensional selection across any pair of channels.

**Selectors:** `[urcColorAreaRoot]`, `canvas[urcColorAreaGradient]`, `[urcColorAreaThumb]`

**Inputs:** `value` (model), `colorSpace`, `xChannel`, `yChannel`, `xInverted`,
`yInverted`, `thumbAlignment` (`"contain" | "overflow"`) · **Outputs:** `valueChange`, `valueCommit`

### ColorSlider — `COLOR_SLIDER_DIRECTIVES`

Single-channel slider.

```html
<div urcColorSliderRoot [(value)]="color" colorSpace="hsl" channel="h">
  <div urcColorSliderControl>
    <div urcColorSliderTrack>
      <canvas urcColorSliderGradient></canvas>
      <div urcColorSliderThumb></div>
    </div>
  </div>
</div>
```

`urcColorSliderControl` is the interaction surface — it carries the pointer and
keyboard handlers and is the box pointer coordinates are measured against.

**Selectors:** `[urcColorSliderRoot]`, `[urcColorSliderControl]`,
`[urcColorSliderTrack]`, `[urcColorSliderRange]`, `[urcColorSliderThumb]`,
`canvas[urcColorSliderGradient]`

**Inputs:** `value` (model), `colorSpace`, `channel`, `orientation`
(`"horizontal" | "vertical"`), `inverted` · **Outputs:** `valueChange`, `valueCommit`

### ColorField — `COLOR_FIELD_DIRECTIVES`

Text input for one channel, with steppers.

```html
<div urcColorFieldRoot [(value)]="color" colorSpace="hsl" channel="h">
  <button urcColorFieldDecrement>−</button>
  <input urcColorFieldInput />
  <button urcColorFieldIncrement>+</button>
</div>
```

**Selectors:** `[urcColorFieldRoot]`, `input[urcColorFieldInput]`,
`button[urcColorFieldIncrement]`, `button[urcColorFieldDecrement]`,
`[urcColorFieldSwatch]`

**Inputs:** `value` (model), `colorSpace`, `channel`,
`format` (`"number" | "degree" | "percentage" | "hex"`), `min`, `max`, `step` ·
**Outputs:** `valueChange`, `valueCommit`

**Keyboard:** Arrow Up/Down steps, Page Up/Down steps by 10×, Home/End jump to min/max.

### ColorSwatch — `COLOR_SWATCH_DIRECTIVES`

A single color chip, with an optional transparency checkerboard. Static by
default; supplying `toggle` or binding `pressed` turns it into a toggle button.

```html
<div urcColorSwatch value="oklch(70% 0.15 200)" alpha></div>
```

**Selector:** `[urcColorSwatch]` · **Inputs:** `value`, `checkerSize`, `alpha`,
`toggle`, `pressed` (model)

### ColorSwatchGroup — `COLOR_SWATCH_GROUP_DIRECTIVES`

Single or multiple selection over a palette of swatches, with roving focus.

**Selector:** `[urcColorSwatchGroupRoot]` · **Inputs:** `value` (model, `string[]`),
`type` (`"single" | "multiple"`), `orientation`, `loopFocus`

### ColorRing — `COLOR_RING_DIRECTIVES`

Single-channel selection along a circular arc.

**Selectors:** `[urcColorRingRoot]`, `[urcColorRingTrack]`,
`canvas[urcColorRingGradient]`, `[urcColorRingThumb]`

**Inputs:** `value` (model), `colorSpace`, `channel`, `startAngle`, `innerRadius` ·
**Outputs:** `valueChange`, `valueCommit`

### ColorWheel — `COLOR_WHEEL_DIRECTIVES`

Two channels mapped to angle and radius.

**Selectors:** `[urcColorWheelRoot]`, `canvas[urcColorWheelGradient]`, `[urcColorWheelThumb]`

**Inputs:** `value` (model), `colorSpace`, `angleChannel`, `radiusChannel`,
`startAngle` · **Outputs:** `valueChange`, `valueCommit`

### ColorTriangle — `COLOR_TRIANGLE_DIRECTIVES`

Two- or three-channel selection in barycentric coordinates. Supplying
`zChannel` switches the triangle to a three-channel simplex (Maxwell triangle).

**Selectors:** `[urcColorTriangleRoot]`, `canvas[urcColorTriangleGradient]`,
`[urcColorTriangleThumb]`

**Inputs:** `value` (model), `colorSpace` (defaults to `"hsv"`), `xChannel`,
`yChannel`, `zChannel`, `rotation`, `inverted`, `thumbAlignment` ·
**Outputs:** `valueChange`, `valueCommit`

## Value changes

`[(value)]` covers the common case. Where you need to distinguish an in-flight
drag from a settled one:

| Output | Fires |
|--------|-------|
| `valueChange` | On every change, including mid-drag and mid-typing (this is what `[(value)]` binds to) |
| `valueCommit` | Once, when a change-producing interaction ends |

Both emit a `Color` from `@urcolor/core`.

## Signal stores

For color state outside the components, `createColorStore(input)` holds a
`Color` in signals and exposes hex and alpha alongside it.
`createColorSpaceStore(input, space)` is the generic per-space form, with a
named factory per space: `createRgbStore`, `createHslStore`, `createHsvStore`,
`createHwbStore`, `createOklchStore`, `createOklabStore`, `createLchStore`,
`createLabStore`, `createP3Store`, `createA98Store`, `createProPhotoStore`,
`createRec2020Store`.

## Documentation

- [Components](https://urcolor.vercel.app/components/)
- [Guide](https://urcolor.vercel.app/guide/)

## License

MIT
