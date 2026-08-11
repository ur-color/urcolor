# ColorSwatch

A color preview element that displays a color with a checkerboard background for visualizing alpha transparency.

## Preview

The swatch ships as a standalone **attribute directive**, so you own the element. `COLOR_SWATCH_DIRECTIVES` brings the family in with one entry in `imports`.

```ts
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_SWATCH_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-swatches",
  imports: [...COLOR_SWATCH_DIRECTIVES],
  template: `
    <div class="flex items-center gap-3">
      @for (color of colors; track color) {
        <div urcColorSwatch [value]="color" alpha class="size-10 rounded-lg"></div>
      }
    </div>
  `,
})
export class MySwatches {
  protected readonly colors: Color[] = [
    Color.parse("hsl(210, 80%, 50%)")!,
    Color.parse("hsl(350, 90%, 60%)")!,
    Color.parse("hsl(120, 60%, 45%)")!,
    Color.parse("hsla(45, 100%, 55%, 0.5)")!,
  ];
}
```

## Anatomy

```html
<div urcColorSwatch></div>
```

A single directive with no sub-parts. Its selector is `[urcColorSwatch]`, which is element-agnostic — put it on a `<div>` for a static sample, or on a `<button>` when you want a toggle.

## Examples

### Alpha transparency

`alpha` is a `booleanAttribute` input, so the bare attribute is enough. It reflects the color's alpha channel; without it the swatch paints the color fully opaque.

```html
<div urcColorSwatch [value]="color()" alpha class="size-10 rounded-lg"></div>
<div urcColorSwatch [value]="color()" class="size-10 rounded-lg"></div>
```

### Tile size

`checkerSize` is a `numberAttribute` input, so the static form works too. It is the transparency grid's tile size in pixels, and writes `--urcolor-checkerboard-size`. Left unset, that property is free for a stylesheet to own and falls back to `16px`.

```html
<div urcColorSwatch [value]="color()" alpha checkerSize="8" class="size-10 rounded-lg"></div>
```

### Toggle

Binding `[(pressed)]` turns the swatch into a self-contained toggle. Put it on a native `<button>` and it needs no added role.

```html
<button
  urcColorSwatch
  [value]="'hsl(210, 80%, 50%)'"
  [(pressed)]="selected"
  class="size-10 rounded-lg data-[pressed]:ring-2 data-[pressed]:ring-black"
></button>
```

`toggle` forces the behaviour on or off when you do not want it inferred from the binding:

```html
<div urcColorSwatch [value]="color()" [toggle]="true" (pressedChange)="onPressed($event)"></div>
```

### Disabled

`disabled` is the **native attribute**, not an input — set it on the element and the swatch picks it up. It refuses both the click and the Enter/Space activation, and drops the tab stop.

```html
<button urcColorSwatch [value]="color()" [(pressed)]="selected" disabled></button>
```

### Template reference

The directive sets `exportAs`, so its state is readable from the template.

```html
<button urcColorSwatch #swatch="urcColorSwatch" [value]="color()" [(pressed)]="selected"></button>

<p>{{ swatch.isPressed() ? "Selected" : "Not selected" }}</p>
<button type="button" (click)="swatch.togglePressed()">Toggle from outside</button>
```

### Content

Anything you put inside the host element renders over the color, which is how a selection checkmark is usually layered on.

```html
<button urcColorSwatch [value]="color()" [(pressed)]="selected" class="flex size-10 items-center justify-center rounded-lg">
  @if (selected()) {
    <svg viewBox="0 0 24 24" class="size-5 stroke-white" fill="none" stroke-width="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  }
</button>
```

## API Reference

`COLOR_SWATCH_DIRECTIVES` is the array holding the single directive below, so the same one-line `imports` entry keeps working if the family ever grows.

### ColorSwatch

A single color sample. Standalone it is a static `role="img"` element; as a toggle it is a self-contained pressed/unpressed button.

- Selector: `[urcColorSwatch]`
- Export as: `urcColorSwatch`
- Implements: `OnInit`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `input<Color \| string \| null \| undefined>` | — | The color to display. Accepts a `Color` or any CSS color string. |
| `checkerSize` | `input<number>` | `16` | The transparency grid's tile size, in pixels. Coerced with `numberAttribute`. |
| `alpha` | `input<boolean>` | `false` | When true, reflects the color's alpha; otherwise it paints fully opaque. Coerced with `booleanAttribute`. |
| `toggle` | `input<boolean \| undefined>` | Inferred | Forces toggle behaviour on or off. Left unset, the swatch becomes a toggle once `[(pressed)]` is bound. |
| `pressed` | `model<boolean \| undefined>` | `undefined` | Whether the swatch is selected, two-way bindable as `[(pressed)]`. Emits `(pressedChange)`. |

::: warning `disabled` is not an input
`disabled` is the native DOM attribute. The static attribute is read at construction — which works under SSR — and a `MutationObserver` keeps it live afterwards. The readable signal is named **`isDisabled`**, not `disabled`, matching the family roots, where `FormUiControl` reserves the member name `disabled` for its own `InputSignal<boolean>`.
:::

::: tip Toggle inference is resolved once
The `toggle`-less inference runs in `ngOnInit`, after the first binding pass, and is never re-read. `pressed` becomes defined the moment the swatch is toggled, so reading it reactively would flip a static swatch into a button mid-life.
:::

Readable signals, for `exportAs` template references and for `inject(ColorSwatch)`:

| Member | Type | Description |
|--------|------|-------------|
| `isDisabled` | `Signal<boolean>` | Whether interaction is refused. |
| `interactive` | `Signal<boolean>` | Whether the swatch behaves as a toggle rather than a static sample. |
| `isPressed` | `Signal<boolean>` | The pressed state, `false` while `pressed` is unbound. |
| `togglePressed()` | `(): void` | Flips the pressed state, honouring `isDisabled` and non-toggle swatches. |

::: tip Your static attributes win
`role`, `type` and `tabindex` set statically on the host are read at construction and override the generated values, so you can always take the element back.
:::

### Data Attributes

| Attribute | Present when |
|-----------|--------------|
| `data-pressed` | The swatch is interactive **and** selected. A static swatch never carries it. |
| `data-disabled` | The native `disabled` attribute is set, whether the swatch is interactive or not. |

### CSS Variables

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

## Accessibility

A static swatch is a purely visual element with `role="img"` — not focusable, no keyboard behaviour. A toggle swatch carries `aria-pressed` and a tab stop, so it is announced and operated as a toggle. Inside a `ColorSwatchGroup` the group owns roving focus: it listens for `keydown` and `focusin` bubbling from its items, so the swatch needs no coupling to it and stays usable on its own.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="img"` | Applied to a static swatch. |
| `role="button"` | Applied to an interactive swatch **only when the host is not a native `<button>`**, so the group's roving focus can still find it. |
| `type="button"` | Applied to an interactive swatch on a native `<button>`, so it never submits an enclosing form. |
| `aria-pressed` | The selection state, on interactive swatches only. |
| `aria-disabled` | Applied whenever the native `disabled` attribute is set, on static and interactive swatches alike. |
| `tabindex` | `0` on an interactive swatch, and dropped entirely when it is disabled. Static swatches get none. |
| `aria-label` | **Not generated.** Both `role="img"` and a button need an accessible name, so set your own `aria-label`, or render text inside the element. |

::: warning Provide an accessible name
The Angular swatch does not derive a label from the color. Set `aria-label` — for example `aria-label="Blue"` or the CSS color string — or the element has no accessible name.
:::

### Keyboard Navigation

Only an interactive swatch takes keyboard input. Arrow-key movement between swatches belongs to `ColorSwatchGroupRoot`, which handles the keys as they bubble up from its items.

| Key | Action |
|-----|--------|
| Tab | Move focus to the swatch, unless it is static or disabled |
| Enter | Toggle the pressed state |
| Space | Toggle the pressed state |

Enter and Space call `preventDefault`, which suppresses the click a native button would otherwise synthesise — without it every keyboard activation would toggle twice.
