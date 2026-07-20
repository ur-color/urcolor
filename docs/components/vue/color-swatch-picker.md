# ColorSwatchPicker

A listbox of color swatches for picking one — or several — colors from a palette.

## Preview

<script setup>
import ColorSwatchPickerBasic from './demo/ColorSwatchPickerBasic.vue'
import ColorSwatchPickerMultiple from './demo/ColorSwatchPickerMultiple.vue'
</script>

<ColorSwatchPickerBasic />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSwatchPickerBasic.vue

</details>

## Anatomy

```vue
<template>
  <ColorSwatchPickerRoot>
    <ColorSwatchPickerItem value="…">
      <ColorSwatchPickerItemSwatch />
      <ColorSwatchPickerItemIndicator />
    </ColorSwatchPickerItem>
  </ColorSwatchPickerRoot>
</template>
```

The picker is built on Reka UI's Listbox: the root renders `role="listbox"` and each item renders `role="option"`.

## Examples

### Single Selection

Click a swatch to select it. Clicking the selected swatch deselects it again — that is the default `selection-behavior="toggle"`.

<ColorSwatchPickerBasic />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSwatchPickerBasic.vue

</details>

### Multiple Selection

Set `multiple` to let any number of swatches be selected at once. The model value becomes an array.

<ColorSwatchPickerMultiple />

<details>
<summary>Source code</summary>

<<< @/components/vue/demo/ColorSwatchPickerMultiple.vue

</details>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerItemIndicator,
} from "@urcolor/vue";

const colors = ["hsl(210, 80%, 50%)", "hsl(350, 90%, 60%)", "hsl(120, 60%, 45%)"];
const selected = ref<string>(colors[0]!);
</script>

<template>
  <ColorSwatchPickerRoot v-model="selected" as="div">
    <ColorSwatchPickerItem
      v-for="color in colors"
      :key="color"
      :value="color"
      as="div"
    >
      <ColorSwatchPickerItemSwatch as="div" />
      <ColorSwatchPickerItemIndicator as="span">✓</ColorSwatchPickerItemIndicator>
    </ColorSwatchPickerItem>
  </ColorSwatchPickerRoot>
</template>
```

## API Reference

### ColorSwatchPickerRoot

The listbox container. Owns the selection state and arrow-key navigation.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string \| string[]` | — | The selected color, or colors when `multiple` is set (v-model). |
| `defaultValue` | `string \| string[]` | — | Initially selected color(s) when uncontrolled. |
| `multiple` | `boolean` | `false` | Allow selecting more than one swatch. |
| `disabled` | `boolean` | `false` | Disables every swatch in the picker. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Decides which arrow keys navigate the picker. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction. Left unset so it inherits from `ConfigProvider`. |
| `selectionBehavior` | `'toggle' \| 'replace'` | `'toggle'` | `toggle` lets a second click clear the selection; `replace` always replaces it. |
| `highlightOnHover` | `boolean` | `false` | Hovering a swatch highlights it. |
| `name` | `string` | — | Name submitted with a parent form. |
| `required` | `boolean` | `false` | Marks the field required in a parent form. |
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| string[] \| undefined` | Emitted when the selection changes. |
| `highlight` | `CollectionItem \| undefined` | Emitted when the highlighted (keyboard-focused) item changes. |
| `entryFocus` | `CustomEvent` | Emitted when focus enters the picker. |
| `leave` | `Event` | Emitted when the pointer leaves the picker. |

::: warning No `rovingFocus` or `loop`
Neither prop exists on this component. Highlight movement is handled by the
underlying Listbox and is not configurable through the picker's API; arrow keys
stop at the first and last swatch rather than wrapping.
:::

### ColorSwatchPickerItem

One selectable swatch. Renders `role="option"` and provides its color to its descendants.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | **required** | The color this swatch represents, as a CSS color string. Doubles as the selection key. |
| `disabled` | `boolean` | `false` | Prevents this swatch from being selected. |
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

The item sets `--urcolor-swatch-picker-item-color` and `data-color` to the raw `value`, and its `aria-label` to the parsed, normalized color string (falling back to the raw value when it cannot be parsed).

### ColorSwatchPickerItemSwatch

Renders the item's color, using `ColorSwatchRoot` internally. It reads the color from the enclosing item, so it takes no `modelValue`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |
| `label` | `string` | Auto | Accessible name. Falls back to the resolved color string, then `"transparent"`. |
| `as` | `string` | `'div'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### ColorSwatchPickerItemIndicator

Renders its children only while the enclosing item is selected — use it for a checkmark or similar affordance.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'span'` | The element or component to render as. |
| `asChild` | `boolean` | `false` | Merge props onto the single child instead of rendering an element. |

### Data Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-state` | `'checked' \| 'unchecked'` | Whether the item is selected. |
| `data-highlighted` | Present when highlighted | The item the keyboard is currently on. |
| `data-disabled` | Present when disabled | Whether the item is disabled. |
| `data-orientation` | `'horizontal' \| 'vertical'` | The picker orientation (on the root). |
| `data-color` | The raw `value` | The color the item represents. |

## Accessibility

ColorSwatchPicker uses listbox semantics: a single tab stop, with the highlighted option carrying focus.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="listbox"` | Applied to the root. |
| `role="option"` | Applied to each item. |
| `aria-multiselectable` | Set on the root when `multiple` is enabled. |
| `aria-orientation` | Reflects the `orientation` prop. |
| `aria-selected` | Indicates each item's selection state. |
| `aria-label` | Set on each item to the normalized color string, e.g. `"rgb(26, 133, 230)"`. |

::: warning No typeahead
Listbox typeahead resolves an option's search text from its `textValue` or its
`textContent`. Swatch items carry neither — a swatch is a colored box, not text —
so every search key resolves against an empty string and simply highlights the
first option. Do not rely on typing a color to jump to it.
:::

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus into and out of the picker (one tab stop) |
| Arrow Left / Arrow Right | Move the highlight (horizontal orientation) |
| Arrow Up / Arrow Down | Move the highlight (vertical orientation) |
| Home / Page Up | Highlight the first swatch |
| End / Page Down | Highlight the last swatch |
| Space / Enter | Select the highlighted swatch |
| Ctrl/Cmd + A | Select every swatch — `multiple` only |
