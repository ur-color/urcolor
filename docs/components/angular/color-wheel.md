# ColorWheel

A circular 2D area component for adjusting two color channels mapped to angle and radius.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element. `COLOR_WHEEL_DIRECTIVES` brings the whole family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-wheel",
  imports: [...COLOR_WHEEL_DIRECTIVES],
  template: `
    <div
      urcColorWheelRoot
      [(value)]="color"
      colorSpace="hsl"
      class="relative block size-64 rounded-full"
      style="container-type: inline-size"
    >
      <canvas urcColorWheelGradient class="absolute inset-0 block"></canvas>
      <div urcColorWheelThumb class="size-4 rounded-full border-2 border-white"></div>
    </div>
  `,
})
export class MyWheel {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

## Anatomy

```html
<div urcColorWheelRoot>
  <canvas urcColorWheelGradient></canvas>
  <div urcColorWheelThumb></div>
</div>
```

The gradient's selector is `canvas[urcColorWheelGradient]`, so it must sit on a `<canvas>` element. The root and thumb selectors are element-agnostic.

## Examples

### HSL / Hue x Saturation

HSL color wheel with Hue mapped to angle and Saturation to radius. Both channels are the color space's defaults, so they can be omitted.

```html
<div
  urcColorWheelRoot
  [(value)]="color"
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="s"
  class="relative block size-64 rounded-full"
  style="container-type: inline-size"
>
  <canvas urcColorWheelGradient class="absolute inset-0 block"></canvas>
  <div urcColorWheelThumb class="size-4 rounded-full border-2 border-white"></div>
</div>
```

### OKLCh / Hue x Chroma

OKLCh color wheel with Hue mapped to angle and Chroma to radius.

```html
<div
  urcColorWheelRoot
  [(value)]="color"
  colorSpace="oklch"
  angleChannel="h"
  radiusChannel="c"
  class="relative block size-64 rounded-full"
  style="container-type: inline-size"
>
  <canvas urcColorWheelGradient class="absolute inset-0 block"></canvas>
  <div urcColorWheelThumb class="size-4 rounded-full border-2 border-white"></div>
</div>
```

### Start angle offset

`startAngle` rotates the angle axis. `0` puts its origin at 12 o'clock. It is a `numberAttribute` input, so the static form works too.

```html
<div urcColorWheelRoot [(value)]="color" startAngle="90">
  <canvas urcColorWheelGradient></canvas>
  <div urcColorWheelThumb></div>
</div>
```

### Commit and disabled

`disabled` is the **native attribute**, not an input — set it on the element and the root picks it up. `(valueCommit)` fires once at the end of an interaction, never mid-drag.

```html
<div urcColorWheelRoot [(value)]="color" (valueCommit)="onCommit($event)" disabled>
  <canvas urcColorWheelGradient></canvas>
  <div urcColorWheelThumb></div>
</div>
```

### Template reference

Every directive sets `exportAs`, so the root's state is readable from the template.

```html
<div urcColorWheelRoot #wheel="urcColorWheelRoot" [(value)]="color">
  <canvas urcColorWheelGradient></canvas>
  <div urcColorWheelThumb></div>
</div>

<p>{{ wheel.angleChannelKey() }}: {{ wheel.angleValue() }}</p>
```

### Signal Forms

`ColorWheelRoot` implements `FormValueControl<Color>`, so it binds straight to a signal form field.

```html
<div urcColorWheelRoot [field]="form.brandColor">
  <canvas urcColorWheelGradient></canvas>
  <div urcColorWheelThumb></div>
</div>
```

## API Reference

`COLOR_WHEEL_DIRECTIVES` is the array of every part below. `COLOR_WHEEL_DEFAULT_COLOR` is the `Color` a root falls back to when `[(value)]` is never bound.

### ColorWheelRoot

The root of the wheel. Owns the color, the pointer and keyboard interaction, and every piece of state the other parts read through `inject(ColorWheelRoot)`.

- Selector: `[urcColorWheelRoot]`
- Export as: `urcColorWheelRoot`
- Implements: `FormValueControl<Color>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<Color>` | `hsl(0, 100%, 50%)` | The color, two-way bindable as `[(value)]`. Also the Signal Forms contract. |
| `colorSpace` | `input<SpaceId>` | `'hsl'` | The color space the wheel operates in. |
| `angleChannel` | `input<string \| undefined>` | Auto | Channel driven by the angular axis. Defaults to the color space's first channel. |
| `radiusChannel` | `input<string \| undefined>` | Auto | Channel driven by the radial axis. Defaults to the color space's second channel. |
| `startAngle` | `input<number>` | `0` | Degrees of rotation for the angular axis. `0` puts its origin at 12 o'clock. Coerced with `numberAttribute`. |
| `valueCommit` | `output<Color>` | — | Emitted once at the end of an interaction, never mid-drag. |

::: warning `disabled` is not an input
`disabled` is the native DOM attribute. The static attribute is read at construction — which works under SSR — and a `MutationObserver` keeps it live afterwards. The readable signal is named **`isDisabled`**, not `disabled`, because `FormUiControl` reserves the member name `disabled` for its own `InputSignal<boolean>`.
:::

Readable signals, for `exportAs` template references and for `inject(ColorWheelRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `dragging` | `Signal<boolean>` | True while a pointer drag is in flight. |
| `angleChannelKey` | `Signal<string>` | The resolved angular channel, after the space's default is applied. |
| `radiusChannelKey` | `Signal<string>` | The resolved radial channel, after the space's default is applied. |
| `angleValue` / `radiusValue` | `Signal<number>` | The two channels in display units. |
| `angleMin` / `angleMax` | `Signal<number>` | Bounds of the angular axis, in display units. |
| `radiusMin` / `radiusMax` | `Signal<number>` | Bounds of the radial axis, in display units. |

::: tip
`angleChannel` and `radiusChannel` are the Angular, Vue and Svelte spelling. React names the same two props `channelAngle` and `channelRadius`.
:::

### ColorWheelGradient

Paints the wheel's color disc onto a `<canvas>` you supply. The transparency checkerboard is this element's CSS background, which the canvas bitmap composites over — there is no `Checkerboard` part in this package.

- Selector: `canvas[urcColorWheelGradient]`
- Export as: `urcColorWheelGradient`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `input<ColorWheelChannelOverrides>` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Pass `false` for no overrides at all. |

`ColorWheelChannelOverrides` is `Record<string, number> | false`.

### ColorWheelThumb

The single combined handle, and the wheel's only focusable element. One thumb drives **both** axes: it sets `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned in polar coordinates from the angle and radius channel values.

Because one handle serves two channels, it announces both — `aria-label` names the channel pair and `aria-valuetext` carries both formatted values. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

- Selector: `[urcColorWheelThumb]`
- Export as: `urcColorWheelThumb`

The directive takes no inputs. A static `aria-label` on the host element is read at construction and wins over the generated channel-pair label.

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
| `role="slider"` | Applied to `urcColorWheelThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the angle and radius channel labels, e.g. `"Hue, Saturation"`. Set your own `aria-label` on the thumb element to override. |
| `aria-valuemin` / `aria-valuemax` | The angle channel's range. |
| `aria-valuenow` | The current angle channel value. Only one number can be carried here, so the angle axis owns it. |
| `aria-valuetext` | Both channels formatted, e.g. `"Hue 210°, Saturation 80%"`. |
| `aria-disabled` | Applied to the root and the thumb when the native `disabled` attribute is set. |

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

When the angle channel is cyclic (a `degree`-formatted channel such as hue), stepping past the end wraps around instead of clamping. `(valueCommit)` fires once on key release, not on every repeat.
