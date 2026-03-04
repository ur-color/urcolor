# Build Color Wheel

Let's build a 2D color wheel step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorWheelGuide from './demo/ColorWheelGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorWheelGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorWheelGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color hook and creating color state.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

## Step 2: Add the root

`ColorWheel.Root` manages all the state and interactions. Tell it which color space and channels to map to the angle and radius.

```tsx
import { useColor, ColorWheel } from "@urcolor/react"; // [!code ++]

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:8]
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelAngle="h"
      channelRadius="s"
    >
      {/* children go here */}
    </ColorWheel.Root>
  );
}
```

- `colorSpace` — the color space to work in (`hsl`, `oklch`, etc.)
- `channelAngle` — the channel mapped to the angular axis (rotation)
- `channelRadius` — the channel mapped to the radial axis (distance from center)

## Step 3: Add the gradient

`ColorWheel.Gradient` renders the 2D circular gradient on a canvas.

```tsx
import { useColor, ColorWheel } from "@urcolor/react";

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelAngle="h"
      channelRadius="s"
      className="relative block size-64 overflow-hidden rounded-full"
      style={{ containerType: "inline-size" }}
    >
      <ColorWheel.Gradient className="absolute inset-0 block" /> {/* [!code ++] */}
    </ColorWheel.Root>
  );
}
```

The root needs `overflow-hidden rounded-full` to clip the gradient to a circle, and `container-type: inline-size` so the component can calculate dimensions correctly.

## Step 4: Add the thumb

`ColorWheel.Thumb` is the draggable handle. It's positioned automatically within the wheel.

```tsx
import { useColor, ColorWheel } from "@urcolor/react";

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelAngle="h"
      channelRadius="s"
      className="relative block size-64 overflow-hidden rounded-full"
      style={{ containerType: "inline-size" }}
    >
      <ColorWheel.Gradient className="absolute inset-0 block" />
      {/* [!code ++:8] */}
      <ColorWheel.Thumb
        className="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      />
    </ColorWheel.Root>
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Start angle offset

Use `startAngle` to rotate where the wheel gradient begins (in degrees):

```tsx{5}
<ColorWheel.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  startAngle={90}
  channelAngle="h"
  channelRadius="s"
>
  {/* ... */}
</ColorWheel.Root>
```

## Different color spaces

Switch the color space and channel mapping for different wheel behaviors. For example, OKLCh:

```tsx{5,11-13}
const { color, setColor } = useColor("oklch(0.6, 0.15, 210)");

<ColorWheel.Root
  value={color}
  onValueChange={setColor}
  colorSpace="oklch"
  channelAngle="hue"
  channelRadius="chroma"
>
  {/* ... */}
</ColorWheel.Root>
```

## Listening to changes

Use `onValueChange` for real-time updates (while dragging) and `onValueCommit` for the final value (on release):

```tsx{3-8,15-16}
import { Color } from "internationalized-color";

const onColorChange = (color: Color) => {
  console.log("dragging", color.toString("css"));
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString("css"));
};

<ColorWheel.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channelAngle="h"
  channelRadius="s"
>
  {/* ... */}
</ColorWheel.Root>
```
