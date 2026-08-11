# ColorSwatchGroup

A group of color swatches sharing one selection and one arrow-key navigation surface.

## Preview

Every part ships as a standalone **attribute directive**, so you own each element.
`COLOR_SWATCH_GROUP_DIRECTIVES` brings the group in with one entry in `imports`.
This family draws on two of them, since the item is an ordinary `ColorSwatch`.

```ts
import { Component, signal } from "@angular/core";
import { COLOR_SWATCH_DIRECTIVES, COLOR_SWATCH_GROUP_DIRECTIVES } from "@urcolor/angular";

const COLORS = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
];

@Component({
  selector: "my-group",
  imports: [...COLOR_SWATCH_GROUP_DIRECTIVES, ...COLOR_SWATCH_DIRECTIVES],
  template: `
    <div
      urcColorSwatchGroupRoot
      [(value)]="selected"
      type="single"
      class="flex items-center gap-2"
    >
      @for (color of colors; track color) {
        <button
          urcColorSwatch
          [value]="color"
          [attr.aria-label]="color"
          [pressed]="selected().includes(color)"
          (pressedChange)="selected.set([color])"
          class="size-10 cursor-pointer rounded-lg outline-none"
        ></button>
      }
    </div>
  `,
})
export class MyGroup {
  protected readonly colors = COLORS;
  protected readonly selected = signal<string[]>([COLORS[0]!]);
}
```

::: info Different names, same family
Angular, React and Svelte all call this `ColorSwatchGroup`. Vue ships the same
idea as `ColorSwatchPicker`, built on a listbox, with dedicated
`ColorSwatchPickerItem`, `ColorSwatchPickerItemSwatch` and
`ColorSwatchPickerItemIndicator` parts and a `v-model` that is a single string
until you set `multiple`. Here `value` is always a `string[]`, in both selection
modes, and the ordinary `ColorSwatch` is the item.
:::

Selection is keyed by the **serialized color string**, never by `Color` identity.
`Color` is immutable, so two equal colors are still two different objects and
reference equality would never match, `value`, `isSelected()` and `toggle()`
therefore all speak in `string`.

## Anatomy

```html
<div urcColorSwatchGroupRoot>
  <button urcColorSwatch></button>
  <button urcColorSwatch></button>
  <button urcColorSwatch></button>
</div>
```

Both selectors are element-agnostic, `[urcColorSwatchGroupRoot]` and
`[urcColorSwatch]`, but the swatch belongs on a `<button>` here. There is no
`Item`, `ItemSwatch` or `Indicator` directive: the swatch *is* the item. The root
never renders the swatches; it finds them in the DOM by shape, matching
`button, [role='button'], [tabindex]`, and skipping anything nested inside
another match. On a non-button host the swatch claims `role="button"` itself once
it is interactive, so the group can still find it.

## Examples

### Single selection

`type="single"` keeps at most one value in the selection. Because the swatch owns
its own pressed state, the handler is what actually writes the selection.

```html
<div urcColorSwatchGroupRoot [(value)]="selected" type="single" class="flex gap-2">
  @for (color of colors; track color) {
    <button
      urcColorSwatch
      [value]="color"
      [attr.aria-label]="color"
      [pressed]="selected().includes(color)"
      (pressedChange)="selected.set([color])"
      class="size-10 rounded-lg"
    ></button>
  }
</div>
```

### Multiple selection

`type="multiple"` alone does not make a multi-select picker work: the handler
has to add and remove too.

```html
<div urcColorSwatchGroupRoot [(value)]="selected" type="multiple" class="flex gap-2">
  @for (color of colors; track color) {
    <button
      urcColorSwatch
      [value]="color"
      [attr.aria-label]="color"
      [pressed]="selected().includes(color)"
      (pressedChange)="onToggle(color, $event)"
      class="size-10 rounded-lg"
    ></button>
  }
</div>
```

```ts
protected onToggle(color: string, pressed: boolean): void {
  this.selected.update(selection =>
    pressed ? [...selection, color] : selection.filter(entry => entry !== color),
  );
}
```

### Selected indicator

There is no indicator directive. Render your own marker in the swatch's content
against the selection state.

```html
<button urcColorSwatch [value]="color" [pressed]="selected().includes(color)" class="grid place-items-center">
  @if (selected().includes(color)) {
    <svg class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  }
</button>
```

### Vertical orientation

`orientation` decides which arrow keys move focus, and is reflected as
`data-orientation` on the root.

```html
<div urcColorSwatchGroupRoot [(value)]="selected" orientation="vertical" class="flex flex-col gap-2">
  <!-- swatches -->
</div>
```

### Disabled and direction

`disabled` and `dir` are **native attributes**, not inputs, set them on the
element and the directive picks them up. `dir` is resolved through
`getComputedStyle`, so an inherited `<html dir="rtl">` counts too.

```html
<div urcColorSwatchGroupRoot [(value)]="selected" disabled dir="rtl">
  <button urcColorSwatch [value]="color" [(pressed)]="isPicked" disabled></button>
</div>
```

The group's `disabled` is not forwarded to the swatches, disable those
individually, which is what removes their `tabindex`.

### Listening to changes

`(valueChange)` is the output half of `[(value)]` and hands you the whole
selection array. When you listen to it explicitly, bind the input one-way and
write the signal yourself. There is no commit event. A selection has no drag to
release.

```html
<div
  urcColorSwatchGroupRoot
  [value]="selected()"
  (valueChange)="onSelectionChange($event)"
  type="single"
>
  <!-- swatches -->
</div>
```

### Template reference

Every directive sets `exportAs`, so the group's state is readable from the
template. And `isSelected` / `toggle` are callable from it.

```html
<div urcColorSwatchGroupRoot #group="urcColorSwatchGroupRoot" [(value)]="selected">
  @for (color of colors; track color) {
    <button
      urcColorSwatch
      [value]="color"
      [pressed]="group.isSelected(color)"
      (pressedChange)="group.toggle(color)"
    ></button>
  }
</div>

<p>{{ group.value().length }} selected, active index {{ group.activeIndex() }}</p>
```

Driving `pressed` from `group.isSelected(color)` and `pressedChange` from
`group.toggle(color)` is the shortest way to get correct single- *and*
multiple-selection semantics without writing a handler, since `toggle()` already
honours `type`.

### Signal Forms

`ColorSwatchGroupRoot` implements `FormValueControl<string[]>`, so it binds
straight to a signal form field.

```html
<div urcColorSwatchGroupRoot [field]="form.paletteTags">
  <!-- swatches -->
</div>
```

## API Reference

`COLOR_SWATCH_GROUP_DIRECTIVES` is the array of every part below. Which is just
the root. Items come from `COLOR_SWATCH_DIRECTIVES`.

### ColorSwatchGroupRoot

The group container. Owns the selection array and the arrow-key navigation for
every swatch inside it. Sets `role="group"` on the host unless the consumer set a
static `role` themselves.

- Selector: `[urcColorSwatchGroupRoot]`
- Export as: `urcColorSwatchGroupRoot`
- Implements: `FormValueControl<string[]>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `model<string[]>` | `[]` | The selected item values, two-way bindable as `[(value)]`. Also the Signal Forms contract. |
| `type` | `input<ColorSwatchGroupSelectionType>` | `'single'` | Whether `toggle()` keeps at most one value or any number of them. |
| `orientation` | `input<ColorSwatchGroupOrientation>` | `'horizontal'` | The axis arrow-key navigation runs along. |
| `loopFocus` | `input<boolean>` | `true` | Whether arrow navigation wraps past the first and last swatch. Coerced with `booleanAttribute`. |

`ColorSwatchGroupSelectionType` is `'single' | 'multiple'` and
`ColorSwatchGroupOrientation` is `'horizontal' | 'vertical'`.

::: warning `disabled` and `dir` are not inputs
Both are native DOM attributes. The static attributes are read at construction,
which works under SSR. And a `MutationObserver` keeps them live afterwards. The
readable signal is named **`isDisabled`**, not `disabled`, because `FormUiControl`
reserves the member name `disabled` for its own `InputSignal<boolean>`. `dir` is
resolved with `getComputedStyle`, since direction inherits from any ancestor and
reading the host attribute alone would miss `<html dir="rtl">`.
:::

Readable signals, for `exportAs` template references and for
`inject(ColorSwatchGroupRoot)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `dir` | `Signal<'ltr' \| 'rtl'>` | The resolved reading direction. |
| `activeIndex` | `Signal<number>` | Index of the item owning the group's tab stop. |
| `count` | `Signal<number>` | Number of registered items. |
| `groupState` | `Signal<ToggleGroupState>` | Ready for `rovingIndexFromKey` / `rovingTabIndex`. |

And its methods:

| Method | Signature | Description |
|--------|-----------|-------------|
| `isSelected` | `(itemValue: string) => boolean` | True when the value is part of the selection. |
| `toggle` | `(itemValue: string) => void` | Flips a value, honouring `type`. No-op while disabled. |
| `setActiveIndex` | `(index: number) => void` | Moves the group's tab stop. |
| `tabIndexFor` | `(index: number) => 0 \| -1` | The tabindex for the item at `index`. |
| `register` | `() => ColorSwatchGroupItemHandle` | Claims a seat; the caller must `dispose()` it on destroy. |

`ColorSwatchGroupItemHandle` exposes `index`, `tabIndex`, `active`, `activate()`
and `dispose()`, each recomputed live from registration order. Nothing in this
package registers today. A `ColorSwatch` is driven by the bubbling listeners on
the root. But your own item directive can inject the root and take a seat to get
its index and tab stop.

### ColorSwatch

The group's item, shipped as its own directive in `COLOR_SWATCH_DIRECTIVES`.
These are the inputs that matter inside a group; see the ColorSwatch page for the
full API.

- Selector: `[urcColorSwatch]`
- Export as: `urcColorSwatch`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `input<Color \| string \| null>` | — | The color to paint. Use the same string you put in the group's `value` array. |
| `pressed` | `model<boolean \| undefined>` | `undefined` | Whether the swatch is selected, two-way bindable as `[(pressed)]`. |
| `toggle` | `input<boolean \| undefined>` | Inferred | Forces button behaviour on or off. Left unset, it is true when `pressed` was bound at `ngOnInit`. |
| `checkerSize` | `input<number>` | `16` | The transparency grid's tile size, in pixels. Coerced with `numberAttribute`. |
| `alpha` | `input<boolean>` | `false` | When true, reflects the color's alpha; otherwise it paints fully opaque. Coerced with `booleanAttribute`. |

`disabled` is the native attribute here too; the readable signal is `isDisabled`.
`interactive` and `isPressed` are the other two readable signals, and
`togglePressed()` is the public method. There is no `Checkerboard` directive in
this package. The swatch paints the transparency grid itself, under the color.

### CSS Variables

The swatch writes all four as host style bindings, even for an absent or
unparseable value, so styling never has to guard for a missing variable.

| Variable | Description |
|----------|-------------|
| `--urcolor-swatch-color` | The painted color, honouring `alpha`. `transparent` when there is no color. |
| `--urcolor-swatch-color-opaque` | The same color forced to alpha 1. |
| `--urcolor-swatch-alpha` | The color's alpha channel, `1` when there is no color. |
| `--urcolor-swatch-checkerboard` | The transparency grid painted under the color. |
| `--urcolor-swatch-background` | The composited `background`, built from the four above. |

All five are always emitted, including when the value is absent or
unparseable, so your styling never has to guard for a missing variable. The
unprefixed `--swatch-color`, `--swatch-color-opaque`, `--swatch-alpha` and
`--swatch-checkerboard` are still emitted as aliases of their replacements and
are deprecated.

The grid itself reads three further properties, and no component writes them,
so a rule anywhere above the element wins:

| Variable | Default | Description |
|----------|---------|-------------|
| `--urcolor-checkerboard-dark` | `rgb(230, 230, 230)` | The darker of the two checks. |
| `--urcolor-checkerboard-light` | `white` | The lighter of the two checks. |
| `--urcolor-checkerboard-size` | `16px` | The tile size. `checkerSize` writes it inline, which beats a stylesheet. |

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-orientation` | Root | Always; `'horizontal'` or `'vertical'`. |
| `data-disabled` | Root, ColorSwatch | That element carries the native `disabled` attribute. |
| `data-pressed` | ColorSwatch | A toggle swatch is selected. |

There is no `data-state` and no `data-highlighted` here. Those are the Vue
listbox's attributes. Style against `data-pressed` instead.

## Accessibility

The root is a plain `role="group"`, not a listbox, and the swatches inside it are
toggle buttons. Keyboard navigation lives on the root: `keydown` and `focusin`
bubble up from the focused swatch, so a `ColorSwatch` needs no coupling to the
group and stays usable standalone.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="group"` | Set on the root, unless the consumer set a static `role` on the element. |
| `role="img"` | Set on a static, non-toggle swatch. |
| `role="button"` | Set on an interactive swatch that is not already a native `<button>`. |
| `aria-pressed` | Set on a toggle swatch, reflecting its pressed state. |
| `aria-disabled` | Set on a swatch carrying the native `disabled` attribute. |
| `aria-label` | **Not generated.** Set your own on each swatch. A colored button has no text content to name it. |

::: warning Every toggle swatch is its own tab stop
The group computes a roving tab stop, `activeIndex`, `tabIndexFor(index)` and
`register()` are all public. But `ColorSwatch` does not consume it. A toggle
swatch sets `tabindex="0"`, and none at all when disabled, so out of the box Tab
steps through every swatch and the arrow keys move focus on top of that. For a
true single tab stop, inject `ColorSwatchGroupRoot` from your own item directive
and drive `tabindex` from `tabIndexFor()`; a static `tabindex` attribute on the
swatch also wins over the directive's, but it will not move.
:::

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Left | Move focus between swatches (horizontal orientation) |
| Arrow Down / Arrow Up | Move focus between swatches (vertical orientation) |
| Home | Focus the first swatch |
| End | Focus the last swatch |
| Space / Enter | Toggle the focused swatch |

Arrow navigation wraps at the ends while `loopFocus` is true, and clamps when it
is false. In `rtl`, only the horizontal arrows are mirrored. `Home` and `End`
work in both orientations. There is no typeahead and no `Ctrl/Cmd + A`, those
belong to Vue's listbox-based picker.
