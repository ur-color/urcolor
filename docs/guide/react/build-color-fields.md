# Build Color Fields

Let's build numeric input fields for editing individual color channels step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorFieldGuide from './demo/ColorFieldGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorFieldGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorFieldGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color hook and creating color state.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

## Step 2: Add the root

`ColorField.Root` manages the state for a single channel input. Tell it which color space and channel to control.

```tsx
import { useColor, ColorField } from "@urcolor/react"; // [!code ++]

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:6]
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
    >
      {/* children go here */}
    </ColorField.Root>
  );
}
```

## Step 3: Add the input

`ColorField.Input` renders the numeric input. It automatically formats the value based on the channel.

```tsx
import { useColor, ColorField } from "@urcolor/react";

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      className="
        flex items-center overflow-hidden rounded-md border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
      "
    >
      {/* [!code ++:5] */}
      <ColorField.Input
        className="
          w-full border-none bg-transparent px-2 py-1
          text-center font-mono text-sm outline-none
        "
      />
    </ColorField.Root>
  );
}
```

## Step 4: Add increment and decrement buttons

`ColorField.Increment` and `ColorField.Decrement` provide stepper buttons.

```tsx
import { useColor, ColorField } from "@urcolor/react";

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      className="
        flex items-center overflow-hidden rounded-md border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
      "
    >
      {/* [!code ++:2] */}
      <ColorField.Decrement className="flex size-8 items-center justify-center">
        &minus;
      </ColorField.Decrement>
      <ColorField.Input
        className="
          w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
          text-center font-mono text-[13px] outline-none
        "
      />
      {/* [!code ++:2] */}
      <ColorField.Increment className="flex size-8 items-center justify-center">
        +
      </ColorField.Increment>
    </ColorField.Root>
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Multiple channels

Loop over the channels in a color space using the `colorSpaces` helper from `@urcolor/core`:

```tsx{3,4,9,16-21}
import { colorSpaces } from "@urcolor/core";
import { useColor, ColorField } from "@urcolor/react";

function MyFields() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");
  const channels = colorSpaces["hsl"]?.channels ?? [];

  return (
    <div className="flex gap-2">
      {channels.map((ch) => (
        <div key={ch.key} className="flex flex-col gap-1">
          <label className="text-xs font-semibold">{ch.label}</label>
          <ColorField.Root value={color} onValueChange={setColor} colorSpace="hsl" channel={ch.key}>
            <ColorField.Decrement>&minus;</ColorField.Decrement>
            <ColorField.Input />
            <ColorField.Increment>+</ColorField.Increment>
          </ColorField.Root>
        </div>
      ))}
    </div>
  );
}
```

Each `ColorField.Root` shares the same state — updating one channel automatically keeps the others in sync.

## Hex format

Set `channel` to `"hex"` and `format` to `"hex"` for a hex color input:

```tsx{5-6}
<ColorField.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channel="hex"
  format="hex"
>
  <ColorField.Input />
</ColorField.Root>
```

## Listening to changes

Use `onValueChange` for real-time updates and `onValueCommit` for the final value (on blur or Enter):

```tsx{3-8,15-16}
import { Color } from "internationalized-color";

const onColorChange = (color: Color) => {
  console.log("changing", color.toString("css"));
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString("css"));
};

<ColorField.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channel="h"
>
  {/* ... */}
</ColorField.Root>
```
