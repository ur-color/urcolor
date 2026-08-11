# ColorArea

A rectangular 2D area component for adjusting two color channels mapped to the horizontal and vertical axes.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element. `COLOR_AREA_DIRECTIVES` brings the whole family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      class="relative block h-[200px] w-full cursor-crosshair touch-none overflow-clip rounded-lg"
    >
      <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
      <div urcColorAreaThumb class="absolute size-5 rounded-full border-2 border-white"></div>
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

## Anatomy

```html
<div urcColorAreaRoot>
  <canvas urcColorAreaGradient></canvas>
  <div urcColorAreaThumb></div>
</div>
```

The gradient's selector is `canvas[urcColorAreaGradient]`, so it must sit on a `<canvas>` element. The root and thumb selectors are element-agnostic. The root is the interaction surface: pointer capture, the keyboard listener and the box that pointer coordinates are measured against all live on it, so the gradient and the thumb sit directly inside it.

## Examples

### HSL / Hue x Saturation

HSL color area with Hue on the horizontal axis and Saturation on the vertical axis. Both channels are the color space's defaults, so they can be omitted.

```html
<div
  urcColorAreaRoot
  [(value)]="color"
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
  class="relative block h-[200px] w-full touch-none overflow-clip rounded-lg"
>
  <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
  <div urcColorAreaThumb class="absolute size-5 rounded-full border-2 border-white"></div>
</div>
```

### OKLCh / Chroma x Lightness

OKLCh color area with Chroma on the horizontal axis and Lightness on the vertical axis.

```html
<div
  urcColorAreaRoot
  [(value)]="color"
  colorSpace="oklch"
  xChannel="c"
  yChannel="l"
  class="relative block h-[200px] w-full touch-none overflow-clip rounded-lg"
>
  <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
  <div urcColorAreaThumb class="absolute size-5 rounded-full border-2 border-white"></div>
</div>
```

### Alpha on an axis

Map `yChannel` to `"alpha"` to make the vertical axis drive opacity. The canvas is painted with real transparency and composites over its own checkerboard background.

```html
<div urcColorAreaRoot [(value)]="color" colorSpace="hsl" xChannel="h" yChannel="alpha">
  <canvas urcColorAreaGradient></canvas>
  <div urcColorAreaThumb></div>
</div>
```

### Explicit corner colors

Supplying any of `topLeft`, `topRight`, `bottomLeft` or `bottomRight` switches the gradient to corner mode and ignores the channel sampling. Adding `interpolationSpace` swaps the WebGL path for a CPU one that interpolates perceptually in that space.

```html
<div urcColorAreaRoot [(value)]="color">
  <canvas
    urcColorAreaGradient
    topLeft="white"
    topRight="oklch(0.7 0.2 30)"
    bottomLeft="black"
    bottomRight="black"
    interpolationSpace="oklch"
  ></canvas>
  <div urcColorAreaThumb></div>
</div>
```

### Commit, disabled and direction

`disabled` and `dir` are **native attributes**, not inputs: set them on the element and the root picks them up. `(valueCommit)` fires once at the end of an interaction, never mid-drag.

```html
<div urcColorAreaRoot [(value)]="color" (valueCommit)="onCommit($event)" dir="rtl" disabled>
  <canvas urcColorAreaGradient></canvas>
  <div urcColorAreaThumb></div>
</div>
```

### Inverted axes

`xInverted` and `yInverted` are `booleanAttribute` inputs, so the bare attribute form works. They mirror an axis, and the gradient, the thumb position and the arrow keys all follow.

```html
<div urcColorAreaRoot [(value)]="color" yInverted>
  <canvas urcColorAreaGradient></canvas>
  <div urcColorAreaThumb></div>
</div>
```

### Template reference

Every directive sets `exportAs`, so the root's state is readable from the template.

```html
<div urcColorAreaRoot #area="urcColorAreaRoot" [(value)]="color">
  <canvas urcColorAreaGradient></canvas>
  <div urcColorAreaThumb></div>
</div>

<p>{{ area.xChannel() }}: {{ area.valueX() }} / {{ area.yChannel() }}: {{ area.valueY() }}</p>
```

### Signal Forms

`ColorAreaRoot` implements `FormValueControl<Color>`, so it binds straight to a signal form field.

```html
<div urcColorAreaRoot [field]="form.brandColor">
  <canvas urcColorAreaGradient></canvas>
  <div urcColorAreaThumb></div>
</div>
```

## API Reference

`COLOR_AREA_DIRECTIVES` is the array of every part below. `COLOR_AREA_DEFAULT_COLOR` is the `Color` a root falls back to when `[(value)]` is never bound.

### ColorAreaRoot

The root of the area. Owns the color, the pointer and keyboard interaction, and every piece of state the other parts read through `inject(ColorAreaRoot)`.

- Selector: `[urcColorAreaRoot]`
- Export as: `urcColorAreaRoot`
- Implements: `FormValueControl<Color>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<Color>` | `hsl(0, 100%, 50%)` | The color, two-way bindable as `[(value)]`. Also the Signal Forms contract. |
| `colorSpace` | `input<SpaceId>` | `'hsl'` | The color space both axes operate in. |
| `xChannel` | `input<string \| undefined>` | Auto | Channel driven by the horizontal axis, or `'alpha'`. Defaults to the color space's first channel. |
| `yChannel` | `input<string \| undefined>` | Auto | Channel driven by the vertical axis, or `'alpha'`. Defaults to the color space's second channel. |
| `xInverted` | `input<boolean>` | `false` | Runs the horizontal axis opposite to its natural direction. Coerced with `booleanAttribute`. |
| `yInverted` | `input<boolean>` | `false` | Runs the vertical axis opposite to its natural direction. Coerced with `booleanAttribute`. |
| `thumbAlignment` | `input<ColorAreaThumbAlignment>` | `'overflow'` | Whether the thumb straddles the edge (`'overflow'`) or is pulled fully inside it. |
| `valueCommit` | `output<Color>` | — | Emitted once at the end of an interaction, never mid-drag. |

`ColorAreaThumbAlignment` is `"contain" | "overflow"`.

::: warning `disabled` is not an input
`disabled` is the native DOM attribute. The static attribute is read at construction, which works under SSR, and a `MutationObserver` keeps it live afterwards. The readable signal is named **`isDisabled`**, not `disabled`, because `FormUiControl` reserves the member name `disabled` for its own `InputSignal<boolean>`.
:::

`dir` is DOM state too, and is read by the same observer. The resolved value comes from `getComputedStyle(...).direction` rather than the host attribute alone, so an inherited `<html dir="rtl">` is honoured. It is published as the `dir` signal. RTL and `xInverted` each mirror the horizontal axis, so setting both cancels out.

Readable signals, for `exportAs` template references and for `inject(ColorAreaRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `dir` | `Signal<'ltr' \| 'rtl'>` | The resolved reading direction. |
| `dragging` | `Signal<boolean>` | True while a pointer drag is in flight. |
| `xChannel` | `Signal<string>` | The resolved horizontal channel, after the space's default is applied. |
| `yChannel` | `Signal<string>` | The resolved vertical channel, after the space's default is applied. |
| `valueX` / `valueY` | `Signal<number>` | The two channels in display units. |
| `minX` / `maxX` | `Signal<number>` | Bounds of the horizontal axis, in display units. |
| `minY` / `maxY` | `Signal<number>` | Bounds of the vertical axis, in display units. |
| `isSlidingFromLeft` | `Signal<boolean>` | False when the horizontal axis is mirrored. |
| `isSlidingFromTop` | `Signal<boolean>` | False when the vertical axis is mirrored. |

::: tip
:::

The root publishes `--reka-slider-area-thumb-transform` on its own style, which is the centring transform the thumb consumes.

### ColorAreaGradient

Paints the area's two-dimensional color surface onto a `<canvas>` you supply. The transparency checkerboard is this element's CSS background, which the canvas bitmap composites over. There is no `Checkerboard` part in this package.

- Selector: `canvas[urcColorAreaGradient]`
- Export as: `urcColorAreaGradient`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topLeft` | `input<string \| undefined>` | — | Explicit top-left corner color. Supplying any corner switches the directive to corner mode. |
| `topRight` | `input<string \| undefined>` | — | Explicit top-right corner color. |
| `bottomLeft` | `input<string \| undefined>` | — | Explicit bottom-left corner color. |
| `bottomRight` | `input<string \| undefined>` | — | Explicit bottom-right corner color. |
| `interpolationSpace` | `input<SpaceId \| undefined>` | — | Interpolate the corner surface in this space for perceptual accuracy. Switches the corner path from WebGL to a CPU sampler. |
| `channelOverrides` | `input<ColorAreaChannelOverrides>` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Pass `false` for no overrides at all. |

`ColorAreaChannelOverrides` is `Record<string, number> | false`.

### ColorAreaThumb

The single combined handle, and the area's only focusable element. One thumb drives **both** axes: it sets `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned from the horizontal and vertical channel values.

Because one handle serves two channels, it announces both: `aria-label` names the channel pair and `aria-valuetext` carries both formatted values. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

- Selector: `[urcColorAreaThumb]`
- Export as: `urcColorAreaThumb`

The directive takes no inputs. A static `aria-label` on the host element is read at construction and wins over the generated channel-pair label. A mirrored axis is anchored from the opposite edge, so the directive sets `right`/`bottom` instead of `left`/`top` and the percentage stays positive.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-slider-area-impl` | Root | Always. |
| `data-disabled` | Root, Thumb | The root is disabled. |
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

ColorArea exposes a single focusable thumb that drives both the horizontal and the vertical channel. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `urcColorAreaThumb`, with `aria-roledescription="2D slider"`. |
| `aria-label` | Defaults to the two channel labels joined with "and", e.g. `"Hue and Saturation"`. Set your own `aria-label` on the thumb element to override. |
| `aria-valuemin` / `aria-valuemax` | The horizontal channel's range. |
| `aria-valuenow` | The current horizontal channel value. Only one number can be carried here, so the X axis owns it. |
| `aria-valuetext` | Both channels formatted with their units, e.g. `"210°, 80%"`. |
| `aria-disabled` | Applied to the root and the thumb when the native `disabled` attribute is set. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Left | Move one step along the horizontal axis |
| Arrow Down / Arrow Up | Move one step along the vertical axis |
| Shift + Arrow | Move by 10 steps |
| Home / End | Jump to the left / right edge of the horizontal axis |
| Page Up / Page Down | Jump to the top / bottom edge of the vertical axis |

Keys address the *visual* axes: `xInverted`, `yInverted` and RTL flip the direction of travel so the thumb still moves the way the key points. `(valueCommit)` fires once on key release, not on every repeat.
