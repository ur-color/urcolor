# ColorField

A numeric input component for editing a single color channel, with optional stepper buttons and a color swatch preview.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorFieldHex from './demo/ColorFieldHex.tsx'
import ColorFieldHSL from './demo/ColorFieldHSL.tsx'
</script>

<ReactMount :component="ColorFieldHSL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorFieldHSL.tsx

</details>

## Anatomy

```tsx
<ColorField.Root>
  <ColorField.Swatch />
  <ColorField.Decrement />
  <ColorField.Input />
  <ColorField.Increment />
</ColorField.Root>
```

`ColorField.Swatch` takes its own `value` and reads nothing from the root's context, so it can sit anywhere in the tree, inside the root, or beside it.

## Examples

### Hex Input

`format="hex"` switches the field from editing one channel to editing the whole color as a `#rrggbb` string. In that mode `channel` is not read at all.

<ReactMount :component="ColorFieldHex" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorFieldHex.tsx

</details>

### HSL Channel Fields

HSL channel inputs with stepper buttons. One root per channel, all fed the same color.

<ReactMount :component="ColorFieldHSL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorFieldHSL.tsx

</details>

### Alpha Channel

`channel="alpha"` edits opacity. It is not a channel of any color space: the root special-cases it and presents it as a `0–100` percentage.

```tsx
<ColorField.Root value={color} onValueChange={setColor} channel="alpha">
  <ColorField.Swatch value={color} alpha />
  <ColorField.Decrement>&minus;</ColorField.Decrement>
  <ColorField.Input aria-label="Alpha" />
  <ColorField.Increment>+</ColorField.Increment>
</ColorField.Root>
```

### Bounds and Step

`min`, `max` and `step` all default to the resolved channel's own configuration. Setting them narrows the range the field will accept and changes how far one arrow press moves.

```tsx
<ColorField.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channel="l"
  min={20}
  max={80}
  step={5}
>
  <ColorField.Input aria-label="Lightness" />
</ColorField.Root>
```

## API Reference

Every part is also exported unnamespaced, `ColorFieldRoot`, `ColorFieldInput`, `ColorFieldIncrement`, `ColorFieldDecrement`, `ColorFieldSwatch`, alongside the `ColorField.*` namespace. The root's context is readable with `useColorFieldContext()`.

### ColorField.Root

The root container. Owns the color, the field's own numeric and text state, and every operation the other parts invoke through context. Renders a `<div>` by default.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string \| null` | — | Initial color when uncontrolled. |
| `colorSpace` | `SpaceId` | `'hsl'` | The color space the field operates in (e.g. `'hsl'`, `'oklch'`). |
| `channel` | `string` | `'h'` | The channel this field controls, or `'alpha'`. Not read when `format` is `'hex'`. |
| `format` | `'number' \| 'degree' \| 'percentage' \| 'hex'` | Auto | Derived from the channel config when omitted; `'hex'` is never derived and switches the field to editing the whole color. |
| `min` | `number` | Auto | Minimum value, in display units. Falls back to the channel config, then `0`. |
| `max` | `number` | Auto | Maximum value, in display units. Falls back to the channel config, then `0xffffff` in hex mode and `100` otherwise. |
| `step` | `number` | Auto | Step for arrow keys and the steppers. Falls back to the channel config, then `1`. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `readOnly` | `boolean` | `false` | Shows the value but refuses edits. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-typing. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction: blur, Enter, an arrow key, or a stepper press. |
| `as` | `React.ElementType` | `'div'` | The element or component to render as. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the rendered element. |
| `children` | `React.ReactNode` | — | The field's parts. |

::: warning
Neither `colorSpace` nor `channel` accepts `'hex'` as a color space: `SpaceId` has no such member. Hex editing is `format="hex"`.
:::

With neither `value` nor `defaultValue`, the root holds no color: the input renders empty, and edits have nothing to rebuild from, so nothing is emitted. Give it at least a `defaultValue`.

### ColorField.Input

The editable text surface. Renders an `<input type="text" role="spinbutton">` and owns the keyboard map, the blur/Enter commit, and the select-on-focus behaviour.

It is a `spinbutton` rather than `type="number"` because the field renders suffixed text, `210°`, `50%`, `#ff8800`, that a numeric input would reject.

Extends `ComponentPropsWithoutRef<"input">`; it declares no props of its own.

The part sets `value`, `disabled`, `readOnly`, `autoComplete="off"`, `autoCorrect="off"`, `spellCheck={false}` and `inputMode="text"` itself. It does **not** generate an accessible name, so pass your own `aria-label`. Every attribute it sets is written before your props are spread, so anything you pass wins.

### ColorField.Increment

Steps the value up by `step`. Renders a `<button type="button">` with `tabIndex={-1}`. The input owns the field's tab stop, so the steppers are pointer affordances only.

Holding the button repeats: one step immediately, a `400`ms pause, then a step every `60`ms. The release listeners live on `window`, so a pointer that leaves the button before lifting still ends the hold.

Extends `ComponentPropsWithoutRef<"button">`; it declares no props of its own.

The button computes `disabled` as "the root is disabled or read-only, or the value already sits at `max`", and defaults `aria-label` to `"Increase"`. Both are written before your props are spread, so passing your own overrides the rendered attribute, though the internal pointer guard still refuses to step past `max`.

### ColorField.Decrement

Steps the value down by `step`. Identical to `ColorField.Increment` in every respect except direction: it disables at `min` and defaults `aria-label` to `"Decrease"`.

Extends `ComponentPropsWithoutRef<"button">`; it declares no props of its own.

### ColorField.Swatch

A read-only preview of a color. Delegates to `ColorSwatch` with `as="span"`, rendering `role="img"` with the color painted as a flat `linear-gradient` layered over a checkerboard, so a translucent value shows the checks through it.

Extends `ColorSwatchProps`, which is `Omit<ComponentPropsWithoutRef<"div">, "value">` plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color to display. Independent of the root's value. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha; when false, paints the color opaque. |
| `disabled` | `boolean` | `false` | Only meaningful inside a `ColorSwatchGroup`; a field swatch has no interaction of its own. |
| `as` | `React.ElementType` | `'span'` | The element or component to render as. |

The swatch publishes `--urcolor-swatch-color`, `--urcolor-swatch-color-opaque`, `--urcolor-swatch-alpha` and `--urcolor-swatch-checkerboard` as custom properties for callers styling their own overlays. Your own `style` object is merged last, so it wins.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Input | The root is disabled. |
| `data-readonly` | Root, Input | The root is read-only. |
| `data-disabled` | Increment, Decrement | The root is disabled or read-only, or the value already sits at that button's bound. |
| `data-pressed` | Increment, Decrement | The button is held down. |

## Accessibility

ColorField exposes the input as the single tab stop. The steppers carry `tabIndex={-1}` on purpose: everything they do is reachable from the keyboard through the input's own arrow-key map, so they add no keyboard surface a screen reader user has to walk past.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="spinbutton"` | Applied to `ColorField.Input`. |
| `aria-valuenow` | The current value in display units. Absent while the field is empty. |
| `aria-label` | Not generated for the input. Supply your own. Defaults to `"Increase"` / `"Decrease"` on the steppers. |
| `role="img"` | Applied to `ColorField.Swatch`. |
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

Every one of those keys commits, so `onValueCommit` fires per press. Blurring the input commits too. Typing fires `onValueChange` on each keystroke that parses, and the text you typed is only clamped, snapped and reformatted at commit time.
