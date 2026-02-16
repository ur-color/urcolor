# ColorSwatchGroup

A group of color swatches with toggle-group selection behavior. Supports single and multiple selection modes with full keyboard navigation via roving focus.

## Examples

<script setup>
import ColorSwatchGroupBasic from './demo/ColorSwatchGroupBasic.vue'
import ColorSwatchGroupMultiple from './demo/ColorSwatchGroupMultiple.vue'
</script>

### Single Selection

Click a swatch to select it. Clicking the selected swatch deselects it.

<ColorSwatchGroupBasic />

<<< @/components/vue/demo/ColorSwatchGroupBasic.vue

### Multiple Selection

Toggle any number of swatches independently.

<ColorSwatchGroupMultiple />

<<< @/components/vue/demo/ColorSwatchGroupMultiple.vue

## Usage

```vue
<script setup>
import { ref } from "vue";
import { ColorSwatchGroupRoot, ColorSwatchGroupItem } from "@urcolor/vue";

const selected = ref([]);
</script>

<template>
  <ColorSwatchGroupRoot v-model="selected" type="single">
    <ColorSwatchGroupItem value="hsl(210, 80%, 50%)" />
    <ColorSwatchGroupItem value="hsl(350, 90%, 60%)" />
    <ColorSwatchGroupItem value="hsl(120, 60%, 45%)" />
  </ColorSwatchGroupRoot>
</template>
```

## API Reference

### ColorSwatchGroupRoot

The root container that manages selection state and keyboard navigation.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | `'single'` | Whether to allow single or multiple selection. |
| `modelValue` | `string[]` | `[]` | The selected color value(s) (v-model). |
| `defaultValue` | `string[]` | `[]` | Default selected value(s) when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables all items in the group. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Orientation for arrow key navigation. |
| `loop` | `boolean` | `true` | Whether keyboard navigation loops around. |
| `rovingFocus` | `boolean` | `true` | Whether to use roving focus for keyboard navigation. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string[]` | Emitted when the selection changes. |

### ColorSwatchGroupItem

An individual selectable swatch. Renders a `ColorSwatchRoot` internally.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | **required** | The color value. Serves as both the selection key and the displayed color. |
| `disabled` | `boolean` | `false` | Disables this item. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. |

### Data Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-state` | `'on' \| 'off'` | Whether the item is selected. |
| `data-disabled` | Present when disabled | Whether the item is disabled. |
| `data-orientation` | `'horizontal' \| 'vertical'` | The group orientation (on root). |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Focus the selected item (or first if none selected). |
| Arrow Left / Right | Move focus between items (horizontal). |
| Arrow Up / Down | Move focus between items (vertical). |
| Home / End | Move focus to first / last item. |
| Space / Enter | Toggle the focused item. |
