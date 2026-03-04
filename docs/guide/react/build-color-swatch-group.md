# Build a Color Swatch Group

Let's build a keyboard-navigable color swatch group for selecting colors from a palette.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorSwatchGroupGuide from './demo/ColorSwatchGroupGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorSwatchGroupGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorSwatchGroupGuide.tsx

:::

</details>

## Step 1: Set up state

Define your color palette and selection state.

```tsx
import { useState } from "react"; // [!code ++]

function MyGroup() {
  const colors = [ // [!code ++]
    "hsl(210, 80%, 50%)", // [!code ++]
    "hsl(350, 90%, 60%)", // [!code ++]
    "hsl(120, 60%, 45%)", // [!code ++]
    "hsl(45, 100%, 55%)", // [!code ++]
  ]; // [!code ++]

  const [selected, setSelected] = useState<string[]>([colors[0]!]); // [!code ++]
}
```

The selection is always an array of strings — even for single selection mode.

## Step 2: Add the group root

`ColorSwatchGroupRoot` manages selection state and keyboard navigation.

```tsx
import { useState } from "react";
import { ColorSwatchGroupRoot } from "@urcolor/react"; // [!code ++]

function MyGroup() {
  const colors = [
    "hsl(210, 80%, 50%)",
    "hsl(350, 90%, 60%)",
    "hsl(120, 60%, 45%)",
    "hsl(45, 100%, 55%)",
  ];
  const [selected, setSelected] = useState<string[]>([colors[0]!]);

  return (
    // [!code ++:5]
    <ColorSwatchGroupRoot
      value={selected}
      onValueChange={setSelected}
      type="single"
      className="flex items-center gap-2"
    >
      {/* items go here */}
    </ColorSwatchGroupRoot>
  );
}
```

- `type="single"` — only one color can be selected at a time
- `type="multiple"` — multiple colors can be selected

## Step 3: Add swatch items

`ColorSwatchGroupItem` renders each selectable color. The `value` prop is both the selection value and the displayed color.

```tsx
import { useState } from "react";
import {
  ColorSwatchGroupRoot,
  ColorSwatchGroupItem, // [!code ++]
} from "@urcolor/react";

function MyGroup() {
  const colors = [
    "hsl(210, 80%, 50%)",
    "hsl(350, 90%, 60%)",
    "hsl(120, 60%, 45%)",
    "hsl(45, 100%, 55%)",
  ];
  const [selected, setSelected] = useState<string[]>([colors[0]!]);

  return (
    <ColorSwatchGroupRoot
      value={selected}
      onValueChange={setSelected}
      type="single"
      className="flex items-center gap-2"
    >
      {/* [!code ++:10] */}
      {colors.map((color) => (
        <ColorSwatchGroupItem
          key={color}
          value={color}
          className="
            size-10 cursor-pointer rounded-lg
            flex items-center justify-center outline-none
          "
        />
      ))}
    </ColorSwatchGroupRoot>
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Multiple selection

Change `type` to `"multiple"` to allow selecting more than one color:

```tsx{4}
<ColorSwatchGroupRoot
  value={selected}
  onValueChange={setSelected}
  type="multiple"
  className="flex items-center gap-2"
>
  {colors.map((color) => (
    <ColorSwatchGroupItem key={color} value={color} className="..." />
  ))}
</ColorSwatchGroupRoot>
```

## Keyboard navigation

The group supports full keyboard navigation out of the box:

- **Arrow keys** — move focus between swatches
- **Space / Enter** — toggle selection
- **Home / End** — jump to first or last swatch

## Listening to changes

Use `onValueChange` to react to selection changes:

```tsx{3-5,11}
import { ColorSwatchGroupRoot } from "@urcolor/react";

const onSelectionChange = (value: string[]) => {
  console.log("selected:", value);
};

<ColorSwatchGroupRoot
  value={selected}
  onValueChange={onSelectionChange}
  type="single"
>
  {/* ... */}
</ColorSwatchGroupRoot>
```
