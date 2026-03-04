# Build Color Swatches

Let's build color swatches for displaying and selecting colors step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorSwatchGuide from './demo/ColorSwatchGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorSwatchGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorSwatchGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color model and defining your colors.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MySwatch() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

## Step 2: Render a swatch

`ColorSwatchRoot` renders a single color as a filled element. Pass the color via `value`.

```tsx
import { useColor, ColorSwatchRoot } from "@urcolor/react"; // [!code ++]

function MySwatch() {
  const { color } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:4]
    <ColorSwatchRoot
      value={color}
      className="size-10 rounded-lg"
    />
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Alpha transparency

Set the `alpha` prop to show a checkerboard pattern behind semi-transparent colors:

```tsx{4}
<ColorSwatchRoot
  value={color}
  alpha
  className="size-10 rounded-lg"
/>
```

## Checkerboard size

Customize the checkerboard pattern size with `checkerSize` (in pixels):

```tsx{5}
<ColorSwatchRoot
  value={color}
  alpha
  checkerSize={8}
  className="size-10 rounded-lg"
/>
```

## Multiple swatches

Render a palette by looping over an array of colors:

```tsx
import { useState } from "react";
import { Color } from "internationalized-color";
import { ColorSwatchRoot } from "@urcolor/react";

const colors = [
  Color.parse("hsl(210, 80%, 50%)")!,
  Color.parse("hsl(350, 90%, 60%)")!,
  Color.parse("hsl(120, 60%, 45%)")!,
  Color.parse("hsla(45, 100%, 55%, 0.5)")!,
];

function MyPalette() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex items-center gap-3">
      {colors.map((color, i) => (
        <ColorSwatchRoot
          key={i}
          value={color}
          alpha
          className="size-10 cursor-pointer rounded-lg"
          onClick={() => setSelected(i)}
        />
      ))}
    </div>
  );
}
```

## String colors

You can also pass a plain CSS color string instead of a `Color` object:

```tsx
<ColorSwatchRoot
  value="oklch(0.6 0.15 210)"
  className="size-10 rounded-lg"
/>
```
