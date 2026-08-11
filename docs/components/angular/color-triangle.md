# ColorTriangle

A triangular 2D area component for adjusting two color channels, or three, as barycentric coordinates on a simplex.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element. `COLOR_TRIANGLE_DIRECTIVES` brings the whole family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_TRIANGLE_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-triangle",
  imports: [...COLOR_TRIANGLE_DIRECTIVES],
  template: `
    <div
      urcColorTriangleRoot
      [(value)]="color"
      colorSpace="hsv"
      xChannel="s"
      yChannel="v"
      class="relative block size-64"
      style="container-type: inline-size"
    >
      <canvas urcColorTriangleGradient class="absolute inset-0 block"></canvas>
      <div urcColorTriangleThumb class="size-4 rounded-full border-2 border-white"></div>
    </div>
  `,
})
export class MyTriangle {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

## Anatomy

```html
<div urcColorTriangleRoot>
  <canvas urcColorTriangleGradient></canvas>
  <div urcColorTriangleThumb></div>
</div>
```

The gradient's selector is `canvas[urcColorTriangleGradient]`, so it must sit on a `<canvas>` element. The root and thumb selectors are element-agnostic.

## Examples

### HSV / Saturation x Brightness

HSV triangle with Saturation and Brightness on the two axes. Both channels are the color space's defaults, so they can be omitted.

```html
<div
  urcColorTriangleRoot
  [(value)]="color"
  colorSpace="hsv"
  xChannel="s"
  yChannel="v"
  class="relative block size-64"
  style="container-type: inline-size"
>
  <canvas urcColorTriangleGradient class="absolute inset-0 block"></canvas>
  <div urcColorTriangleThumb class="size-4 rounded-full border-2 border-white"></div>
</div>
```

### HSL / Saturation x Lightness

The same two axes in HSL, where the second channel is Lightness.

```html
<div
  urcColorTriangleRoot
  [(value)]="color"
  colorSpace="hsl"
  xChannel="s"
  yChannel="l"
  class="relative block size-64"
>
  <canvas urcColorTriangleGradient class="absolute inset-0 block"></canvas>
  <div urcColorTriangleThumb class="size-4 rounded-full border-2 border-white"></div>
</div>
```

### Maxwell's RGB triangle

Supplying `zChannel` switches the triangle from a two-channel half-simplex to a full three-channel barycentric simplex. One thumb still drives all three.

```html
<div
  urcColorTriangleRoot
  [(value)]="color"
  colorSpace="srgb"
  xChannel="r"
  yChannel="g"
  zChannel="b"
  class="relative block size-64"
>
  <canvas urcColorTriangleGradient class="absolute inset-0 block"></canvas>
  <div urcColorTriangleThumb class="size-4 rounded-full border-2 border-white"></div>
</div>
```

::: info The first keypress "jumps"
In three-channel mode the three values are barycentric coordinates: only the ratio
between them is meaningful, so the root renormalizes them onto the simplex
(`u + v + w === 1`) on every write. An `srgb` color that starts off the simplex is
rewritten onto it by the first arrow press. This is inherent to the geometry, not a
bug, afterwards the values stay on the simplex and step smoothly.
:::

### Rotation and mirroring

`inverted` is a `booleanAttribute` input, so the static form works. Rotate the triangle with a CSS `transform` on the root. The root maps pointer positions back through its own transform, so dragging still follows the corner each vertex points at.

```html
<div urcColorTriangleRoot [(value)]="color" inverted style="transform: rotate(180deg)">
  <canvas urcColorTriangleGradient></canvas>
  <div urcColorTriangleThumb></div>
</div>
```

### Commit and disabled

`disabled` is the **native attribute**, not an input: set it on the element and the root picks it up. `(valueCommit)` fires once at the end of an interaction, never mid-drag.

```html
<div urcColorTriangleRoot [(value)]="color" (valueCommit)="onCommit($event)" disabled>
  <canvas urcColorTriangleGradient></canvas>
  <div urcColorTriangleThumb></div>
</div>
```

### Keeping the thumb inside the outline

`thumbAlignment="contain"` positions the thumb against a triangle inset by half the thumb's own size, so its box never crosses an edge. The pointer maps onto the same inset triangle, so cursor and thumb still agree at the corners.

```html
<div urcColorTriangleRoot [(value)]="color" thumbAlignment="contain">
  <canvas urcColorTriangleGradient></canvas>
  <div urcColorTriangleThumb class="size-4 rounded-full border-2 border-white"></div>
</div>
```

### Template reference

Every directive sets `exportAs`, so the root's state is readable from the template.

```html
<div urcColorTriangleRoot #triangle="urcColorTriangleRoot" [(value)]="color">
  <canvas urcColorTriangleGradient></canvas>
  <div urcColorTriangleThumb></div>
</div>

<p>{{ triangle.xChannel() }}: {{ triangle.valueX() }}</p>
```

### Signal Forms

`ColorTriangleRoot` implements `FormValueControl<Color>`, so it binds straight to a signal form field.

```html
<div urcColorTriangleRoot [field]="form.brandColor">
  <canvas urcColorTriangleGradient></canvas>
  <div urcColorTriangleThumb></div>
</div>
```

## API Reference

`COLOR_TRIANGLE_DIRECTIVES` is the array of every part below. `COLOR_TRIANGLE_DEFAULT_COLOR` is the `Color` a root falls back to when `[(value)]` is never bound.

### ColorTriangleRoot

The root of the triangle. Owns the color, the pointer and keyboard interaction, the triangle geometry, and every piece of state the other parts read through `inject(ColorTriangleRoot)`.

- Selector: `[urcColorTriangleRoot]`
- Export as: `urcColorTriangleRoot`
- Implements: `FormValueControl<Color>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<Color>` | `hsl(0, 100%, 50%)` | The color, two-way bindable as `[(value)]`. Also the Signal Forms contract. |
| `colorSpace` | `input<SpaceId>` | `'hsv'` | The color space the triangle operates in. |
| `xChannel` | `input<string \| undefined>` | Auto | The channel mapped to the first vertex. Defaults to the color space's second channel. |
| `yChannel` | `input<string \| undefined>` | Auto | The channel mapped to the second vertex. Defaults to the color space's third channel. |
| `zChannel` | `input<string \| undefined>` | — | The channel mapped to the third vertex. Supplying it selects the three-channel simplex. |
| `inverted` | `input<boolean>` | `false` | Swaps the second and third vertices, mirroring the triangle. Coerced with `booleanAttribute`. |
| `thumbAlignment` | `input<ColorTriangleThumbAlignment>` | `'overflow'` | Whether the thumb is centred on the edge or kept inside it. |
| `valueCommit` | `output<Color>` | — | Emitted once at the end of an interaction, never mid-drag. |

`ColorTriangleThumbAlignment` is `"contain" | "overflow"`.

::: warning `disabled` is not an input
`disabled` is the native DOM attribute. The static attribute is read at construction, which works under SSR, and a `MutationObserver` keeps it live afterwards. The readable signal is named **`isDisabled`**, not `disabled`, because `FormUiControl` reserves the member name `disabled` for its own `InputSignal<boolean>`.
:::

Readable signals, for `exportAs` template references and for `inject(ColorTriangleRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `dragging` | `Signal<boolean>` | True while a pointer drag is in flight. |
| `xChannel` / `yChannel` | `Signal<string>` | The resolved first and second channels, after the space's defaults are applied. |
| `zChannel` | `Signal<string \| undefined>` | The third channel, or `undefined` in two-channel mode. |
| `isThreeChannel` | `Signal<boolean>` | True when a third channel turns the half-simplex into a full simplex. |
| `valueX` / `valueY` / `valueZ` | `Signal<number>` | The channels in display units. `valueZ` equals `minZ` in two-channel mode. |
| `minX` / `maxX` | `Signal<number>` | Bounds of the first channel, in display units. |
| `minY` / `maxY` | `Signal<number>` | Bounds of the second channel, in display units. |
| `minZ` / `maxZ` | `Signal<number>` | Bounds of the third channel. Inert in two-channel mode. |
| `vertices` | `Signal<[Point, Point, Point]>` | The three corners in normalised 0-1 space; what the outline is clipped to. |
| `positionVertices` | `Signal<[Point, Point, Point]>` | The corners the thumb is positioned against. Identical to `vertices` unless `thumbAlignment` is `"contain"`. |

::: tip
:::

A pointer press that lands outside the outline is ignored: the host's box is a full square and the `clip-path` hides the corners without stopping the event, so the root hit-tests every `pointerdown` against the triangle itself.

### ColorTriangleGradient

Paints the triangle's color surface onto a `<canvas>` you supply, sampled from the root's color space and channel configuration, including the third channel when one is set. The transparency checkerboard is this element's CSS background, which the canvas bitmap composites over, there is no `Checkerboard` part in this package.

- Selector: `canvas[urcColorTriangleGradient]`
- Export as: `urcColorTriangleGradient`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelOverrides` | `input<ColorTriangleChannelOverrides>` | `{ alpha: 1 }` | Lock specific channels to fixed values in the gradient. Pass `false` for no overrides at all. |

`ColorTriangleChannelOverrides` is `Record<string, number> | false`.

The directive sets its own `position`, `inset`, `width`, `height`, `pointer-events`, `background`, `clip-path` and `opacity`, so the canvas fills the root and carries the outline. `opacity` tracks the color's alpha unless `channelOverrides` locks it. Painting is skipped while a drag is in flight: a drag only moves the channels the surface already spans, so the pixels cannot change.

### ColorTriangleThumb

The single combined handle, and the triangle's only focusable element. One thumb drives **every** axis: it sets `role="slider"`, takes `tabindex="0"` unless the root is disabled, and is positioned from the barycentric coordinates of the channel values.

Because one handle serves two channels, or three in barycentric mode, it announces all of them: `aria-label` names the channel set and `aria-valuetext` carries every formatted value. There is no separate thumb per axis. The thumb is only a focus target and an ARIA surface; every value change is owned by the root, whose `keydown` listener sees the events that bubble up from here.

- Selector: `[urcColorTriangleThumb]`
- Export as: `urcColorTriangleThumb`

The directive takes no inputs. A static `aria-label` on the host element is read at construction and wins over the generated channel-set label. The thumb registers itself with the root after the first render so the `"contain"` inset can be measured against it.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-color-triangle-root` | Root | Always. Marks the root for descendants and for styling. |
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

ColorTriangle exposes a single focusable thumb that drives both triangle axes, and the third channel too, in barycentric mode. Keyboard events are handled on the root, which sees them bubble up from the focused thumb.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="slider"` | Applied to `urcColorTriangleThumb`, with `aria-roledescription="Color thumb"`. |
| `aria-label` | Defaults to the channel labels in order, e.g. `"Saturation, Brightness"`. Three entries when `zChannel` is set. Set your own `aria-label` on the thumb element to override. |
| `aria-valuemin` / `aria-valuemax` | The first channel's range. |
| `aria-valuenow` | The current first-channel value. Only one number can be carried here, so the `xChannel` axis owns it. |
| `aria-valuetext` | Every active channel formatted, e.g. `"Saturation 80%, Brightness 50%"`. |
| `aria-disabled` | Applied to the root and the thumb when the native `disabled` attribute is set. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right | Increase the first channel by one step |
| Arrow Left | Decrease the first channel by one step |
| Arrow Up | Increase the second channel by one step |
| Arrow Down | Decrease the second channel by one step |
| Shift + Arrow | Move by 10 steps |
| Page Up / Page Down | Increase / decrease the second channel by 10 steps (unaffected by Shift) |
| Home | Move both channels to their minimum |
| End | Move both channels to their maximum |

There is no third-axis key. In three-channel mode the `zChannel` value falls out of the barycentric renormalization of the other two, so the same four arrows cover the whole simplex.

In two-channel mode the reachable region is the half-simplex, so a step that would push the point past the hypotenuse gives way on the axis you did not drive. `(valueCommit)` fires once on key release, not on every repeat.
