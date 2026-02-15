# ColorArea

A 2D slider component for selecting values across two axes, ideal for color picking (e.g., saturation and lightness).

## Example

<script setup>
import ColorAreaDemo from './ColorAreaDemo.vue'
</script>

<ColorAreaDemo />

## Usage

```vue
<script setup>
import { ref } from "vue";
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
} from "@urcolor/vue";

const value = ref([[50, 50]]);
</script>

<template>
  <ColorAreaRoot v-model="value" :min-x="0" :max-x="100" :min-y="0" :max-y="100">
    <ColorAreaTrack>
      <ColorAreaThumb>
        <ColorAreaThumbX />
        <ColorAreaThumbY />
      </ColorAreaThumb>
    </ColorAreaTrack>
  </ColorAreaRoot>
</template>
```

## API Reference

### ColorAreaRoot

The root container that manages slider state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `number[][]` | — | Controlled value (v-model). Each entry is `[x, y]`. |
| `defaultValue` | `number[][]` | `[[0, 0]]` | Initial value when uncontrolled. |
| `minX` | `number` | `0` | Minimum X value. |
| `maxX` | `number` | `100` | Maximum X value. |
| `minY` | `number` | `0` | Minimum Y value. |
| `maxY` | `number` | `100` | Maximum Y value. |
| `stepX` | `number` | `1` | X-axis step interval. |
| `stepY` | `number` | `1` | Y-axis step interval. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. |
| `invertedX` | `boolean` | `false` | Invert X axis. |
| `invertedY` | `boolean` | `false` | Invert Y axis. |
| `thumbAlignment` | `'contain' \| 'overflow'` | `'overflow'` | How thumb is positioned relative to track bounds. |
| `name` | `string` | — | Hidden input name for form submission. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `number[][]` | Emitted when value changes. |
| `valueCommit` | `number[][]` | Emitted when interaction ends. |

### ColorAreaTrack

The track area that contains thumbs and receives pointer events.

### ColorAreaThumb

Wrapper for the thumb indicator. Position is set automatically via CSS custom properties.

### ColorAreaThumbX / ColorAreaThumbY

Individual axis thumb elements. Both are required inside `ColorAreaThumb` for keyboard navigation to work on both axes.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Move by one step |
| Shift + Arrow | Move by 10 steps |
| Home / End | Move to X-axis min/max |
| Page Up / Page Down | Move to Y-axis min/max |
