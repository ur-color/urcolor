# ColorField

A numeric input component for editing individual color channels, with optional increment/decrement buttons and a color swatch preview.

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
    <ColorFieldDecrement />
    <ColorFieldInput />
    <ColorFieldIncrement />
  </ColorFieldRoot>

  <ColorFieldSwatch />
</template>
```

## Examples

### Hex Input

<ColorFieldHex />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorFieldHex.vue

</details>

### HSL Channel Fields

HSL channel inputs with increment/decrement buttons.

<ColorFieldHSL />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorFieldHSL.vue

</details>

### Alpha Channel

Set `channel="alpha"` to create an opacity input (0–100%).

```vue
<template>
  <ColorFieldRoot
    :model-value="color"
    color-space="hsl"
    channel="alpha"
    @update:model-value="onColorUpdate"
  >
    <ColorFieldDecrement>&minus;</ColorFieldDecrement>
    <ColorFieldInput />
    <ColorFieldIncrement>+</ColorFieldIncrement>
  </ColorFieldRoot>
</template>
```

## API Reference

### ColorFieldRoot

The root container that manages field state and color channel binding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | Controlled color value (v-model). |
| `colorSpace` | `string` | `'hsl'` | Color space mode (e.g. `'hsl'`, `'oklch'`, `'hex'`). |
| `channel` | `string` | `'h'` | Channel to control (e.g. `'h'`, `'s'`, `'l'`, `'hex'`). |
| `format` | `'number' \| 'degree' \| 'percentage' \| 'hex'` | Auto | Display format. Auto-derived from channel config if omitted. |
| `min` | `number` | Auto | Minimum value. Auto-derived from channel config. |
| `max` | `number` | Auto | Maximum value. Auto-derived from channel config. |
| `step` | `number` | Auto | Arrow key step increment. Auto-derived from channel config. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `readOnly` | `boolean` | `false` | Makes the field read-only. |
| `name` | `string` | — | Hidden input name for form submission. |
| `required` | `boolean` | `false` | Marks as required for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Color \| undefined` | Emitted when color changes. |
| `valueCommit` | `Color` | Emitted when interaction ends (blur or Enter). |

### ColorFieldInput

The text input element for entering color channel values.

### ColorFieldIncrement

Button to increment the color field value. Auto-disabled at maximum. Supports press-and-hold for continuous increment.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the button. |

### ColorFieldDecrement

Button to decrement the color field value. Auto-disabled at minimum. Supports press-and-hold for continuous decrement.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the button. |

### ColorFieldSwatch

Displays a color preview swatch. Wraps `ColorSwatchRoot` with automatic checkerboard background for alpha visualization.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Color \| string \| null` | — | The color value to display. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |

## Accessibility

ColorField provides a spinbutton interface for precise numeric color channel editing with keyboard-driven increment/decrement controls.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="spinbutton"` | Applied to the input element for screen reader recognition. |
| `aria-label` | Labels the input with the channel name. |
| `aria-valuemin` / `aria-valuemax` | Defines the channel's value range. |
| `aria-valuenow` | Current numeric value of the channel. |

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
