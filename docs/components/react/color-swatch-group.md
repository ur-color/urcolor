# ColorSwatchGroup

A group of color swatches with toggle-group selection behavior. Supports single and multiple selection modes with arrow-key navigation.

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

::: info Different names, same family
React, Svelte and Angular all call this `ColorSwatchGroup`. Vue ships the same
idea as `ColorSwatchPicker`, built on a listbox, with dedicated
`ColorSwatchPickerItem`, `ColorSwatchPickerItemSwatch` and
`ColorSwatchPickerItemIndicator` parts and a `v-model` that is a single string
until you set `multiple`. Here `value` is always a `string[]`, in both selection
modes, and the ordinary `ColorSwatch` is the item.
:::

Selection is keyed by the **serialized color string**, never by `Color`
identity — `value` is a `string[]`, and it is the `value` you pass to each
`ColorSwatch` that matches against it.

## Anatomy

```tsx
<ColorSwatchGroup.Root>
  <ColorSwatch />
  <ColorSwatch />
  <ColorSwatch />
</ColorSwatchGroup.Root>
```

There is no `Item`, `ItemSwatch` or `Indicator` part — the swatch *is* the item.
`ColorSwatch` reads the group off React context and switches itself from a static
`role="img"` element into a selectable toggle button.

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

### Selected indicator

There is no indicator part. Render your own marker as the swatch's children
against the selection state — that is what both demos above do.

```tsx
<ColorSwatch value={color} className="grid place-items-center">
  {selected.includes(color) && <CheckIcon className="size-5 text-white" />}
</ColorSwatch>
```

## API Reference

`ColorSwatchGroup.Root` is also exported unnamespaced as `ColorSwatchGroupRoot`,
and is the only member of the `ColorSwatchGroup.*` namespace. Items are ordinary
`ColorSwatch` components, imported from the same package. The group's context is
readable with `useColorSwatchGroupContext()`, which throws when called outside a
root.

### ColorSwatchGroup.Root

The root container. Owns the selection state and the arrow-key navigation for
every swatch inside it. Renders a `<div>` with `role="group"`.

Extends `Omit<ComponentPropsWithoutRef<"div">, "defaultValue">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | `'single'` | Whether to allow single or multiple selection. |
| `value` | `string[]` | — | The controlled selection. |
| `defaultValue` | `string[]` | `[]` | The selection when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables every item in the group. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Reflected as `data-orientation`. See the note below. |
| `loopFocus` | `boolean` | `true` | Whether arrow navigation wraps back to the first item past the last one. |
| `onValueChange` | `(value: string[]) => void` | — | Called when the selection changes, with the whole selection array. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the rendered element. |
| `children` | `React.ReactNode` | — | The group's swatches. |

::: warning `orientation` does not restrict the arrow keys
The prop reaches the underlying Base UI `ToggleGroup`, which uses it for the
group's state and its `data-orientation` attribute — but it does not forward it
to the composite that owns keyboard navigation. That composite therefore runs at
its `'both'` default, so all four arrow keys move focus in either orientation.
Use `orientation` to describe and style the group, not to switch which arrows
work.
:::

### ColorSwatch

The group's item, exported from `@urcolor/react` in its own right. Inside a
`ColorSwatchGroup.Root` it detects the group from context and renders a Base UI
`Toggle` as a `<button>`; standalone it renders a static element. These are the
props that matter inside a group; see the ColorSwatch page for the full API.

Extends `Omit<ComponentPropsWithoutRef<"div">, "value">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| Color \| null` | — | The color to paint. Inside a group it is also the selection key, so pass the same string you put in the group's `value` array. |
| `disabled` | `boolean` | `false` | Disables this item. Only meaningful inside a group; a standalone swatch drops it. |
| `checkerSize` | `number` | `16` | The transparency grid's tile size, in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel; otherwise it paints fully opaque. |
| `as` | `React.ElementType` | `'div'` | The element to render as. **Ignored inside a group**, where the swatch is always a `<button>`. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the swatch's own `background` and custom properties. |

There is no `Checkerboard` part in this family — the swatch paints the
transparency grid itself, under the color.

### CSS Variables

The swatch writes these onto its own `style`, so they are readable from its
children and from CSS.

| Variable | Description |
|----------|-------------|
| `--swatch-color` | The painted color, honouring `alpha`. `transparent` when there is no color. |
| `--swatch-color-opaque` | The same color forced to alpha 1. Absent when there is no color. |
| `--swatch-alpha` | The color's alpha channel. Absent when there is no color. |
| `--swatch-checkerboard` | The transparency grid, sized by `checkerSize`. |

### Data Attributes

| Attribute | Part | Values |
|-----------|------|--------|
| `data-orientation` | Root | `'horizontal' \| 'vertical'` |
| `data-multiple` | Root | Present when `type="multiple"` |
| `data-disabled` | Root, ColorSwatch | Present when disabled |
| `data-state` | ColorSwatch | `'on' \| 'off'` — whether the item is selected |
| `data-pressed` | ColorSwatch | Present when the item is selected (Base UI's own attribute, alongside `data-state`) |

## Accessibility

The root is a plain `role="group"`, not a listbox, and the swatches inside it are
toggle buttons. Keyboard navigation is owned by the group's composite, which sees
the events from the focused swatch.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="group"` | Applied to the root. |
| `role="img"` | Applied to every swatch, grouped or not. |
| `aria-pressed` | Applied to a grouped swatch, reflecting its selection state. |
| `aria-label` | **Not generated.** Pass your own on each swatch — a colored button has no text content to name it. |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus into and out of the group (one tab stop, held by the highlighted item) |
| Arrow Left / Arrow Right | Move focus between items |
| Arrow Up / Arrow Down | Move focus between items |
| Space / Enter | Toggle the focused item |

Arrow navigation wraps at the ends while `loopFocus` is true, and clamps when it
is false. `Home` and `End` do **not** move focus: the group does not enable them
on its underlying composite. There is no typeahead and no `Ctrl/Cmd + A` — those
belong to Vue's listbox-based picker.
