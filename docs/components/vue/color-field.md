# ColorField

A numeric input component for editing a single color channel, with optional stepper buttons and a color swatch preview.

## Preview

<script setup>
import ColorFieldHex from './demo/ColorFieldHex.vue'
import ColorFieldHSL from './demo/ColorFieldHSL.vue'
</script>

<ColorFieldHSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorFieldHSL.vue

</details>

## Anatomy

```vue
<template>
  <ColorFieldRoot>
    <ColorFieldSwatch />
    <ColorFieldDecrement />
    <ColorFieldInput />
    <ColorFieldIncrement />
  </ColorFieldRoot>
</template>
```

`ColorFieldSwatch` takes its own `modelValue` and reads nothing from the root's context, so it can sit anywhere in the tree, inside the root, or beside it.

## Examples

### Hex Input

`format="hex"` switches the field from editing one channel to editing the whole color as a `#rrggbb` string. In that mode `channel` is not read at all.

<ColorFieldHex />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorFieldHex.vue

</details>

### HSL Channel Fields

HSL channel inputs with stepper buttons. One root per channel, all bound to the same color.

<ColorFieldHSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorFieldHSL.vue

</details>

### Alpha Channel

`channel="alpha"` edits opacity. It is not a channel of any color space: the root special-cases it and presents it as a `0–100` percentage.

```vue
<template>
  <ColorFieldRoot v-model="color" color-space="hsl" channel="alpha">
    <ColorFieldSwatch :model-value="color" alpha />
    <ColorFieldDecrement>&minus;</ColorFieldDecrement>
    <ColorFieldInput />
    <ColorFieldIncrement>+</ColorFieldIncrement>
  </ColorFieldRoot>
</template>
```

### Bounds and Step

`min`, `max` and `step` all default to the resolved channel's own configuration. Setting them narrows the range the field will accept and changes how far one arrow press moves.

```vue
<template>
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="l"
    :min="20"
    :max="80"
    :step="5"
  >
    <ColorFieldInput />
  </ColorFieldRoot>
</template>
```

## API Reference

### ColorFieldRoot

The root container. Owns the color, the field's own numeric and text state, and every operation the other parts invoke through context. Renders a `<div role="group">`, and a visually hidden `<input type="hidden">` alongside it when the root is inside a `<form>` and `name` is set.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (`v-model`). |
| `defaultValue` | `Color \| string` | `'hsl(0, 100%, 50%)'` | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | The color space the field operates in (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | The channel this field controls, or `'alpha'`. Not read when `format` is `'hex'`. |
| `format` | `'number' \| 'degree' \| 'percentage' \| 'hex'` | Auto | Derived from the channel config when omitted; `'hex'` is never derived and switches the field to editing the whole color. |
| `min` | `number` | Auto | Minimum value, in display units. Falls back to the channel config, then `0`. |
| `max` | `number` | Auto | Maximum value, in display units. Falls back to the channel config, then `0xffffff` in hex mode and `100` otherwise. |
| `step` | `number` | Auto | Step for arrow keys, the wheel and the steppers. Falls back to the channel config, then `1`. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `readonly` | `boolean` | `false` | Shows the value but refuses edits. |
| `placeholder` | `string` | — | Placeholder text shown on the input when it has no value. |
| `disableWheelChange` | `boolean` | `false` | Disables stepping the value with the mouse wheel. |
| `locale` | `string` | — | Currently ignored, accepted but not read anywhere in the parse/format path. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks the hidden input as required for form submission. |
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted whenever the color changes, including mid-typing. |
| `update:color` | `Color` | Mirrors `update:modelValue`; present for API parity. |
| `change` | `Color` | Emitted on every value change, including mid-typing. |
| `changeEnd` | `Color` | Emitted when the value settles: blur, Enter, arrow keys, wheel, or a stepper press. |

::: warning
Neither `color-space` nor `channel` accepts `'hex'` as a color space: `SpaceId` has no such member. Hex editing is `format="hex"`.
:::

::: tip
Vue is the only package whose field steps on the mouse wheel, and the only one that emits `aria-valuemin` / `aria-valuemax` / `aria-valuetext` on the input.
:::

### ColorFieldInput

The editable text surface. Renders an `<input type="text" role="spinbutton">` and owns the keyboard map, the wheel handler, the blur/Enter commit, and the select-on-focus behaviour.

It is a `spinbutton` rather than `type="number"` because the field renders suffixed text, `210°`, `50%`, `#ff8800`, that a numeric input would reject. Outside hex mode a `beforeinput` guard rejects any keystroke that would leave the text unparseable as a number.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'input'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

The part sets `value`, `placeholder`, `disabled`, `readonly`, `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"` and `inputmode` (`'text'` in hex mode, `'numeric'` otherwise) from the root. Its `aria-label` falls back to the resolved channel's label, `"Hue"`, `"Saturation"`, `"Alpha"`, so pass your own only to override.

### ColorFieldIncrement

Steps the value up by `step`. Renders a `<button>` with `tabindex="-1"`. The input owns the field's tab stop, so the steppers are pointer affordances only.

Holding the button repeats: one step immediately, a `400`ms pause, then a step every `60`ms. The release listeners live on `window`, so a pointer that leaves the button before lifting still ends the hold.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the button on top of the automatic disabling. |
| `as` | `string` | `'button'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

The button also disables itself when the root is disabled or read-only, or when the value already sits at `max`. Its `aria-label` is `"Increase"`.

### ColorFieldDecrement

Steps the value down by `step`. Identical to `ColorFieldIncrement` in every respect except direction: it disables at `min` and its `aria-label` is `"Decrease"`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the button on top of the automatic disabling. |
| `as` | `string` | `'button'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorFieldSwatch

A read-only preview of a color. Delegates to `ColorSwatchRoot` with `as="span"`, rendering `role="img"` with `aria-roledescription="color swatch"` and the color painted as a flat `linear-gradient` layered over a checkerboard, so a translucent value shows the checks through it.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | The color to display. Independent of the root's value. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha; when false, paints the color opaque. |
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

`ColorFieldSwatch` re-declares only the five props above. Any other `ColorSwatchRoot` prop, `label`, which sets the accessible name and otherwise falls back to the resolved color string, then `"transparent"`, reaches `ColorSwatchRoot` as a fallthrough attribute rather than a declared prop.

The default slot is forwarded to `ColorSwatchRoot`, which exposes `{ color, alpha }` as slot props. The swatch publishes `--urcolor-swatch-color`, `--urcolor-swatch-color-opaque`, `--urcolor-swatch-alpha` and `--urcolor-swatch-checkerboard` as custom properties for callers styling their own overlays.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Input | The root is disabled. |
| `data-readonly` | Root, Input | The root is read-only. |
| `data-disabled` | Increment, Decrement | The root is disabled or read-only, the button's own `disabled` is set, or the value already sits at that button's bound. |
| `data-pressed` | Increment, Decrement | The button is held down. |
| `data-no-color` | Swatch | The swatch has no color, or its color is fully transparent. |

## Accessibility

ColorField exposes the input as the single tab stop. The steppers carry `tabindex="-1"` on purpose: everything they do is reachable from the keyboard through the input's own arrow-key map, so they add no keyboard surface a screen reader user has to walk past.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="group"` | Applied to `ColorFieldRoot`. |
| `role="spinbutton"` | Applied to `ColorFieldInput`. |
| `aria-label` | On the input, the resolved channel's label, `"Hue"`, `"Saturation"`, `"Alpha"`. `"Increase"` / `"Decrease"` on the steppers. |
| `aria-valuemin` / `aria-valuemax` | The field's effective range, in display units. |
| `aria-valuenow` | The current value in display units. Absent while the field is empty. |
| `aria-valuetext` | The formatted text the input shows, e.g. `"210°"`. |
| `role="img"` | Applied to `ColorFieldSwatch`, with `aria-roledescription="color swatch"`. |

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

Every one of those keys commits, so `changeEnd` fires per press. Blurring the input commits too. Typing emits `change` on each keystroke that parses, and the text you typed is only clamped, snapped and reformatted at commit time.

The mouse wheel also steps the value while the input is focused. Set `disable-wheel-change` on `ColorFieldRoot` to turn that off.
