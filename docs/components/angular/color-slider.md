# ColorSlider

A 1D slider component for adjusting a single color channel, with a gradient track that reflects the current color.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element. `COLOR_SLIDER_DIRECTIVES` brings the whole family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_SLIDER_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-slider",
  imports: [...COLOR_SLIDER_DIRECTIVES],
  template: `
    <div urcColorSliderRoot [(value)]="color" colorSpace="hsl" channel="h" class="w-full">
      <div urcColorSliderTrack class="relative h-5 overflow-hidden rounded-xl">
        <canvas urcColorSliderGradient class="absolute inset-0 rounded-xl"></canvas>
        <div
          urcColorSliderThumb
          class="block size-5 rounded-full border-[2.5px] border-white bg-white"
          aria-label="Hue"
        ></div>
      </div>
    </div>
  `,
})
export class MySlider {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

## Anatomy

```html
<div urcColorSliderRoot>
  <div urcColorSliderControl>
    <div urcColorSliderTrack>
      <canvas urcColorSliderGradient></canvas>
      <div urcColorSliderRange></div>
      <div urcColorSliderThumb></div>
    </div>
  </div>
</div>
```

The gradient's selector is `canvas[urcColorSliderGradient]`, so it must sit on a `<canvas>` element. Every other selector is element-agnostic. `urcColorSliderControl` and `urcColorSliderRange` are optional: the root owns all interaction, so the control is only a styling hook, and the range is only needed when you want a filled portion of the track.

## Examples

### Hue

An explicit stop list reads better than the derived one for hue, because it wraps back to red.

```html
<div urcColorSliderRoot [(value)]="color" colorSpace="hsl" channel="h" class="w-full">
  <div urcColorSliderTrack class="relative h-5 overflow-hidden rounded-xl">
    <canvas
      urcColorSliderGradient
      class="absolute inset-0 rounded-xl"
      [colors]="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
    ></canvas>
    <div urcColorSliderThumb class="block size-5 rounded-full border-2 border-white bg-white"></div>
  </div>
</div>
```

### Saturation

With `[colors]` omitted, the gradient samples the saturation axis from the current color.

```html
<div urcColorSliderRoot [(value)]="color" colorSpace="hsl" channel="s" class="w-full">
  <div urcColorSliderTrack class="relative h-5 overflow-hidden rounded-xl">
    <canvas urcColorSliderGradient class="absolute inset-0 rounded-xl"></canvas>
    <div urcColorSliderThumb class="block size-5 rounded-full border-2 border-white bg-white"></div>
  </div>
</div>
```

### Vertical

`orientation="vertical"` flips the axis. The gradient's default angle follows it, becoming `90` instead of `0`.

```html
<div urcColorSliderRoot [(value)]="color" channel="l" orientation="vertical" class="h-64">
  <div urcColorSliderTrack class="relative h-full w-5 overflow-hidden rounded-xl">
    <canvas urcColorSliderGradient class="absolute inset-0 rounded-xl"></canvas>
    <div urcColorSliderThumb class="block size-5 rounded-full border-2 border-white bg-white"></div>
  </div>
</div>
```

### Alpha channel

`channel="alpha"` turns the slider into an opacity control. The gradient runs from fully transparent to fully opaque, and the checkerboard behind it makes that visible.

```html
<div urcColorSliderRoot [(value)]="color" channel="alpha" class="w-full">
  <div urcColorSliderTrack class="relative h-5 overflow-hidden rounded-xl">
    <canvas urcColorSliderGradient class="absolute inset-0 rounded-xl"></canvas>
    <div urcColorSliderThumb class="block size-5 rounded-full border-2 border-white bg-white"></div>
  </div>
</div>
```

### Filled range

`urcColorSliderRange` sets its own absolute position and extent through host style bindings, so it only needs a color from you.

```html
<div urcColorSliderRoot [(value)]="color" channel="s" class="w-full">
  <div urcColorSliderTrack class="relative h-2 overflow-hidden rounded-full bg-neutral-200">
    <div urcColorSliderRange class="bg-neutral-900"></div>
    <div urcColorSliderThumb class="block size-4 rounded-full border-2 border-white bg-neutral-900"></div>
  </div>
</div>
```

### Commit and disabled

`disabled` is the **native attribute**, not an input — set it on the element and the root picks it up. `(valueCommit)` fires once at the end of an interaction, never mid-drag.

```html
<div urcColorSliderRoot [(value)]="color" (valueCommit)="onCommit($event)" disabled>
  <div urcColorSliderTrack>
    <canvas urcColorSliderGradient></canvas>
    <div urcColorSliderThumb></div>
  </div>
</div>
```

### Template reference

Every directive sets `exportAs`, so the root's state is readable from the template.

```html
<div urcColorSliderRoot #slider="urcColorSliderRoot" [(value)]="color" channel="h">
  <div urcColorSliderTrack>
    <canvas urcColorSliderGradient></canvas>
    <div urcColorSliderThumb></div>
  </div>
</div>

<p>{{ slider.channel() }}: {{ slider.sliderState().value }}</p>
```

### Signal Forms

`ColorSliderRoot` implements `FormValueControl<Color>`, so it binds straight to a signal form field.

```html
<div urcColorSliderRoot [field]="form.brandColor">
  <div urcColorSliderTrack>
    <canvas urcColorSliderGradient></canvas>
    <div urcColorSliderThumb></div>
  </div>
</div>
```

## API Reference

`COLOR_SLIDER_DIRECTIVES` is the array of every part below. `COLOR_SLIDER_DEFAULT_COLOR` is the `Color` a root falls back to when `[(value)]` is never bound — `hsl(210, 80%, 50%)`.

### ColorSliderRoot

The root of the slider. Owns the color, the pointer and keyboard interaction, and every piece of state the other parts read through `inject(ColorSliderRoot)`.

- Selector: `[urcColorSliderRoot]`
- Export as: `urcColorSliderRoot`
- Implements: `FormValueControl<Color>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<Color>` | `COLOR_SLIDER_DEFAULT_COLOR` | The color, two-way bindable as `[(value)]`. Also the Signal Forms contract. There is no separate `defaultValue`. |
| `colorSpace` | `input<SpaceId>` | `'hsl'` | The color space the slider operates in. |
| `channel` | `input<string>` | `'h'` | The channel this slider controls, or `'alpha'`. |
| `orientation` | `input<ColorSliderOrientation>` | `'horizontal'` | The axis the slider runs along. `ColorSliderOrientation` is `'horizontal' \| 'vertical'`. |
| `inverted` | `input<boolean>` | `false` | Runs the slider opposite to its natural direction. Coerced with `booleanAttribute`, so the bare attribute works. |
| `valueCommit` | `output<Color>` | — | Emitted once at the end of an interaction, never mid-drag. |

::: warning `disabled` is not an input
`disabled` is the native DOM attribute. The static attribute is read at construction — which works under SSR — and a `MutationObserver` keeps it live afterwards. The readable signal is named **`isDisabled`**, not `disabled`, because `FormUiControl` reserves the member name `disabled` for its own `InputSignal<boolean>`.

`dir` is handled the same way, and is not an input either. It is resolved with `getComputedStyle` rather than by reading the host attribute, so an inherited `<html dir="rtl">` counts.
:::

The stepping interval is not an input — it comes from the channel's own config, resolved from `colorSpace()` and `channel()`.

Readable signals, for `exportAs` template references and for `inject(ColorSliderRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `dir` | `Signal<'ltr' \| 'rtl'>` | The resolved reading direction. |
| `dragging` | `Signal<boolean>` | True while a pointer drag is in flight. |
| `sliderState` | `Signal<SliderState>` | The channel in display units — `value`, `min`, `max`, `step` — plus `orientation`, `dir`, `inverted` and `disabled`. |
| `position` | `Signal<number>` | 0–1 offset of the thumb from the track's CSS start edge. |

### ColorSliderControl

An optional wrapper between the root and the track. It carries no behaviour of its own and exists as a styling hook that mirrors the other packages' part list.

- Selector: `[urcColorSliderControl]`
- Export as: `urcColorSliderControl`

The directive takes no inputs.

### ColorSliderTrack

The rail the thumb travels along. Positioning is yours; this part only publishes the state attributes the thumb and range are styled against.

- Selector: `[urcColorSliderTrack]`
- Export as: `urcColorSliderTrack`

The directive takes no inputs.

### ColorSliderRange

The filled portion of the track, measured from the channel's minimum end. Every layout declaration is a host style binding, so a `style` attribute you write in the template still wins the cascade.

- Selector: `[urcColorSliderRange]`
- Export as: `urcColorSliderRange`

The directive takes no inputs.

### ColorSliderGradient

Paints the slider's color ramp onto a `<canvas>` you supply. The transparency checkerboard is this element's CSS background, which the canvas bitmap composites over — there is no `Checkerboard` part in this package.

- Selector: `canvas[urcColorSliderGradient]`
- Export as: `urcColorSliderGradient`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `input<string[] \| undefined>` | Auto | Explicit color stops. When omitted, 12 stops are derived from the channel and the current color. At least two valid stops are required, or nothing is painted. |
| `angle` | `input<number \| undefined>` | Auto | Rotation in degrees. Defaults to `90` when the slider is vertical, `0` otherwise. |
| `interpolationSpace` | `input<SpaceId \| undefined>` | — | Interpolates the stops in this space for perceptual accuracy (e.g. `'oklch'`). |
| `channelOverrides` | `input<ColorSliderChannelOverrides>` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Pass `false` for no overrides at all. |

`ColorSliderChannelOverrides` is `Record<string, number> | false`.

### ColorSliderThumb

The draggable handle, and the slider's only focusable element. It sets `role="slider"`, takes `tabindex="0"` unless the root is disabled, and positions itself along the track from the channel value.

The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

- Selector: `[urcColorSliderThumb]`
- Export as: `urcColorSliderThumb`

The directive takes no inputs. A static `aria-label` on the host element is read at construction and wins over the generated channel label.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-orientation` | Root, Control, Track, Range, Thumb | Always; the value is `horizontal` or `vertical`. |
| `data-disabled` | Root, Control, Track, Range, Thumb | The root is disabled. |
| `data-dragging` | Root, Thumb | A pointer drag is in flight. |

`ColorSliderGradient` carries no state attributes; style it from an ancestor's.

## Accessibility

ColorSlider exposes a single focusable thumb for the channel it controls. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `urcColorSliderThumb`. |
| `aria-label` | Defaults to the channel's label, e.g. `"Hue"` or `"Alpha"`. Set your own `aria-label` on the thumb element to override. |
| `aria-valuemin` / `aria-valuemax` | The channel's range in display units. |
| `aria-valuenow` | The current channel value in display units. |
| `aria-valuetext` | The value formatted with its unit, e.g. `"210°"`, `"80%"`. |
| `aria-orientation` | Reflects the root's `orientation`. |
| `aria-disabled` | Applied to the root and the thumb when the native `disabled` attribute is set; the thumb's `tabindex` is dropped at the same time. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Up | Increase by one step |
| Arrow Left / Arrow Down | Decrease by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase / decrease by 10 steps (unaffected by Shift) |
| Home | Move to the channel minimum |
| End | Move to the channel maximum |

Both arrow axes are live whatever the orientation — the axis only matters for 2D controls. `dir="rtl"` mirrors the horizontal arrows and `inverted` flips the direction on top of that, while Home and End address value bounds rather than visual ends, so neither modifier applies to them. `(valueCommit)` fires once on key release, not on every repeat.
