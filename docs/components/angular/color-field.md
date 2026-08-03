# ColorField

A numeric input component for editing a single color channel, with optional stepper buttons and a color swatch preview.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element. `COLOR_FIELD_DIRECTIVES` brings the whole family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-field",
  imports: [...COLOR_FIELD_DIRECTIVES],
  template: `
    <div
      urcColorFieldRoot
      [(value)]="color"
      colorSpace="hsl"
      channel="h"
      class="flex items-center overflow-hidden rounded-md border"
    >
      <span urcColorFieldSwatch [value]="color()" class="size-4 rounded-sm"></span>
      <button urcColorFieldDecrement class="px-2">&minus;</button>
      <input
        urcColorFieldInput
        aria-label="Hue"
        class="w-16 bg-transparent text-center font-mono outline-none"
      />
      <button urcColorFieldIncrement class="px-2">+</button>
    </div>
  `,
})
export class MyField {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

## Anatomy

```html
<div urcColorFieldRoot>
  <span urcColorFieldSwatch></span>
  <button urcColorFieldDecrement></button>
  <input urcColorFieldInput />
  <button urcColorFieldIncrement></button>
</div>
```

Three of the selectors are tag-qualified: `input[urcColorFieldInput]`, `button[urcColorFieldIncrement]` and `button[urcColorFieldDecrement]` must sit on those elements. The root and swatch selectors are element-agnostic.

`urcColorFieldSwatch` takes its own `[value]` and never injects the root, so it can sit anywhere — inside the root, or beside it.

## Examples

### Hex input

`format="hex"` switches the field from editing one channel to editing the whole color as a `#rrggbb` string. In that mode `channel` is not read at all.

```html
<div urcColorFieldRoot [(value)]="color" format="hex" class="flex h-8 items-center rounded-md border px-3">
  <input urcColorFieldInput aria-label="Hex" class="min-w-0 flex-1 bg-transparent font-mono outline-none" />
</div>
```

### HSL channel fields

One root per channel, all bound to the same signal. The steppers disable themselves once a value reaches its bound.

```html
@for (channel of channels; track channel.key) {
  <div urcColorFieldRoot [(value)]="color" colorSpace="hsl" [channel]="channel.key" class="flex items-center rounded-md border">
    <button urcColorFieldDecrement class="px-2">&minus;</button>
    <input urcColorFieldInput [attr.aria-label]="channel.label" class="w-16 bg-transparent text-center outline-none" />
    <button urcColorFieldIncrement class="px-2">+</button>
  </div>
}
```

### Alpha channel

`channel="alpha"` edits opacity. It is not a channel of any color space — the root special-cases it and presents it as a `0–100` percentage.

```html
<div urcColorFieldRoot [(value)]="color" channel="alpha" class="flex items-center rounded-md border">
  <span urcColorFieldSwatch [value]="color()" alpha class="size-4 rounded-sm"></span>
  <button urcColorFieldDecrement class="px-2">&minus;</button>
  <input urcColorFieldInput aria-label="Alpha" class="w-16 bg-transparent text-center outline-none" />
  <button urcColorFieldIncrement class="px-2">+</button>
</div>
```

### Bounds and step

`min`, `max` and `step` carry no `numberAttribute` transform, so bind them rather than writing them as static attributes — a static `min="20"` would arrive as the string `"20"`.

```html
<div urcColorFieldRoot [(value)]="color" colorSpace="hsl" channel="l" [min]="20" [max]="80" [step]="5">
  <input urcColorFieldInput aria-label="Lightness" />
</div>
```

### Commit, read-only and disabled

`disabled` and `readonly` are the **native attributes**, not inputs — set them on the root element and the directive picks them both up. `(valueCommit)` fires once at the end of an interaction; `(valueChange)`, the output half of `[(value)]`, fires on every change including mid-typing.

```html
<div urcColorFieldRoot [(value)]="color" (valueCommit)="onCommit($event)" readonly>
  <button urcColorFieldDecrement>&minus;</button>
  <input urcColorFieldInput aria-label="Hue" />
  <button urcColorFieldIncrement>+</button>
</div>
```

### Template reference

Every directive sets `exportAs`, so the root's state is readable from the template.

```html
<div urcColorFieldRoot #field="urcColorFieldRoot" [(value)]="color" channel="h">
  <input urcColorFieldInput aria-label="Hue" />
  <button urcColorFieldIncrement [disabled]="field.isIncreaseDisabled()">+</button>
</div>

<p>{{ field.displayValue() }} — format {{ field.effectiveFormat() }}</p>
```

### Signal Forms

`ColorFieldRoot` implements `FormValueControl<Color>`, so it binds straight to a signal form field.

```html
<div urcColorFieldRoot [field]="form.brandColor">
  <input urcColorFieldInput aria-label="Hue" />
</div>
```

## API Reference

`COLOR_FIELD_DIRECTIVES` is the array of every part below. `COLOR_FIELD_DEFAULT_COLOR` is the `Color` a root falls back to when `[(value)]` is never bound — `hsl(210, 80%, 50%)`. `ColorFieldFormat` is the exported display-format union.

### ColorFieldRoot

The root of the field. Owns the color, the field's own numeric and text state, and every operation the other parts invoke through `inject(ColorFieldRoot)`.

- Selector: `[urcColorFieldRoot]`
- Export as: `urcColorFieldRoot`
- Implements: `FormValueControl<Color>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<Color>` | `COLOR_FIELD_DEFAULT_COLOR` | The color, two-way bindable as `[(value)]`. Also the Signal Forms contract. `(valueChange)` fires on every change, including mid-typing. |
| `colorSpace` | `input<SpaceId>` | `'hsl'` | The color space the field operates in. |
| `channel` | `input<string>` | `'h'` | The channel this field controls, or `'alpha'`. Not read when the format resolves to `'hex'`. |
| `format` | `input<ColorFieldFormat \| undefined>` | Auto | `'number' \| 'degree' \| 'percentage' \| 'hex'`. Derived from the channel config when unset; `'hex'` is never derived and switches the field to editing the whole color. |
| `min` | `input<number \| undefined>` | Auto | Minimum value, in display units. Falls back to the channel config, then `0`. |
| `max` | `input<number \| undefined>` | Auto | Maximum value, in display units. Falls back to the channel config, then `0xffffff` in hex mode and `100` otherwise. |
| `step` | `input<number \| undefined>` | Auto | Step for arrow keys and the steppers. Falls back to the channel config, then `1`. |
| `valueCommit` | `output<Color>` | — | Emitted once at the end of an interaction: blur, Enter, an arrow key, or a stepper press. |

::: warning `disabled` and `readonly` are not inputs
Both are native DOM attributes. The static attributes are read at construction — which works under SSR — and a single `MutationObserver` keeps them live afterwards. The readable signals are named **`isDisabled`** and **`isReadOnly`**; `isDisabled` cannot be called `disabled` because `FormUiControl` reserves that member name for its own `InputSignal<boolean>`.
:::

::: tip
`min`, `max` and `step` have no `numberAttribute` transform. Bind them — `[min]="20"` — rather than writing them as static attributes.
:::

Readable signals, for `exportAs` template references and for `inject(ColorFieldRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `isReadOnly` | `Signal<boolean>` | Whether the value is shown but cannot be edited. |
| `modelValue` | `Signal<number \| undefined>` | The numeric channel value in display units, or `undefined` when the field is empty. |
| `displayValue` | `Signal<string>` | The exact text the input renders, including in-progress edits. |
| `effectiveFormat` | `Signal<ColorFieldFormat>` | The resolved format, after the channel-config fallback. |
| `isDecreaseDisabled` | `Signal<boolean>` | True when the value already sits at its minimum. |
| `isIncreaseDisabled` | `Signal<boolean>` | True when the value already sits at its maximum. |

The root also exposes the operations the other parts call: `handleIncrease(multiplier?)`, `handleDecrease(multiplier?)`, `handleMinMaxValue('min' | 'max')`, `commitValue(value)` and `onInputChange(text)`.

### ColorFieldInput

The editable text surface. Applied to a native `<input>`, which it drives as a `spinbutton` — the field renders suffixed text (`210°`, `50%`, `#ff8800`) that a `type="number"` input would reject, so the stepping keyboard map is provided here instead of by the browser.

- Selector: `input[urcColorFieldInput]`
- Export as: `urcColorFieldInput`

The directive takes no inputs. It host-binds `type`, `role`, `value`, `aria-valuenow`, `disabled`, `readOnly`, `spellcheck`, `autocomplete`, `autocorrect` and `inputmode`, and it listens for `input`, `focus`, `blur` and `keydown`. It does **not** generate an accessible name, so set your own `aria-label` on the element.

### ColorFieldIncrement

Steps the value up by `step`. Applied to a native `<button>`, which it host-binds to `type="button"` and `tabindex="-1"` — the input owns the field's tab stop, so the steppers are pointer affordances only.

Holding the button repeats: one step immediately, a `400`ms pause, then a step every `60`ms. The release listeners live on `window`, so a pointer that leaves the button before lifting still ends the hold.

- Selector: `button[urcColorFieldIncrement]`
- Export as: `urcColorFieldIncrement`

The directive takes no inputs. It host-binds `disabled` to `root.isDisabled() || root.isReadOnly() || root.isIncreaseDisabled()`. A static `aria-label` on the host element is read at construction and wins over the default `"Increase"`.

### ColorFieldDecrement

Steps the value down by `step`. Identical to `ColorFieldIncrement` in every respect except direction.

- Selector: `button[urcColorFieldDecrement]`
- Export as: `urcColorFieldDecrement`

The directive takes no inputs. It host-binds `disabled` to `root.isDisabled() || root.isReadOnly() || root.isDecreaseDisabled()`. A static `aria-label` on the host element is read at construction and wins over the default `"Decrease"`.

### ColorFieldSwatch

A read-only preview of a color. The color is painted as a flat `linear-gradient` layered over a checkerboard, so a translucent value shows the checks through it.

- Selector: `[urcColorFieldSwatch]`
- Export as: `urcColorFieldSwatch`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `input<Color \| string \| null \| undefined>` | — | The color to display. Independent of the root's value. |
| `checkerSize` | `input<number>` | `16` | The checkerboard square size, in pixels. |
| `alpha` | `input<boolean>` | `false` | When true, reflects the color's alpha; when false, paints it opaque. Coerced with `booleanAttribute`, so the bare `alpha` attribute works. |

Every paint layer is a host **style** binding, which leaves your own `style` attribute — a template-level binding — winning the cascade. The swatch publishes `--swatch-color`, `--swatch-color-opaque`, `--swatch-alpha` and `--swatch-checkerboard` for callers styling their own overlays.

A swatch is inert, so its `disabled` is read once from the static host attribute rather than tracked live; it only sets `data-disabled`. A static `aria-label` wins over the default `"Colour swatch"`.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Input | The root's native `disabled` attribute is set. |
| `data-readonly` | Root, Input | The root's native `readonly` attribute is set. |
| `data-disabled` | Increment, Decrement | The root is disabled or read-only, or the value already sits at that button's bound. |
| `data-disabled` | Swatch | The swatch's own static `disabled` attribute is set. |
| `data-pressed` | Increment, Decrement | The button is held down. |

## Accessibility

ColorField exposes the input as the single tab stop. The steppers carry `tabindex="-1"` on purpose: everything they do is reachable from the keyboard through the input's own arrow-key map, so they add no keyboard surface a screen reader user has to walk past.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="spinbutton"` | Applied to `urcColorFieldInput`. |
| `aria-valuenow` | The current value in display units. Absent while the field is empty. |
| `aria-label` | Not generated for the input — set your own on the element. Defaults to `"Increase"` / `"Decrease"` on the steppers and `"Colour swatch"` on the swatch. |
| `role="img"` | Applied to `urcColorFieldSwatch`. |
| `disabled` / `readOnly` | Native properties, mirrored onto the input from the root. |

`aria-valuemin` and `aria-valuemax` are not emitted by this package; the range still governs clamping, snapping and the steppers' disabled state.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Up | Increase by one step |
| Arrow Down | Decrease by one step |
| Page Up | Increase by 10 steps |
| Page Down | Decrease by 10 steps |
| Home | Jump to minimum |
| End | Jump to maximum |
| Enter | Commit the current value |

Every one of those keys commits, so `(valueCommit)` fires per press. Blurring the input commits too. Typing updates `[(value)]` on each keystroke that parses, and the text you typed is only clamped, snapped and reformatted at commit time.
