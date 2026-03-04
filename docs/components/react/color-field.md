# ColorField

A numeric input component for editing individual color channels, with optional increment/decrement buttons and a color swatch preview.

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
<ColorFieldRoot>
  <ColorFieldDecrement />
  <ColorFieldInput />
  <ColorFieldIncrement />
</ColorFieldRoot>

<ColorFieldSwatch />
```

## Examples

### Hex Input

<ReactMount :component="ColorFieldHex" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorFieldHex.tsx

</details>

### HSL Channel Fields

HSL channel inputs with increment/decrement buttons.

<ReactMount :component="ColorFieldHSL" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorFieldHSL.tsx

</details>

## API Reference

### ColorFieldRoot

The root container that manages field state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | Controlled color value. |
| `defaultValue` | `Color \| string \| null` | — | Initial color when uncontrolled. |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`, `'hex'`). |
| `channel` | `string` | `'h'` | Channel to control (e.g. `'h'`, `'s'`, `'l'`, `'hex'`). |
| `format` | `'number' \| 'degree' \| 'percentage' \| 'hex'` | Auto | Display format. Auto-derived from channel config if omitted. |
| `min` | `number` | Auto | Minimum value. Auto-derived from channel config. |
| `max` | `number` | Auto | Maximum value. Auto-derived from channel config. |
| `step` | `number` | Auto | Arrow key step increment. Auto-derived from channel config. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `readOnly` | `boolean` | `false` | Makes the field read-only. |
| `onValueChange` | `(color: Color) => void` | — | Called when color changes. |
| `onValueCommit` | `(color: Color) => void` | — | Called when interaction ends (blur or Enter). |

### ColorFieldInput

The text input element for entering color channel values.

### ColorFieldIncrement

Button to increment the color field value. Auto-disabled at maximum.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the button. |

### ColorFieldDecrement

Button to decrement the color field value. Auto-disabled at minimum.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the button. |

### ColorFieldSwatch

Displays a color preview swatch with automatic checkerboard background.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value to display. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |

## Accessibility

ColorField provides a spinbutton interface for precise numeric color channel editing.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Up | Increase by one step |
| Arrow Down | Decrease by one step |
| Page Up | Increase by 10x step |
| Page Down | Decrease by 10x step |
| Home | Jump to minimum |
| End | Jump to maximum |
| Enter | Commit current value |
