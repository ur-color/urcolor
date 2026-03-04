# Build Color Triangle

Let's build a triangular color picker step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorTriangleGuide from './demo/ColorTriangleGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorTriangleGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorTriangleGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color hook and creating color state.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MyTriangle() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

## Step 2: Add the root

`ColorTriangleRoot` manages all the state and interactions. Tell it which color space and channels to map to the triangle axes.

```tsx
import { useColor, ColorTriangleRoot } from "@urcolor/react"; // [!code ++]

function MyTriangle() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:8]
    <ColorTriangleRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsv"
      channelX="s"
      channelY="v"
    >
      {/* children go here */}
    </ColorTriangleRoot>
  );
}
```

- `colorSpace` — the color space to work in (`hsv`, `hsl`, `rgb`, etc.)
- `channelX` — the channel mapped to the horizontal axis
- `channelY` — the channel mapped to the vertical axis

## Step 3: Add the gradient

`ColorTriangleGradient` renders the 2D gradient inside the triangular shape.

```tsx
import {
  useColor,
  ColorTriangleRoot,
  ColorTriangleGradient, // [!code ++]
} from "@urcolor/react";

function MyTriangle() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorTriangleRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsv"
      channelX="s"
      channelY="v"
      className="relative block size-64"
    >
      <ColorTriangleGradient className="absolute inset-0 block" /> {/* [!code ++] */}
    </ColorTriangleRoot>
  );
}
```

## Step 4: Add the thumb

`ColorTriangleThumb` is the draggable handle. It's positioned automatically within the triangle.

```tsx
import {
  useColor,
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb, // [!code ++]
} from "@urcolor/react";

function MyTriangle() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorTriangleRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsv"
      channelX="s"
      channelY="v"
      className="relative block size-64"
    >
      <ColorTriangleGradient className="absolute inset-0 block" />
      {/* [!code ++:8] */}
      <ColorTriangleThumb
        className="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      />
    </ColorTriangleRoot>
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Rotation

Use the `rotation` prop to rotate the triangle (in degrees):

```tsx{5}
<ColorTriangleRoot
  value={color}
  onValueChange={setColor}
  colorSpace="hsv"
  rotation={180}
  channelX="s"
  channelY="v"
>
  {/* ... */}
</ColorTriangleRoot>
```

## Three-channel mode

Add `channelZ` to enable barycentric three-channel mode. This maps all three channels to the triangle's vertices — useful for RGB color mixing:

```tsx{4-6}
<ColorTriangleRoot
  value={color}
  onValueChange={setColor}
  colorSpace="rgb"
  channelX="r"
  channelY="g"
  channelZ="b"
>
  {/* ... */}
</ColorTriangleRoot>
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

<ColorTriangleRoot
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsv"
  channelX="s"
  channelY="v"
>
  {/* ... */}
</ColorTriangleRoot>
```
