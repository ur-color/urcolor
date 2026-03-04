# ColorSwatchGroup

A group of color swatches with toggle-group selection behavior. Supports single and multiple selection modes with full keyboard navigation.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorSwatchGroupBasic from './demo/ColorSwatchGroupBasic.tsx'
import ColorSwatchGroupMultiple from './demo/ColorSwatchGroupMultiple.tsx'
</script>

<ReactMount :component="ColorSwatchGroupBasic" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSwatchGroupBasic.tsx

</details>

## Anatomy

```tsx
<ColorSwatchGroupRoot>
  <ColorSwatchGroupItem />
  <ColorSwatchGroupItem />
  <ColorSwatchGroupItem />
</ColorSwatchGroupRoot>
```

## Examples

### Single Selection

Click a swatch to select it. Clicking the selected swatch deselects it.

<ReactMount :component="ColorSwatchGroupBasic" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSwatchGroupBasic.tsx

</details>

### Multiple Selection

Toggle any number of swatches independently.

<ReactMount :component="ColorSwatchGroupMultiple" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSwatchGroupMultiple.tsx

</details>

## API Reference

### ColorSwatchGroupRoot

The root container that manages selection state and keyboard navigation.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | `'single'` | Whether to allow single or multiple selection. |
| `value` | `string[]` | `[]` | The selected color value(s). |
| `defaultValue` | `string[]` | `[]` | Default selected value(s) when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables all items in the group. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Orientation for arrow key navigation. |
| `onValueChange` | `(value: string[]) => void` | — | Called when the selection changes. |

### ColorSwatchGroupItem

An individual selectable swatch.

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

## Accessibility

ColorSwatchGroup uses toggle-group semantics with keyboard navigation across swatch items.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Focus the selected item (or first if none selected). |
| Arrow Left / Right | Move focus between items (horizontal). |
| Arrow Up / Down | Move focus between items (vertical). |
| Home / End | Move focus to first / last item. |
| Space / Enter | Toggle the focused item. |
