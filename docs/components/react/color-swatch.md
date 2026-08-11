# ColorSwatch

A color preview element that displays a color with a checkerboard background for visualizing alpha transparency.

## Preview

<script setup>
import ReactMount from '../ReactMount.vue'
import ColorSwatchBasic from './demo/ColorSwatchBasic.tsx'
</script>

<ReactMount :component="ColorSwatchBasic" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSwatchBasic.tsx

</details>

## Anatomy

`ColorSwatch` is the whole family, a single component with no sub-parts, imported directly from `@urcolor/react`. There is no `ColorSwatch.*` namespace and no `ColorSwatch.Root`.

```tsx
import { ColorSwatch } from "@urcolor/react";

<ColorSwatch value="hsl(210, 80%, 50%)" />
```

## Examples

### Basic

A set of color swatches, including one with alpha transparency.

<ReactMount :component="ColorSwatchBasic" />

<details>
<summary>Source code</summary>

<<< @/components/react/demo/ColorSwatchBasic.tsx

</details>

## API Reference

### ColorSwatch

Renders a color preview with an automatic checkerboard background. Standalone it renders a `<div role="img">`; inside a [`ColorSwatchGroup`](./color-swatch-group.md) it renders a toggle `<button>` instead, and its `value` doubles as the group's selection key.

Extends `Omit<ComponentPropsWithoutRef<"div">, "value">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value to display. Inside a `ColorSwatchGroup` it is also the toggle selection key. |
| `checkerSize` | `number` | `16` | The checkerboard tile size in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel. When false, displays the color as fully opaque. |
| `disabled` | `boolean` | `false` | Prevents interaction with this swatch. Only meaningful inside a group; a standalone swatch is not interactive. |
| `as` | `React.ElementType` | `'div'` | The element or component to render as. Ignored inside a group, where a `<button>` is always rendered. |
| `className` | `string` | — | Class applied to the rendered element. |
| `style` | `React.CSSProperties` | — | Inline styles merged over the generated `background` and custom properties. |
| `children` | `React.ReactNode` | — | Rendered inside the swatch, e.g. a selection checkmark. |

::: tip
A swatch inside a group is disabled when either its own `disabled` prop or the group's `disabled` prop is set.
:::

### Data Attributes

These are emitted only when the swatch sits inside a `ColorSwatchGroup`. A standalone swatch carries neither.

| Attribute | Present when |
|-----------|--------------|
| `data-state` | Always, as `"on"` when the swatch is selected and `"off"` when it is not. |
| `data-disabled` | The swatch or its group is disabled. |

### CSS Variables

The component exposes CSS custom properties on the rendered element for advanced styling:

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

A standalone `ColorSwatch` is a purely visual element: it carries `role="img"` but is not focusable and handles no keyboard input. Inside a `ColorSwatchGroup` the same component becomes a toggle button and joins the group's roving tab stop.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="img"` | Always applied, identifying the swatch as an image for screen readers. |
| `aria-pressed` | Applied inside a group, reflecting the selection state. |
| `aria-label` | **Not generated.** `role="img"` requires an accessible name, so pass your own `aria-label` describing the color. |

::: warning Provide an accessible name
The React swatch does not derive a label from the color. An element with `role="img"` and no accessible name is a WCAG failure, so supply `aria-label`, for example `aria-label="Blue"` or the CSS color string.
:::

### Keyboard Navigation

A standalone swatch is not focusable. The keys below apply only inside a `ColorSwatchGroup`.

| Key | Action |
|-----|--------|
| Tab | Move focus into the group, landing on the item that owns the tab stop |
| Arrow Right / Arrow Left | Move between swatches in a horizontal group |
| Arrow Down / Arrow Up | Move between swatches in a vertical group |
| Home / End | Move to the first / last swatch |
| Enter or Space | Toggle the focused swatch's selection |
