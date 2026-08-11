# ColorRing

An annular component whose angle maps to a single color channel.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element. `COLOR_RING_DIRECTIVES` brings the whole family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_RING_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-ring",
  imports: [...COLOR_RING_DIRECTIVES],
  template: `
    <div
      urcColorRingRoot
      [(value)]="color"
      colorSpace="hsl"
      channel="h"
      innerRadius="0.85"
      class="relative block size-64"
      style="container-type: inline-size"
    >
      <div urcColorRingTrack class="relative block size-full">
        <canvas urcColorRingGradient class="absolute inset-0 block"></canvas>
        <div urcColorRingThumb class="size-4 rounded-full border-2 border-white"></div>
      </div>
    </div>
  `,
})
export class MyRing {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

The root must declare `container-type: inline-size` (or `size`): the thumb orbits in `cqmin` units, so it tracks the ring's size without measuring it.

## Anatomy

```html
<div urcColorRingRoot>
  <div urcColorRingTrack>
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb></div>
  </div>
</div>
```

The gradient's selector is `canvas[urcColorRingGradient]`, so it must sit on a `<canvas>` element. The root, track and thumb selectors are element-agnostic.

## Examples

### Hue

A hue ring cycling through the spectrum. `h` is the HSL space's first channel, so `channel` could be omitted here.

```html
<div
  urcColorRingRoot
  [(value)]="color"
  colorSpace="hsl"
  channel="h"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <div urcColorRingTrack class="relative block size-full">
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb class="size-4 rounded-full border-2 border-white"></div>
  </div>
</div>
```

### Saturation

The same ring driving saturation instead. The channel's range and step come from the color space's channel config, so the ring wraps for hue and clamps here.

```html
<div
  urcColorRingRoot
  [(value)]="color"
  colorSpace="hsl"
  channel="s"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <div urcColorRingTrack class="relative block size-full">
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb class="size-4 rounded-full border-2 border-white"></div>
  </div>
</div>
```

### Ring thickness and start angle

`innerRadius` is the hole's radius as a ratio of the outer radius; it drives both hit testing and the thumb's orbit. `startAngle` is the number of degrees clockwise from 12 o'clock at which the channel's minimum sits. Both are `numberAttribute` inputs, so the static string form works.

```html
<div urcColorRingRoot [(value)]="color" innerRadius="0.85" startAngle="90">
  <div urcColorRingTrack>
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb></div>
  </div>
</div>
```

### Alpha in the gradient

`channelOverrides` defaults to `{ alpha: 1 }`, which paints the ramp fully opaque. Bind `false` to let the current color's alpha through — the checkerboard the gradient already paints is what makes it readable.

```html
<div urcColorRingRoot [(value)]="color">
  <div urcColorRingTrack>
    <canvas urcColorRingGradient [channelOverrides]="false"></canvas>
    <div urcColorRingThumb></div>
  </div>
</div>
```

### Commit and disabled

`disabled` is the **native attribute**, not an input — set it on the element and the root picks it up. `(valueCommit)` fires once at the end of an interaction, never mid-drag.

```html
<div urcColorRingRoot [(value)]="color" (valueCommit)="onCommit($event)" disabled>
  <div urcColorRingTrack>
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb></div>
  </div>
</div>
```

### Template reference

Every directive sets `exportAs`, so the root's state is readable from the template.

```html
<div urcColorRingRoot #ring="urcColorRingRoot" [(value)]="color">
  <div urcColorRingTrack>
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb></div>
  </div>
</div>

<p>{{ ring.channelKey() }}: {{ ring.displayValue() }}</p>
```

### Signal Forms

`ColorRingRoot` implements `FormValueControl<Color>`, so it binds straight to a signal form field.

```html
<div urcColorRingRoot [field]="form.brandColor">
  <div urcColorRingTrack>
    <canvas urcColorRingGradient></canvas>
    <div urcColorRingThumb></div>
  </div>
</div>
```

## API Reference

`COLOR_RING_DIRECTIVES` is the array of every part below. `COLOR_RING_DEFAULT_COLOR` is the `Color` a root falls back to when `[(value)]` is never bound.

### ColorRingRoot

The root of the ring. Owns the color, the pointer and keyboard interaction, and every piece of state the other parts read through `inject(ColorRingRoot)`.

- Selector: `[urcColorRingRoot]`
- Export as: `urcColorRingRoot`
- Implements: `FormValueControl<Color>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<Color>` | `COLOR_RING_DEFAULT_COLOR` (`hsl(0, 100%, 50%)`) | The color, two-way bindable as `[(value)]`. Also the Signal Forms contract. |
| `colorSpace` | `input<SpaceId>` | `'hsl'` | The color space the ring operates in. |
| `channel` | `input<string \| undefined>` | Auto | The channel the angle maps to. Defaults to the color space's first channel. |
| `startAngle` | `input<number>` | `0` | Degrees clockwise from 12 o'clock at which the channel's minimum sits. Coerced with `numberAttribute`. |
| `innerRadius` | `input<number>` | `0.7` | Hole radius as a ratio of the outer radius (0–1). Drives hit testing and the thumb's orbit. Coerced with `numberAttribute`. |
| `valueCommit` | `output<Color>` | — | Emitted once at the end of an interaction, never mid-drag. |

::: warning `disabled` is not an input
`disabled` is the native DOM attribute. The static attribute is read at construction — which works under SSR — and a `MutationObserver` keeps it live afterwards. The readable signal is named **`isDisabled`**, not `disabled`, because `FormUiControl` reserves the member name `disabled` for its own `InputSignal<boolean>`.
:::

Readable signals, for `exportAs` template references and for `inject(ColorRingRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `dragging` | `Signal<boolean>` | True while a pointer drag is in flight. |
| `channelKey` | `Signal<string>` | The resolved channel, after the space's default is applied. |
| `displayValue` | `Signal<number>` | The channel in display units. |
| `channelMin` / `channelMax` | `Signal<number>` | The channel's display-space bounds. A full turn defaults to `0`–`360`. |
| `channelStep` | `Signal<number>` | The channel's display-space increment. |

::: warning The bounds are not named `min` / `max`
They are `channelMin`, `channelMax` and `channelStep` because `FormUiControl` reserves `min` and `max` for its own `InputSignal<number | undefined>` validation inputs.
:::

::: tip
`channel`, `startAngle` and `innerRadius` are spelled identically in React, Vue, Svelte and Angular. Unlike `ColorWheel`, `ColorRing` has no per-framework prop-name divergence.
:::

Pointer input is only accepted inside the annulus — a press in the hole at the centre, or outside the outer edge, is ignored. The hole's size follows `innerRadius`.

### ColorRingTrack

The annulus the thumb travels around. Sizing and positioning are yours; this part only publishes the state attributes the gradient and thumb are styled against.

- Selector: `[urcColorRingTrack]`
- Export as: `urcColorRingTrack`

The directive takes no inputs.

### ColorRingGradient

Paints the ring's conic color ramp onto a `<canvas>` you supply, sampled from the root's color space and channel. The directive sets its own `position`, `inset`, `width`, `height` and `pointer-events`, so the canvas fills the track without extra styling. The transparency checkerboard is this canvas's CSS background, masked to the annulus together with the bitmap — one rasterisation cuts both the hole and the corners, and there is no `Checkerboard` part in this package.

- Selector: `canvas[urcColorRingGradient]`
- Export as: `urcColorRingGradient`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `input<ColorRingChannelOverrides>` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Pass `false` for no overrides at all. |

`ColorRingChannelOverrides` is `Record<string, number> | false`.

### ColorRingThumb

The handle, and the ring's only focusable element. It sets `role="slider"`, takes `tabindex="0"` unless the root is disabled, and orbits in `cqmin` units at the middle of the annulus, rotated to the channel's current position.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here. There is no `aria-orientation` — a ring is neither horizontal nor vertical.

- Selector: `[urcColorRingThumb]`
- Export as: `urcColorRingThumb`

The directive takes no inputs. A static `aria-label` on the host element is read at construction and wins over the generated channel label.

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
| `role="slider"` | Applied to `urcColorRingThumb`. |
| `aria-label` | Defaults to the channel's label, e.g. `"Hue"`. Set your own `aria-label` on the thumb element to override. |
| `aria-valuemin` / `aria-valuemax` | The channel's display-space range. |
| `aria-valuenow` | The channel's current value, in display units. |
| `aria-valuetext` | The value formatted with its unit, e.g. `"210°"` or `"80%"`. |
| `aria-disabled` | Applied to the root and the thumb when the native `disabled` attribute is set. The thumb also drops its `tabindex`. |

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

Both arrow axes drive the same angular value, so only the sign matters. When the channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping. `(valueCommit)` fires once on key release, not on every repeat.
